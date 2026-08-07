import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AGENTS as AGENT_CONFIGS } from '@/lib/agents';

export const dynamic = 'force-dynamic';

interface AgentMetrics {
    key: string;
    totalLeads: number;
    emailsSent: number;
    voiceCalls: number;
    emailReplies: number;
    callReplies: number;
}

interface AgentConfig {
    key: string;
    envPrefix: string;
    masterTable: string;
    outreachTable: string;
    repliesTable: string;
}

const MASTER_TABLES: Record<string, string> = {
    recruiting: 'master_leads',
    coaching: 'coaching_master_leads',
    investor: 'investor_funnel_master_leads',
    biglife: 'biglife_master_leads',
    bootcampsNew: 'master_new_leads',
    bootcampsFollowup: 'master_followup_leads',
};

const AGENTS: AgentConfig[] = AGENT_CONFIGS.map(cfg => ({
    key: cfg.key,
    envPrefix: cfg.envPrefix,
    masterTable: MASTER_TABLES[cfg.key],
    outreachTable: cfg.outreachTable,
    repliesTable: cfg.repliesTable,
}));

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

/** Extracts the first parseable ISO-ish date found in a text field. Handles
 *  plain ISO strings ("2026-07-28T07:32:21.000-04:00") as well as
 *  "Yes 2026-08-06T02:16:31.204-04:00" style reply-track values. */
function extractDate(value: unknown): Date | null {
    if (!value) return null;
    const str = String(value).trim();
    if (!str) return null;

    const isoMatch = str.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)?/);
    const candidate = isoMatch ? isoMatch[0] : str;

    const d = new Date(candidate);
    return isNaN(d.getTime()) ? null : d;
}

function inRange(date: Date | null, from: Date, to: Date): boolean {
    if (!date) return false;
    return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
}

async function fetchAgentMetrics(cfg: AgentConfig, from: Date, to: Date): Promise<AgentMetrics> {
    const client = getClient(cfg.envPrefix);

    const [masterCountRes, outreachRes, repliesRes] = await Promise.all([
        client.from(cfg.masterTable).select('id', { count: 'exact', head: true }),
        client
            .from(cfg.outreachTable)
            .select('Email_1_Sent_At, Email_2_Sent_At, Voice_1_Date, Voice_2_Date, Call_Reply_Track'),
        client
            .from(cfg.repliesTable)
            .select('message_id', { count: 'exact', head: true })
            .gte('reply_timestamp', from.toISOString())
            .lte('reply_timestamp', to.toISOString()),
    ]);

    if (masterCountRes.error) {
        console.error(`[agent-metrics:${cfg.key}] master table error:`, masterCountRes.error.message);
    }
    if (outreachRes.error) {
        console.error(`[agent-metrics:${cfg.key}] outreach table error:`, outreachRes.error.message);
    }
    if (repliesRes.error) {
        console.error(`[agent-metrics:${cfg.key}] replies table error:`, repliesRes.error.message);
    }

    const rows = outreachRes.data || [];

    let emailsSent = 0;
    let voiceCalls = 0;
    let callReplies = 0;

    for (const row of rows as Record<string, unknown>[]) {
        const e1 = extractDate(row.Email_1_Sent_At);
        const e2 = extractDate(row.Email_2_Sent_At);
        if (inRange(e1, from, to)) emailsSent++;
        if (inRange(e2, from, to)) emailsSent++;

        const v1 = extractDate(row.Voice_1_Date);
        const v2 = extractDate(row.Voice_2_Date);
        if (inRange(v1, from, to)) voiceCalls++;
        if (inRange(v2, from, to)) voiceCalls++;

        const cr = extractDate(row.Call_Reply_Track);
        if (inRange(cr, from, to)) callReplies++;
    }

    return {
        key: cfg.key,
        totalLeads: masterCountRes.count || 0,
        emailsSent,
        voiceCalls,
        emailReplies: repliesRes.count || 0,
        callReplies,
    };
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
        const results = await Promise.all(AGENTS.map(cfg => fetchAgentMetrics(cfg, from, to)));
        const byKey = Object.fromEntries(results.map(r => [r.key, r]));
        return NextResponse.json(byKey, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error('[agent-metrics] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
