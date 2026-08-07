import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AGENTS } from '@/lib/agents';
import { normalizeLeads } from '@/lib/leads-utils';

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
        const perAgent = await Promise.all(
            AGENTS.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const { data, error } = await client
                    .from(cfg.outreachTable)
                    .select('id, full_name, First_Name, Personal_Email, Lead_Classification, Lead_Classification_Reason, sequence_status, outreach_step, Email_1, Email_1_Status, Email_1_Sent_At, Email_2, Email_2_Status, Email_2_Sent_At, Voice_1_Date, Voice_1_Status, voice1_sentiment, call1_note, Voice_2_Date, Voice_2_Status, voice2_sentiment, call2_note, Email_Reply_Track, Call_Reply_Track, email_unsubscribed, personal_phone, created_at')
                    .gte('created_at', from.toISOString())
                    .lte('created_at', to.toISOString());

                if (error) {
                    console.error(`[email-overview:${cfg.key}] table error:`, error.message);
                    return { key: cfg.key, leads: [] as ReturnType<typeof normalizeLeads> };
                }

                return { key: cfg.key, leads: normalizeLeads(cfg.key, data || []) };
            })
        );

        const byAgent: Record<string, AgentStats> = {};
        const trendBuckets = new Map<string, { emailsSent: number; replies: number }>();

        let totalEmailsSent = 0;
        let totalReplies = 0;
        let totalUnsubscribed = 0;

        for (const { key, leads } of perAgent) {
            let emailsSent = 0;
            let replies = 0;
            let unsubscribed = 0;

            for (const lead of leads) {
                if (lead.email1.sentAt) {
                    emailsSent++;
                    const dayKey = String(lead.email1.sentAt).slice(0, 10);
                    const bucket = trendBuckets.get(dayKey) || { emailsSent: 0, replies: 0 };
                    bucket.emailsSent++;
                    trendBuckets.set(dayKey, bucket);
                }
                if (lead.email2.sentAt) {
                    emailsSent++;
                    const dayKey = String(lead.email2.sentAt).slice(0, 10);
                    const bucket = trendBuckets.get(dayKey) || { emailsSent: 0, replies: 0 };
                    bucket.emailsSent++;
                    trendBuckets.set(dayKey, bucket);
                }
                if (lead.emailReplied) {
                    replies++;
                    if (lead.emailReplyDate) {
                        const dayKey = String(lead.emailReplyDate).slice(0, 10);
                        const bucket = trendBuckets.get(dayKey) || { emailsSent: 0, replies: 0 };
                        bucket.replies++;
                        trendBuckets.set(dayKey, bucket);
                    }
                }
                if (lead.emailUnsubscribed) unsubscribed++;
            }

            byAgent[key] = {
                emailsSent,
                replies,
                replyRate: emailsSent > 0 ? (replies / emailsSent) * 100 : 0,
                unsubscribed,
            };

            totalEmailsSent += emailsSent;
            totalReplies += replies;
            totalUnsubscribed += unsubscribed;
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
