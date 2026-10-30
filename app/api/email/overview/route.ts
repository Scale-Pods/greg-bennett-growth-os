import { NextResponse } from 'next/server';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

interface AgentStats {
    emailsSent: number;
    replies: number;
    replyRate: number;
    unsubscribed: number;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    try {
        const perProject = await Promise.all(
            PROJECT_PREFIXES.map(async prefix => {
                const client = getProjectClient(prefix);
                const { data, error } = await client.rpc('get_email_overview', {
                    p_from: from.toISOString(),
                    p_to: to.toISOString(),
                });

                if (error) {
                    console.error(`[email-overview:${prefix}] rpc error:`, error.message);
                    return { byAgent: {} as Record<string, AgentStats>, trend: [] as Array<{ date: string; emailsSent: number; replies: number }> };
                }

                return {
                    byAgent: (data?.byAgent || {}) as Record<string, AgentStats>,
                    trend: (data?.trend || []) as Array<{ date: string; emailsSent: number; replies: number }>,
                };
            })
        );

        const byAgent: Record<string, AgentStats> = {};
        const trendBuckets = new Map<string, { emailsSent: number; replies: number }>();

        let totalEmailsSent = 0;
        let totalReplies = 0;
        let totalUnsubscribed = 0;

        for (const { byAgent: projectByAgent, trend } of perProject) {
            for (const [key, stats] of Object.entries(projectByAgent)) {
                byAgent[key] = stats;
                totalEmailsSent += stats.emailsSent;
                totalReplies += stats.replies;
                totalUnsubscribed += stats.unsubscribed;
            }

            for (const bucket of trend) {
                const existing = trendBuckets.get(bucket.date) || { emailsSent: 0, replies: 0 };
                existing.emailsSent += bucket.emailsSent;
                existing.replies += bucket.replies;
                trendBuckets.set(bucket.date, existing);
            }
        }

        const trend = Array.from(trendBuckets.entries())
            .map(([date, v]) => ({ date, emailsSent: v.emailsSent, replies: v.replies }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json(
            {
                range: { from: from.toISOString(), to: to.toISOString() },
                totals: {
                    emailsSent: totalEmailsSent,
                    replies: totalReplies,
                    replyRate: totalEmailsSent > 0 ? (totalReplies / totalEmailsSent) * 100 : 0,
                    unsubscribed: totalUnsubscribed,
                },
                byAgent,
                trend,
            },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[email-overview] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
