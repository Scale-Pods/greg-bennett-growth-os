import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAgent, AGENTS } from '@/lib/agents';
import { normalizeLeads } from '@/lib/leads-utils';

export const dynamic = 'force-dynamic';

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

// There's no bounce-event timestamp column on these tables, only the
// email_bounced flag, so this is an all-time list (no date filtering).
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agent');

    const agentsToFetch = agentKey && agentKey !== 'all' ? [getAgent(agentKey)].filter(Boolean) : AGENTS;
    if (agentKey && agentKey !== 'all' && agentsToFetch.length === 0) {
        return NextResponse.json({ error: `Invalid "agent" param.` }, { status: 400 });
    }

    try {
        const perAgent = await Promise.all(
            agentsToFetch.map(async cfg => {
                const client = getClient(cfg!.envPrefix);
                const { data, error } = await client
                    .from(cfg!.outreachTable)
                    .select('*')
                    .not('email_bounced', 'is', null)
                    .not('email_bounced', 'eq', '')
                    .not('email_bounced', 'ilike', 'no')
                    .not('email_bounced', 'ilike', 'null')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error(`[email-bounced:${cfg!.key}] table error:`, error.message);
                    return [];
                }

                return normalizeLeads(cfg!.key, data || []);
            })
        );

        const leads = perAgent.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(
            { leads },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[email-bounced] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
