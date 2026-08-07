import { NextRequest, NextResponse } from 'next/server';
import { CALL_LOG_AGENTS } from '@/app/api/calls/route';
import { createClient } from '@supabase/supabase-js';

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

        // Since Vapi is currently the primary provider, try it first for speed
        if (vapiPrivKey) {
            try {
                const vapiRes = await fetch(`https://api.vapi.ai/call/${id}`, {
                    headers: { 'Authorization': `Bearer ${vapiPrivKey}`, 'Content-Type': 'application/json' }
                });

                if (vapiRes.ok) {
                    const data = await vapiRes.json();
                    const customer = data.customer || {};
                    const isInbound = data.type?.toLowerCase().includes('inbound');

                    // GUEST NUMBER ALWAYS COMES FROM CUSTOMER (STRICT)
                    let customerPhone = String(customer.number || "Unknown").replace(/\D/g, '');
                    if (customerPhone.length > 15) customerPhone = "Unknown";

                    // BOT NUMBER ALWAYS COMES FROM PHONENUMBER OBJECT OR CACHE
                    const rawAssistant = data.phoneNumber?.number || vapiPhoneMap.get(data.phoneNumberId) || data.phoneNumberId || "Unknown";
                    let assistantPhone = String(rawAssistant).replace(/\D/g, '');
                    if (assistantPhone.length > 15) assistantPhone = "Internal-Line";

                    return NextResponse.json({
                        ...data,
                        id: data.id,
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
                        audio_url: data.recordingUrl
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

                return NextResponse.json({
                    id: call.id,
                    agent: cfg.key,
                    transcript: call.transcript || [],
                    callSummary: call.summary,
                    startedAt: call.started_at,
                    durationSeconds: call.duration_seconds || 0,
                    status: call.status || call.voice_call_status || 'unknown',
                    recordingUrl: call.recording_url,
                    source: call.source || 'vapi',
                    customer_number: call.customer_phone,
                    phone: call.customer_phone,
                    name: resolveName(call.customer_name),
                    cost: `$${Number(call.cost_usd || 0).toFixed(3)}`,
                });
            } catch (e) { }
        }

        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch conversation details" }, { status: 500 });
    }
}
