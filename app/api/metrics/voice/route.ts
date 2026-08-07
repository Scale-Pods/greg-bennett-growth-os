import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CALL_LOG_AGENTS } from '@/app/api/calls/route';
import { AGENTS as OUTREACH_AGENTS } from '@/app/api/leads/route';

export const dynamic = 'force-dynamic';

const PICKUP_MIN_DURATION_SECONDS = 18;
const COMPLETED_STATUSES = new Set(['customer-ended-call', 'assistant-ended-call']);

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

function bucketLabel(seconds: number): string {
    if (seconds < 30) return '0-30s';
    if (seconds < 60) return '30-60s';
    if (seconds < 180) return '1-3m';
    if (seconds < 300) return '3-5m';
    return '5m+';
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

    const agents = agentParam
        ? CALL_LOG_AGENTS.filter(a => a.key === agentParam)
        : CALL_LOG_AGENTS;

    if (agentParam && agents.length === 0) {
        return NextResponse.json(
            { error: `Invalid "agent" param. Valid values: ${CALL_LOG_AGENTS.map(a => a.key).join(', ')}` },
            { status: 400 }
        );
    }

    try {
        const perAgentRows = await Promise.all(
            agents.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const { data, error } = await client
                    .from(cfg.table)
                    .select('started_at, duration_seconds, cost_usd, status, lead_id')
                    .gte('started_at', from.toISOString())
                    .lte('started_at', to.toISOString());

                if (error) {
                    console.error(`[voice-metrics:${cfg.key}] table error:`, error.message);
                    return { key: cfg.key, rows: [] as any[] };
                }
                return { key: cfg.key, rows: data || [] };
            })
        );

        // Sentiment lookup: fetch each agent's outreach table's id + voice1/2 sentiment+date,
        // unfiltered by date range since a lead created outside the range can still have a
        // call inside it. Only fetched for agents whose call logs are actually in scope.
        const sentimentByAgent = await Promise.all(
            agents.map(async cfg => {
                const outreachCfg = OUTREACH_AGENTS.find(a => a.key === cfg.key);
                if (!outreachCfg) return { key: cfg.key, byId: new Map<string, any>() };

                const client = getClient(outreachCfg.envPrefix);
                const { data, error } = await client
                    .from(outreachCfg.outreachTable)
                    .select('id, Voice_1_Date, voice1_sentiment, Voice_2_Date, voice2_sentiment');

                if (error) {
                    console.error(`[voice-metrics:${cfg.key}] outreach sentiment error:`, error.message);
                    return { key: cfg.key, byId: new Map<string, any>() };
                }

                const byId = new Map<string, any>();
                for (const row of data || []) {
                    byId.set(String(row.id), row);
                }
                return { key: cfg.key, byId };
            })
        );
        const sentimentMap = new Map(sentimentByAgent.map(s => [s.key, s.byId]));

        function isPositive(value: unknown): boolean {
            return typeof value === 'string' && value.trim().toLowerCase() === 'positive';
        }

        /** Picks whichever of voice1/voice2 sentiment is closer in time to the call's
         *  started_at, since a lead may have 2 calls logged under one outreach row. */
        function resolveSentiment(outreachRow: any, startedAt: string | null): string | null {
            if (!outreachRow) return null;
            const v1Date = outreachRow.Voice_1_Date ? new Date(outreachRow.Voice_1_Date).getTime() : null;
            const v2Date = outreachRow.Voice_2_Date ? new Date(outreachRow.Voice_2_Date).getTime() : null;
            const callTime = startedAt ? new Date(startedAt).getTime() : null;

            if (v1Date === null && v2Date === null) return null;
            if (v1Date !== null && v2Date === null) return outreachRow.voice1_sentiment;
            if (v1Date === null && v2Date !== null) return outreachRow.voice2_sentiment;
            if (callTime === null) return outreachRow.voice1_sentiment;

            const d1 = Math.abs(callTime - (v1Date as number));
            const d2 = Math.abs(callTime - (v2Date as number));
            return d1 <= d2 ? outreachRow.voice1_sentiment : outreachRow.voice2_sentiment;
        }

        let totalCalls = 0;
        let totalDuration = 0;
        let totalCost = 0;
        const byAgent: { key: string; calls: number; duration: number; cost: number }[] = [];
        const rateByAgent: VoiceMetrics['rateByAgent'] = [];
        const dayBuckets = new Map<string, { calls: number; cost: number }>();
        const hourBuckets = new Map<number, number>();
        const durationBuckets = new Map<string, number>();

        for (const { key, rows } of perAgentRows) {
            let agentCalls = 0;
            let agentDuration = 0;
            let agentCost = 0;
            let pickedUp = 0;
            let completed = 0;
            let positive = 0;
            let positiveEligible = 0;

            const outreachById = sentimentMap.get(key) || new Map<string, any>();

            for (const row of rows as any[]) {
                const duration = row.duration_seconds || 0;
                const cost = row.cost_usd || 0;

                agentCalls++;
                agentDuration += duration;
                agentCost += cost;

                if (duration > PICKUP_MIN_DURATION_SECONDS) pickedUp++;
                if (row.status && COMPLETED_STATUSES.has(String(row.status))) completed++;

                if (row.lead_id) {
                    const outreachRow = outreachById.get(String(row.lead_id));
                    if (outreachRow) {
                        const sentiment = resolveSentiment(outreachRow, row.started_at);
                        if (sentiment !== null && sentiment !== undefined) {
                            positiveEligible++;
                            if (isPositive(sentiment)) positive++;
                        }
                    }
                }

                if (row.started_at) {
                    const dayKey = String(row.started_at).slice(0, 10);
                    const dayEntry = dayBuckets.get(dayKey) || { calls: 0, cost: 0 };
                    dayEntry.calls++;
                    dayEntry.cost += cost;
                    dayBuckets.set(dayKey, dayEntry);

                    const hour = new Date(row.started_at).getUTCHours();
                    hourBuckets.set(hour, (hourBuckets.get(hour) || 0) + 1);
                }

                const bucket = bucketLabel(duration);
                durationBuckets.set(bucket, (durationBuckets.get(bucket) || 0) + 1);
            }

            totalCalls += agentCalls;
            totalDuration += agentDuration;
            totalCost += agentCost;
            byAgent.push({ key, calls: agentCalls, duration: agentDuration, cost: agentCost });
            rateByAgent.push({
                key,
                calls: agentCalls,
                pickedUp,
                pickupRate: agentCalls > 0 ? (pickedUp / agentCalls) * 100 : 0,
                completed,
                completionRate: agentCalls > 0 ? (completed / agentCalls) * 100 : 0,
                positive,
                positiveEligible,
                positiveRate: positiveEligible > 0 ? (positive / positiveEligible) * 100 : 0,
            });
        }

        const metrics: VoiceMetrics = {
            totalCalls,
            totalDuration,
            avgDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
            totalCost,
            avgCost: totalCalls > 0 ? totalCost / totalCalls : 0,
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
