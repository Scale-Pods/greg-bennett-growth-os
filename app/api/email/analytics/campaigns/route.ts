import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AGENTS } from '@/lib/agents';
import { normalizeCampaignAnalytics, NormalizedCampaignAnalytics } from '@/lib/email-utils';

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

const SUM_KEYS: (keyof NormalizedCampaignAnalytics)[] = [
    'leadsCount', 'contactedCount', 'emailsSentCount', 'newLeadsContactedCount',
    'openCount', 'openCountUnique', 'replyCount', 'replyCountUnique',
    'replyCountAutomatic', 'replyCountAutomaticUnique', 'linkClickCount', 'linkClickCountUnique',
    'bouncedCount', 'unsubscribedCount', 'completedCount', 'totalOpportunities', 'totalOpportunityValue',
];

function sumTotals(campaigns: NormalizedCampaignAnalytics[]): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const key of SUM_KEYS) totals[key] = 0;
    for (const c of campaigns) {
        for (const key of SUM_KEYS) totals[key] += (c[key] as number) || 0;
    }
    return totals;
}

export async function GET() {
    try {
        const perAgent = await Promise.all(
            AGENTS.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const { data, error } = await client
                    .from(cfg.analyticsTable)
                    .select('*');

                if (error) {
                    console.error(`[email-analytics:${cfg.key}] table error:`, error.message);
                    return { key: cfg.key, campaigns: [] as NormalizedCampaignAnalytics[] };
                }

                return { key: cfg.key, campaigns: normalizeCampaignAnalytics(cfg.key, data || []) };
            })
        );

        const byAgent: Record<string, { campaigns: NormalizedCampaignAnalytics[]; totals: Record<string, number> }> = {};
        let allCampaigns: NormalizedCampaignAnalytics[] = [];

        for (const { key, campaigns } of perAgent) {
            byAgent[key] = { campaigns, totals: sumTotals(campaigns) };
            allCampaigns = allCampaigns.concat(campaigns);
        }

        const grandTotals = sumTotals(allCampaigns);

        return NextResponse.json(
            { byAgent, grandTotals },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[email-analytics] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
