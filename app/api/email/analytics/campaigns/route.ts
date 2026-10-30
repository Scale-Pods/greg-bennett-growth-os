import { NextResponse } from 'next/server';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

const SUM_KEYS = [
    'leadsCount', 'contactedCount', 'emailsSentCount', 'newLeadsContactedCount',
    'openCount', 'openCountUnique', 'replyCount', 'replyCountUnique',
    'replyCountAutomatic', 'replyCountAutomaticUnique', 'linkClickCount', 'linkClickCountUnique',
    'bouncedCount', 'unsubscribedCount', 'completedCount', 'totalOpportunities', 'totalOpportunityValue',
];

function sumTotals(totalsList: Record<string, number>[]): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const key of SUM_KEYS) totals[key] = 0;
    for (const t of totalsList) {
        for (const key of SUM_KEYS) totals[key] += (t?.[key] as number) || 0;
    }
    return totals;
}

export async function GET() {
    try {
        const perProject = await Promise.all(
            PROJECT_PREFIXES.map(async prefix => {
                const client = getProjectClient(prefix);
                const { data, error } = await client.rpc('get_campaign_analytics');

                if (error) {
                    console.error(`[email-analytics:${prefix}] rpc error:`, error.message);
                    return {} as Record<string, { campaigns: any[]; totals: Record<string, number> }>;
                }

                return (data?.byAgent || {}) as Record<string, { campaigns: any[]; totals: Record<string, number> }>;
            })
        );

        const byAgent: Record<string, { campaigns: any[]; totals: Record<string, number> }> = {};
        for (const projectByAgent of perProject) {
            for (const [key, value] of Object.entries(projectByAgent)) {
                byAgent[key] = value;
            }
        }

        const grandTotals = sumTotals(Object.values(byAgent).map(v => v.totals));

        return NextResponse.json(
            { byAgent, grandTotals },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[email-analytics] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
