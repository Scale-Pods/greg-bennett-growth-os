import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeLeads } from '@/lib/leads-utils';

export const dynamic = 'force-dynamic';

interface AgentConfig {
    key: string;
    envPrefix: string;
    outreachTable: string;
}

export const AGENTS: AgentConfig[] = [
    { key: 'recruiting', envPrefix: 'Realty', outreachTable: 'recruiting_ai_agent_outreach' },
    { key: 'coaching', envPrefix: 'platinum', outreachTable: 'coaching_ai_agent_outreach' },
    { key: 'investor', envPrefix: 'platinum', outreachTable: 'investor_funnel_ai_agent_outreach' },
    { key: 'biglife', envPrefix: 'wealth', outreachTable: 'biglife_new_leads_outreach' },
    { key: 'bootcampsNew', envPrefix: 'bootcamps', outreachTable: 'bootcamps_new_leads_outreach' },
    { key: 'bootcampsFollowup', envPrefix: 'bootcamps', outreachTable: 'bootcamps_follow_up_outreach' },
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

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const cfg = AGENTS.find(a => a.key === agentKey);
    if (!cfg) {
        return NextResponse.json(
            { error: `Invalid or missing "agent" param. Valid values: ${AGENTS.map(a => a.key).join(', ')}` },
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
        const { data, error } = await client
            .from(cfg.outreachTable)
            .select('*')
            .gte('created_at', from.toISOString())
            .lte('created_at', to.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`[leads:${cfg.key}] table error:`, error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        const leads = normalizeLeads(cfg.key, data || []);

        return NextResponse.json(
            { agent: cfg.key, leads },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error(`[leads:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
