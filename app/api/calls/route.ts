import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTwilioCostLookup } from '@/lib/twilio-cost';

export const dynamic = 'force-dynamic';

interface CallLogAgentConfig {
    key: string;
    envPrefix: string;
    table: string;
    outreachTable?: string;
}

export const CALL_LOG_AGENTS: CallLogAgentConfig[] = [
    { key: 'recruiting', envPrefix: 'Realty', table: 'vapi_call_logs_brs', outreachTable: 'recruiting_ai_agent_outreach' },
    { key: 'coaching', envPrefix: 'platinum', table: 'vapi_call_logs_coaching', outreachTable: 'coaching_ai_agent_outreach' },
    { key: 'investor', envPrefix: 'platinum', table: 'vapi_call_logs_investor', outreachTable: 'investor_funnel_ai_agent_outreach' },
    { key: 'biglife', envPrefix: 'wealth', table: 'vapi_call_logs_biglife', outreachTable: 'biglife_new_leads_outreach' },
    { key: 'bootcampsNew', envPrefix: 'bootcamps', table: 'vapi_call_logs_new_leads', outreachTable: 'bootcamps_new_leads_outreach' },
    { key: 'bootcampsFollowup', envPrefix: 'bootcamps', table: 'vapi_call_logs_followup', outreachTable: 'bootcamps_follow_up_outreach' },
    { key: 'inbound', envPrefix: 'wealth', table: 'vapi_call_logs_inbound' }, // no outreach table: inbound callers have no pre-existing lead record
];

function normalizePhone(phone: unknown): string {
    return typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
}

const clientCache = new Map<string, SupabaseClient>();

function getClient(envPrefix: string): SupabaseClient {
    const cached = clientCache.get(envPrefix);
    if (cached) return cached;

    const url = process.env[`NEXT_PUBLIC_SUPABASE_URL_${envPrefix}`];
    const serviceKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${envPrefix}`];
    const anonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${envPrefix}`];

    if (!url || !(serviceKey || anonKey)) {
        throw new Error(`Missing Supabase env vars for prefix "${envPrefix}"`);
    }

    const client = createClient(url, (serviceKey || anonKey)!);
    clientCache.set(envPrefix, client);
    return client;
}

function normalizeRow(agent: string, d: any, telephonyCost: number | null, outreachMatch?: any) {
    const agentCost = d.cost_usd ?? 0;
    return {
        id: d.id,
        agent,
        isInbound: agent === 'inbound',
        startedAt: d.started_at,
        durationSeconds: d.duration_seconds || 0,
        cost: agentCost,
        telephonyCost,
        totalCost: telephonyCost !== null ? agentCost + telephonyCost : agentCost,
        phone: d.customer_phone || 'Unknown',
        name: d.customer_name || 'Guest',
        status: d.status || null,
        voiceCallStatus: d.voice_call_status || null,
        source: d.source || null,
        summary: d.summary || null,
        recordingUrl: d.recording_url || null,
        note: d.note || null,
        leadId: d.lead_id || null,
        voice1Sentiment: outreachMatch?.voice1_sentiment ?? d.call_sentiment ?? null,
        call1Note: outreachMatch?.call1_note ?? null,
        voice2Sentiment: outreachMatch?.voice2_sentiment ?? null,
        call2Note: outreachMatch?.call2_note ?? null,
    };
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const includeTelephony = searchParams.get('includeTelephony') === 'true';

    const cfg = CALL_LOG_AGENTS.find(a => a.key === agentKey);
    if (!cfg) {
        return NextResponse.json(
            { error: `Invalid or missing "agent" param. Valid values: ${CALL_LOG_AGENTS.map(a => a.key).join(', ')}` },
            { status: 400 }
        );
    }

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    try {
        const client = getClient(cfg.envPrefix);
        const [{ data, error }, telephonyLookup, outreachRows] = await Promise.all([
            client
                .from(cfg.table)
                .select('*')
                .gte('started_at', from.toISOString())
                .lte('started_at', to.toISOString())
                .order('started_at', { ascending: false }),
            includeTelephony ? getTwilioCostLookup(from, to) : Promise.resolve(null),
            cfg.outreachTable
                ? client.from(cfg.outreachTable).select('personal_phone, created_at, voice1_sentiment, call1_note, voice2_sentiment, call2_note')
                    .then(res => res.data || [])
                : Promise.resolve([]),
        ]);

        if (error) {
            console.error(`[calls:${cfg.key}] table error:`, error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        // A phone number can have multiple outreach rows (re-imports, duplicate leads).
        // Prefer the row that actually has sentiment data; break ties by most recent.
        const outreachByPhone = new Map<string, any>();
        for (const row of outreachRows) {
            const key = normalizePhone(row.personal_phone);
            if (!key) continue;
            const existing = outreachByPhone.get(key);
            if (!existing) { outreachByPhone.set(key, row); continue; }
            const rowHasData = !!(row.voice1_sentiment || row.call1_note || row.voice2_sentiment || row.call2_note);
            const existingHasData = !!(existing.voice1_sentiment || existing.call1_note || existing.voice2_sentiment || existing.call2_note);
            if (rowHasData && !existingHasData) { outreachByPhone.set(key, row); continue; }
            if (rowHasData === existingHasData && new Date(row.created_at || 0) > new Date(existing.created_at || 0)) {
                outreachByPhone.set(key, row);
            }
        }

        const calls = (data || []).map((row: any) => {
            const telephonyCost = telephonyLookup ? telephonyLookup(row.customer_phone, row.started_at) : null;
            const outreachMatch = outreachByPhone.get(normalizePhone(row.customer_phone));
            return normalizeRow(cfg.key, row, telephonyCost, outreachMatch);
        });

        return NextResponse.json(calls, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error(`[calls:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
