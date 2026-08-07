import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export interface MasterMetrics {
    totalLeads: number;
    leadsDaily: { date: string; leads: number }[];
}

interface MasterTableConfig {
    key: string;
    envPrefix: string;
    masterTable: string;
}

const MASTER_TABLES: MasterTableConfig[] = [
    { key: 'recruiting', envPrefix: 'Realty', masterTable: 'master_leads' },
    { key: 'coaching', envPrefix: 'platinum', masterTable: 'coaching_master_leads' },
    { key: 'investor', envPrefix: 'platinum', masterTable: 'investor_funnel_master_leads' },
    { key: 'biglife', envPrefix: 'wealth', masterTable: 'biglife_master_leads' },
    { key: 'bootcampsNew', envPrefix: 'bootcamps', masterTable: 'master_new_leads' },
    { key: 'bootcampsFollowup', envPrefix: 'bootcamps', masterTable: 'master_followup_leads' },
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

function toDayKey(iso: string): string {
    return iso.slice(0, 10); // YYYY-MM-DD
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
            MASTER_TABLES.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const [countRes, dailyRes] = await Promise.all([
                    client.from(cfg.masterTable).select('id', { count: 'exact', head: true }),
                    client
                        .from(cfg.masterTable)
                        .select('created_at')
                        .gte('created_at', from.toISOString())
                        .lte('created_at', to.toISOString()),
                ]);

                if (countRes.error) {
                    console.error(`[master-metrics:${cfg.key}] count error:`, countRes.error.message);
                }
                if (dailyRes.error) {
                    console.error(`[master-metrics:${cfg.key}] daily error:`, dailyRes.error.message);
                }

                return {
                    totalLeads: countRes.count || 0,
                    createdDates: (dailyRes.data || []).map((r: any) => r.created_at as string),
                };
            })
        );

        const totalLeads = results.reduce((sum, r) => sum + r.totalLeads, 0);

        const dayBuckets = new Map<string, number>();
        for (const r of results) {
            for (const createdAt of r.createdDates) {
                const key = toDayKey(createdAt);
                dayBuckets.set(key, (dayBuckets.get(key) || 0) + 1);
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
