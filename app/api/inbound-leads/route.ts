import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface BusinessConfig {
    key: string;
    envPrefix: string;
    table: string;
}

const BUSINESSES: BusinessConfig[] = [
    { key: 'wealth', envPrefix: 'wealth', table: 'bennett_wealth_inbound_leads' },
    { key: 'realty', envPrefix: 'Realty', table: 'bennett_realty_inbound_leads' },
    { key: 'bootcamps', envPrefix: 'bootcamps', table: 'bennett_bootcamps_inbound_leads' },
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
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    try {
        const results = await Promise.all(
            BUSINESSES.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const { data, error } = await client
                    .from(cfg.table)
                    .select('*')
                    .gte('created_at', from.toISOString())
                    .lte('created_at', to.toISOString())
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error(`[inbound-leads:${cfg.key}] table error:`, error.message);
                    return { key: cfg.key, leads: [] };
                }

                return { key: cfg.key, leads: data || [] };
            })
        );

        const byKey = Object.fromEntries(results.map(r => [r.key, r.leads]));

        return NextResponse.json(byKey, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error('[inbound-leads] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
