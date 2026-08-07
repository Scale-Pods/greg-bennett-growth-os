import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTwilioCostLookup } from '@/lib/twilio-cost';

export const dynamic = 'force-dynamic';

interface CallLogAgentConfig {
    key: string;
    envPrefix: string;
    table: string;
}

export const CALL_LOG_AGENTS: CallLogAgentConfig[] = [
    { key: 'recruiting', envPrefix: 'Realty', table: 'vapi_call_logs_brs' },
    { key: 'coaching', envPrefix: 'platinum', table: 'vapi_call_logs_coaching' },
    { key: 'investor', envPrefix: 'platinum', table: 'vapi_call_logs_investor' },
    { key: 'biglife', envPrefix: 'wealth', table: 'vapi_call_logs_biglife' },
    { key: 'bootcampsNew', envPrefix: 'bootcamps', table: 'vapi_call_logs_new_leads' },
    { key: 'bootcampsFollowup', envPrefix: 'bootcamps', table: 'vapi_call_logs_followup' },
];

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

function normalizeRow(agent: string, d: any, telephonyCost: number | null) {
    const agentCost = d.cost_usd ?? 0;
    return {
        id: d.id,
        agent,
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
        const [{ data, error }, telephonyLookup] = await Promise.all([
            client
                .from(cfg.table)
                .select('*')
                .gte('started_at', from.toISOString())
                .lte('started_at', to.toISOString())
                .order('started_at', { ascending: false }),
            includeTelephony ? getTwilioCostLookup(from, to) : Promise.resolve(null),
        ]);

        if (error) {
            console.error(`[calls:${cfg.key}] table error:`, error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        const calls = (data || []).map((row: any) => {
            const telephonyCost = telephonyLookup ? telephonyLookup(row.customer_phone, row.started_at) : null;
            return normalizeRow(cfg.key, row, telephonyCost);
        });

        return NextResponse.json(calls, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error(`[calls:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
