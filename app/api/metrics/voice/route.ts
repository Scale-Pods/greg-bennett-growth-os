import { NextResponse } from 'next/server';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';
import { CALL_LOG_AGENTS } from '@/app/api/calls/route';

export const dynamic = 'force-dynamic';

export interface VoiceMetrics {
    totalCalls: number;
    totalDuration: number;
    avgDuration: number;
    totalCost: number;
    avgCost: number;
    byAgent: { key: string; calls: number; duration: number; cost: number }[];
    dailyVolume: { date: string; calls: number; cost: number }[];
    hourlyDistribution: { hour: number; calls: number }[];
    durationBuckets: { label: string; calls: number }[];
    rateByAgent: {
        key: string;
        calls: number;
        pickedUp: number;
        pickupRate: number;
        completed: number;
        completionRate: number;
        positive: number;
        positiveEligible: number;
        positiveRate: number;
    }[];
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const agentParam = searchParams.get('agent');

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    if (agentParam && !CALL_LOG_AGENTS.some(a => a.key === agentParam)) {
        return NextResponse.json(
            { error: `Invalid "agent" param. Valid values: ${CALL_LOG_AGENTS.map(a => a.key).join(', ')}` },
            { status: 400 }
        );
    }

    try {
        // Call get_voice_metrics on all 4 projects in parallel; each already returns
        // full aggregated metrics for ALL businesses within that project.
        const perProject = await Promise.all(
            PROJECT_PREFIXES.map(async prefix => {
                const client = getProjectClient(prefix);
                const { data, error } = await client.rpc('get_voice_metrics', {
                    p_from: from.toISOString(),
                    p_to: to.toISOString(),
                });
                if (error) {
                    console.error(`[voice-metrics:${prefix}] rpc error:`, error.message);
                    return null;
                }
                return data as any;
            })
        );

        // Merge across projects: sum totals, concatenate byAgent/rateByAgent,
        // sum dailyVolume/hourlyDistribution/durationBuckets per key.
        let totalCalls = 0;
        let totalDuration = 0;
        let totalCost = 0;
        const byAgent: { key: string; calls: number; duration: number; cost: number }[] = [];
        const rateByAgent: VoiceMetrics['rateByAgent'] = [];
        const dayBuckets = new Map<string, { calls: number; cost: number }>();
        const hourBuckets = new Map<number, number>();
        const durationBuckets = new Map<string, number>();

        for (const proj of perProject) {
            if (!proj) continue;

            totalCalls += proj.totalCalls || 0;
            totalDuration += proj.totalDuration || 0;
            totalCost += proj.totalCost || 0;

            for (const entry of proj.byAgent || []) {
                byAgent.push(entry);
            }
            for (const entry of proj.rateByAgent || []) {
                rateByAgent.push(entry);
            }
            for (const entry of proj.dailyVolume || []) {
                const existing = dayBuckets.get(entry.date) || { calls: 0, cost: 0 };
                existing.calls += entry.calls || 0;
                existing.cost += entry.cost || 0;
                dayBuckets.set(entry.date, existing);
            }
            for (const entry of proj.hourlyDistribution || []) {
                hourBuckets.set(entry.hour, (hourBuckets.get(entry.hour) || 0) + (entry.calls || 0));
            }
            for (const entry of proj.durationBuckets || []) {
                durationBuckets.set(entry.label, (durationBuckets.get(entry.label) || 0) + (entry.calls || 0));
            }
        }

        // If ?agent= is provided, filter down to just that agent's data, recomputing
        // totals from ONLY that agent (mirrors the old route's exact semantics: it
        // filtered the agent list BEFORE computing totals, so totalCalls etc. are
        // scoped to the single agent, not a global sum).
        if (agentParam) {
            const agentByAgent = byAgent.filter(a => a.key === agentParam);
            const agentRateByAgent = rateByAgent.filter(a => a.key === agentParam);

            const scopedTotalCalls = agentByAgent.reduce((sum, a) => sum + a.calls, 0);
            const scopedTotalDuration = agentByAgent.reduce((sum, a) => sum + a.duration, 0);
            const scopedTotalCost = agentByAgent.reduce((sum, a) => sum + a.cost, 0);

            const metrics: VoiceMetrics = {
                totalCalls: scopedTotalCalls,
                totalDuration: scopedTotalDuration,
                avgDuration: scopedTotalCalls > 0 ? scopedTotalDuration / scopedTotalCalls : 0,
                totalCost: scopedTotalCost,
                avgCost: scopedTotalCalls > 0 ? scopedTotalCost / scopedTotalCalls : 0,
                byAgent: agentByAgent,
                rateByAgent: agentRateByAgent,
                dailyVolume: Array.from(dayBuckets.entries())
                    .map(([date, v]) => ({ date, calls: v.calls, cost: v.cost }))
                    .sort((a, b) => a.date.localeCompare(b.date)),
                hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
                    hour,
                    calls: hourBuckets.get(hour) || 0,
                })),
                durationBuckets: Array.from(durationBuckets.entries()).map(([label, calls]) => ({ label, calls })),
            };

            return NextResponse.json(metrics, {
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
            });
        }

        const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
        const avgCost = totalCalls > 0 ? totalCost / totalCalls : 0;

        const metrics: VoiceMetrics = {
            totalCalls,
            totalDuration,
            avgDuration,
            totalCost,
            avgCost,
            byAgent,
            rateByAgent,
            dailyVolume: Array.from(dayBuckets.entries())
                .map(([date, v]) => ({ date, calls: v.calls, cost: v.cost }))
                .sort((a, b) => a.date.localeCompare(b.date)),
            hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
                hour,
                calls: hourBuckets.get(hour) || 0,
            })),
            durationBuckets: Array.from(durationBuckets.entries()).map(([label, calls]) => ({ label, calls })),
        };

        return NextResponse.json(metrics, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error('[voice-metrics] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
