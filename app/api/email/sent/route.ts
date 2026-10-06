import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeLeads } from '@/lib/leads-utils';

export const dynamic = 'force-dynamic';

interface AgentConfig {
    key: string;
    envPrefix: string;
    outreachTable: string;
}

const AGENTS: AgentConfig[] = [
    { key: 'recruiting', envPrefix: 'Realty', outreachTable: 'recruiting_ai_agent_outreach' },
    { key: 'coaching', envPrefix: 'platinum', outreachTable: 'coaching_ai_agent_outreach' },
    { key: 'investor', envPrefix: 'platinum', outreachTable: 'investor_funnel_ai_agent_outreach' },
    { key: 'biglife', envPrefix: 'wealth', outreachTable: 'biglife_new_leads_outreach' },
    { key: 'bigLifeNewCampaign', envPrefix: 'wealth', outreachTable: 'big_life_new_campaign_outreach' },
    { key: 'homeSeller', envPrefix: 'wealth', outreachTable: 'home_seller_leads_outreach' },
    { key: 'bootcampsFollowup', envPrefix: 'bootcamps', outreachTable: 'bootcamps_follow_up_outreach' },
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
    const agentKey = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const cfg = AGENTS.find(a => a.key === agentKey);
    if (!cfg) {
        return NextResponse.json(
            { error: `Invalid or missing "agent" param. Valid values: ${AGENTS.map(a => a.key).join(', ')}` },
            { status: 400 }
        );
    }

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    try {
        const client = getClient(cfg.envPrefix);

        // A lead's step-1 or step-2 email can fall in the selected range independently
        // of when the lead row itself was created, so filter on the actual send
        // timestamps (with an OR across both steps) instead of created_at.
        const { data, error } = await client
            .from(cfg.outreachTable)
            .select('*')
            .or(
                `and(Email_1_Sent_At.gte.${fromIso},Email_1_Sent_At.lte.${toIso}),` +
                `and(Email_2_Sent_At.gte.${fromIso},Email_2_Sent_At.lte.${toIso})`
            )
            .order('Email_1_Sent_At', { ascending: false });

        if (error) {
            console.error(`[email-sent:${cfg.key}] table error:`, error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        const leads = normalizeLeads(cfg.key, data || []);
        const fromTime = from.getTime();
        const toTime = to.getTime();

        // Flatten to one row per actual send event, keeping only the step(s) whose
        // own sentAt genuinely falls in the requested range (a lead can match on
        // step 2 timing while its step 1 send falls outside the window, or vice versa).
        const sentEmails = leads.flatMap(lead => {
            const rows: Array<{ lead: typeof lead; step: 1 | 2; body: string | null; status: string | null; sentAt: string }> = [];
            if (lead.email1.sentAt) {
                const t = new Date(lead.email1.sentAt).getTime();
                if (!isNaN(t) && t >= fromTime && t <= toTime) {
                    rows.push({ lead, step: 1, body: lead.email1.body, status: lead.email1.status, sentAt: lead.email1.sentAt });
                }
            }
            if (lead.email2.sentAt) {
                const t = new Date(lead.email2.sentAt).getTime();
                if (!isNaN(t) && t >= fromTime && t <= toTime) {
                    rows.push({ lead, step: 2, body: lead.email2.body, status: lead.email2.status, sentAt: lead.email2.sentAt });
                }
            }
            return rows;
        }).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

        return NextResponse.json(
            { agent: cfg.key, sentEmails },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error(`[email-sent:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
