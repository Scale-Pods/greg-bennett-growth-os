import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AGENTS } from '@/lib/agents';
import { normalizeMasterLeads } from '@/lib/leads-utils';

export const dynamic = 'force-dynamic';

const MASTER_TABLES: Record<string, string> = {
    recruiting: 'master_leads',
    coaching: 'coaching_master_leads',
    investor: 'investor_funnel_master_leads',
    biglife: 'biglife_master_leads',
    bootcampsNew: 'master_new_leads',
    bootcampsFollowup: 'master_followup_leads',
};

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
    const agentParam = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    const agentsToFetch = agentParam && agentParam !== 'all'
        ? AGENTS.filter(a => a.key === agentParam)
        : AGENTS;

    if (agentParam && agentParam !== 'all' && agentsToFetch.length === 0) {
        return NextResponse.json(
            { error: `Invalid "agent" param. Valid values: all, ${AGENTS.map(a => a.key).join(', ')}` },
            { status: 400 }
        );
    }

    try {
        const perAgent = await Promise.all(
            agentsToFetch.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const table = MASTER_TABLES[cfg.key];
                const { data, error } = await client
                    .from(table)
                    .select('id, full_name, first_name, personal_email, personal_phone, lead_classification, lead_classification_reason, synced_to_outreach, created_at')
                    .gte('created_at', from.toISOString())
                    .lte('created_at', to.toISOString())
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error(`[leads-master:${cfg.key}] table error:`, error.message);
                    return [];
                }

                return normalizeMasterLeads(cfg.key, data || []);
            })
        );

        const leads = perAgent.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(
            { leads },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[leads-master] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
