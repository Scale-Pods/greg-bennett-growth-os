import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CALL_LOG_AGENTS } from '@/app/api/calls/route';

export const dynamic = 'force-dynamic';

// vapi_call_logs_new_leads exists in the bootcamps Supabase project (schema
// docs show it alongside vapi_call_logs_followup there) but isn't wired into
// CALL_LOG_AGENTS/the Voice dashboard yet. Included here so the total cost
// figure doesn't undercount it; verify the table name/project if this ever
// turns out wrong, and consider adding it to CALL_LOG_AGENTS with a real
// agent key once its purpose (e.g. "Bootcamps new leads calling") is confirmed.
const EXTRA_COST_TABLES: { envPrefix: string; table: string }[] = [
    { envPrefix: 'bootcamps', table: 'vapi_call_logs_new_leads' },
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

export async function GET() {
    try {
        const agentTotals = await Promise.all(
            CALL_LOG_AGENTS.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const { data, error } = await client.from(cfg.table).select('cost_usd');

                if (error) {
                    console.error(`[vapi-cost:${cfg.key}] table error:`, error.message);
                    return 0;
                }

                return (data || []).reduce((sum: number, row: any) => sum + (row.cost_usd || 0), 0);
            })
        );

        const extraTotals = await Promise.all(
            EXTRA_COST_TABLES.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const { data, error } = await client.from(cfg.table).select('cost_usd');

                if (error) {
                    console.error(`[vapi-cost:${cfg.table}] table error:`, error.message);
                    return 0;
                }

                return (data || []).reduce((sum: number, row: any) => sum + (row.cost_usd || 0), 0);
            })
        );

        const totalUsed = [...agentTotals, ...extraTotals].reduce((sum, t) => sum + t, 0);

        return NextResponse.json(
            { totalUsed },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[vapi-cost] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
