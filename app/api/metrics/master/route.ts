import { NextResponse } from 'next/server';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

export interface MasterMetrics {
    totalLeads: number;
    leadsDaily: { date: string; leads: number }[];
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
        const results = await Promise.all(
            PROJECT_PREFIXES.map(async envPrefix => {
                const client = getProjectClient(envPrefix);
                const { data, error } = await client.rpc('get_master_metrics', {
                    p_from: from.toISOString(),
                    p_to: to.toISOString(),
                });

                if (error) {
                    console.error(`[master-metrics:${envPrefix}] rpc error:`, error.message);
                    return { totalLeads: 0, leadsDaily: [] as { date: string; leads: number }[] };
                }

                return {
                    totalLeads: typeof data?.totalLeads === 'number' ? data.totalLeads : 0,
                    leadsDaily: Array.isArray(data?.leadsDaily) ? data.leadsDaily : [],
                };
            })
        );

        const totalLeads = results.reduce((sum, r) => sum + r.totalLeads, 0);

        const dayBuckets = new Map<string, number>();
        for (const r of results) {
            for (const entry of r.leadsDaily) {
                const key = entry.date;
                dayBuckets.set(key, (dayBuckets.get(key) || 0) + (entry.leads || 0));
            }
        }

        const leadsDaily = Array.from(dayBuckets.entries())
            .map(([date, leads]) => ({ date, leads }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const metrics: MasterMetrics = { totalLeads, leadsDaily };

        return NextResponse.json(metrics, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error('[master-metrics] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
