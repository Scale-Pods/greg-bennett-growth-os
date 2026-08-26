import { NextRequest, NextResponse } from 'next/server';
import { CALL_LOG_AGENTS } from '@/app/api/calls/route';
import { createClient } from '@supabase/supabase-js';

function normalizePhone(phone: unknown): string {
    return typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
}

async function lookupOutreachSentiment(agentKey: string, phone: string) {
    const cfg = CALL_LOG_AGENTS.find(a => a.key === agentKey);
    if (!cfg?.outreachTable) return null;
    const targetPhone = normalizePhone(phone);
    if (!targetPhone) return null;

    try {
        const url = process.env[`NEXT_PUBLIC_SUPABASE_URL_${cfg.envPrefix}`];
        const serviceKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${cfg.envPrefix}`];
        const anonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${cfg.envPrefix}`];
        if (!url || !(serviceKey || anonKey)) return null;

        const client = createClient(url, (serviceKey || anonKey)!);
        const { data } = await client
            .from(cfg.outreachTable)
            .select('personal_phone, created_at, voice1_sentiment, call1_note, voice2_sentiment, call2_note')
            .not('personal_phone', 'is', null);

        // A phone number can have multiple outreach rows; prefer the one with actual
        // sentiment data, breaking ties by most recently created.
        const candidates = (data || []).filter((row: any) => normalizePhone(row.personal_phone) === targetPhone);
        if (candidates.length === 0) return null;
        candidates.sort((a: any, b: any) => {
            const aHasData = !!(a.voice1_sentiment || a.call1_note || a.voice2_sentiment || a.call2_note);
            const bHasData = !!(b.voice1_sentiment || b.call1_note || b.voice2_sentiment || b.call2_note);
            if (aHasData !== bHasData) return aHasData ? -1 : 1;
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        return candidates[0];
    } catch (e) {
        return null;
    }
}

// Inbound calls have no outreach table (callers aren't pre-existing leads); their sentiment
// is saved directly on vapi_call_logs_inbound (call_sentiment) by the n8n receptionist workflow.
async function lookupInboundCallSentiment(callId: string): Promise<string | null> {
    const cfg = CALL_LOG_AGENTS.find(a => a.key === 'inbound');
    if (!cfg) return null;
    try {
        const url = process.env[`NEXT_PUBLIC_SUPABASE_URL_${cfg.envPrefix}`];
        const serviceKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${cfg.envPrefix}`];
        const anonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${cfg.envPrefix}`];
        if (!url || !(serviceKey || anonKey)) return null;

        const client = createClient(url, (serviceKey || anonKey)!);
        const { data } = await client.from(cfg.table).select('call_sentiment').eq('id', callId).maybeSingle();
        return data?.call_sentiment ?? null;
    } catch (e) {
        return null;
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const vapiPrivKey = process.env.VAPI_PRIVATE_KEY;
        const { id } = await context.params;

        const vapiPhoneMap = new Map<string, string>();
        // Manual Overrides (User Provided) for high-fidelity identification
        vapiPhoneMap.set('4a7e7a31-0bbc-4fde-831e-2489119ee226', '17624000439');
        vapiPhoneMap.set('e66fe46b-9fe2-4628-a32b-08ced680bc04', '97144396291');
        vapiPhoneMap.set('4baf3613-ba3d-4860-9ea1-62156686b6f1', '447462179309');
        vapiPhoneMap.set('66dff692-d2a5-47d4-bbe0-245509dc7404', '14782159151');
        vapiPhoneMap.set('d91ba874-2522-4d62-adf6-681f2a0bf4fe', '97148714150');

        if (vapiPrivKey) {
            try {
                const res = await fetch('https://api.vapi.ai/phone-number', {
                    headers: { 'Authorization': `Bearer ${vapiPrivKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    (Array.isArray(data) ? data : (data.data || [])).forEach((p: any) => {
                        if (p.id && (p.number || p.phoneNumber)) vapiPhoneMap.set(p.id, String(p.number || p.phoneNumber).replace(/\D/g, ''));
                    });
                }
            } catch (e) { }
        }

        const resolveName = (rawName: string) => {
            if (rawName && /^\d+$/.test(rawName.replace(/\D/g, '')) && rawName.length > 5) return "Guest";
            return rawName || "Guest";
        };

        // Best-effort extraction of the caller's stated name from the transcript,
        // used when customer_name wasn't captured on the row (common for inbound calls).
        // Only scans "User:" turns so the AI's own self-introduction ("This is Maria...")
        // is never mistaken for the caller's name.
        const extractNameFromTranscript = (transcript: unknown): string | null => {
            if (typeof transcript !== 'string' || !transcript.trim()) return null;
            const userLines = transcript.match(/User:[^\n]*/gi) || [];
            const patterns = [
                /(?:my name is|name'?s)\s*,?\s*(?:uh,?\s*)?([A-Z][a-zA-Z'-]{1,20})\b/i,
                /(?:this is|i'?m)\s*,?\s*(?:uh,?\s*)?([A-Z][a-zA-Z'-]{1,20})\b/i,
                /(?:call me)\s+([A-Z][a-zA-Z'-]{1,20})\b/i,
            ];
            for (const line of userLines) {
                for (const re of patterns) {
                    const m = line.match(re);
                    if (m && m[1]) {
                        const candidate = m[1].trim();
                        if (!/^(calling|looking|just|not|sure|good|fine|yeah|yes|okay|ok|going|trying|interested|here)$/i.test(candidate)) {
                            return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
                        }
                    }
                }
            }
            return null;
        };

        // Since Vapi is currently the primary provider, try it first for speed
        if (vapiPrivKey) {
            try {
                const vapiRes = await fetch(`https://api.vapi.ai/call/${id}`, {
                    headers: { 'Authorization': `Bearer ${vapiPrivKey}`, 'Content-Type': 'application/json' }
                });

                if (vapiRes.ok) {
                    const data = await vapiRes.json();
                    const customer = data.customer || {};
                    const INBOUND_RECEPTIONIST_ASSISTANT_ID = '6116e312-8b54-4097-9155-57d899a669c2';
                    const isInbound = data.type?.toLowerCase().includes('inbound') || data.assistantId === INBOUND_RECEPTIONIST_ASSISTANT_ID;

                    // GUEST NUMBER ALWAYS COMES FROM CUSTOMER (STRICT)
                    let customerPhone = String(customer.number || "Unknown").replace(/\D/g, '');
                    if (customerPhone.length > 15) customerPhone = "Unknown";

                    // BOT NUMBER ALWAYS COMES FROM PHONENUMBER OBJECT OR CACHE
                    const rawAssistant = data.phoneNumber?.number || vapiPhoneMap.get(data.phoneNumberId) || data.phoneNumberId || "Unknown";
                    let assistantPhone = String(rawAssistant).replace(/\D/g, '');
                    if (assistantPhone.length > 15) assistantPhone = "Internal-Line";

                    const agentKey = data.assistantId === INBOUND_RECEPTIONIST_ASSISTANT_ID ? 'inbound' : data.assistantId;
                    const [outreachMatch, inboundSentiment] = await Promise.all([
                        lookupOutreachSentiment(agentKey, customerPhone),
                        agentKey === 'inbound' ? lookupInboundCallSentiment(data.id) : Promise.resolve(null),
                    ]);

                    return NextResponse.json({
                        ...data,
                        id: data.id,
                        agent: agentKey,
                        name: resolveName(customer.name),
                        startedAt: data.startedAt,
                        durationSeconds: data.durationSeconds || 0,
                        cost: typeof data.cost === 'number' ? `$${data.cost.toFixed(3)}` : (data.cost || "$0.00"),
                        phoneNumber: assistantPhone, // Bot
                        customer_number: customerPhone, // Guest
                        phone: customerPhone !== "Unknown" ? `+${customerPhone}` : "Unknown", // Add 'phone' for modal compatibility
                        type: isInbound ? "Inbound" : "Outbound",
                        isInbound,
                        source: 'vapi',
                        audio_url: data.recordingUrl,
                        voice1Sentiment: outreachMatch?.voice1_sentiment ?? inboundSentiment ?? null,
                        call1Note: outreachMatch?.call1_note ?? null,
                        voice2Sentiment: outreachMatch?.voice2_sentiment ?? null,
                        call2Note: outreachMatch?.call2_note ?? null,
                    });
                }
            } catch (err) { }
        }

        // LAST RESORT: Check per-agent Supabase archived logs
        for (const cfg of CALL_LOG_AGENTS) {
            try {
                const url = process.env[`NEXT_PUBLIC_SUPABASE_URL_${cfg.envPrefix}`];
                const serviceKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${cfg.envPrefix}`];
                const anonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${cfg.envPrefix}`];
                if (!url || !(serviceKey || anonKey)) continue;

                const client = createClient(url, (serviceKey || anonKey)!);
                const { data: call, error } = await client.from(cfg.table).select('*').eq('id', id).maybeSingle();
                if (error || !call) continue;

                const outreachMatch = await lookupOutreachSentiment(cfg.key, call.customer_phone);

                return NextResponse.json({
                    id: call.id,
                    agent: cfg.key,
                    isInbound: cfg.key === 'inbound',
                    transcript: call.transcript || [],
                    callSummary: call.summary,
                    startedAt: call.started_at,
                    durationSeconds: call.duration_seconds || 0,
                    status: call.status || call.voice_call_status || 'unknown',
                    recordingUrl: call.recording_url,
                    source: call.source || 'vapi',
                    customer_number: call.customer_phone,
                    phone: call.customer_phone,
                    name: resolveName(call.customer_name) !== 'Guest' ? resolveName(call.customer_name) : (extractNameFromTranscript(call.transcript) || 'Guest'),
                    cost: `$${Number(call.cost_usd || 0).toFixed(3)}`,
                    type: cfg.key === 'inbound' ? 'inbound' : undefined,
                    voice1Sentiment: outreachMatch?.voice1_sentiment ?? call.call_sentiment ?? null,
                    call1Note: outreachMatch?.call1_note ?? null,
                    voice2Sentiment: outreachMatch?.voice2_sentiment ?? null,
                    call2Note: outreachMatch?.call2_note ?? null,
                });
            } catch (e) { }
        }

        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch conversation details" }, { status: 500 });
    }
}
