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

    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    const fromTime = from.getTime();
    const toTime = to.getTime();

    const inRange = (iso: string | null) => {
        if (!iso) return false;
        const t = new Date(iso).getTime();
        return !isNaN(t) && t >= fromTime && t <= toTime;
    };

    try {
        const perAgent = await Promise.all(
            AGENTS.map(async cfg => {
                const client = getClient(cfg.envPrefix);
                const selectCols = 'id, full_name, First_Name, Personal_Email, Lead_Classification, Lead_Classification_Reason, sequence_status, outreach_step, Email_1, Email_1_Status, Email_1_Sent_At, Email_2, Email_2_Status, Email_2_Sent_At, Voice_1_Date, Voice_1_Status, voice1_sentiment, call1_note, Voice_2_Date, Voice_2_Status, voice2_sentiment, call2_note, Email_Reply_Track, Call_Reply_Track, email_unsubscribed, personal_phone, created_at';

                // Emails sent / replies are driven by their own event timestamps
                // (Email_1_Sent_At, Email_2_Sent_At, Email_Reply_Track), which can
                // fall well outside the lead's own created_at. Fetch by those event
                // columns directly instead of created_at so a lead created weeks ago
                // with an email sent today is still counted in a 7-day range.
                // Unsubscribed is reported all-time (no reliable unsubscribe-event
                // timestamp on these tables), so it's queried separately, unscoped.
                const [rangeRes, unsubRes] = await Promise.all([
                    client
                        .from(cfg.outreachTable)
                        .select(selectCols)
                        .or(
                            `and(Email_1_Sent_At.gte.${fromIso},Email_1_Sent_At.lte.${toIso}),` +
                            `and(Email_2_Sent_At.gte.${fromIso},Email_2_Sent_At.lte.${toIso}),` +
                            `and(Email_Reply_Track.gte.${fromIso},Email_Reply_Track.lte.${toIso})`
                        ),
                    // Mirrors isTruthyText's semantics (lib/leads-utils.ts): any
                    // non-empty value other than "no"/"null" counts as unsubscribed.
                    client
                        .from(cfg.outreachTable)
                        .select('id', { count: 'exact', head: true })
                        .not('email_unsubscribed', 'is', null)
                        .not('email_unsubscribed', 'eq', '')
                        .not('email_unsubscribed', 'ilike', 'no')
                        .not('email_unsubscribed', 'ilike', 'null'),
                ]);

                if (rangeRes.error) {
                    console.error(`[email-overview:${cfg.key}] table error:`, rangeRes.error.message);
                    return { key: cfg.key, leads: [] as ReturnType<typeof normalizeLeads>, unsubscribedAllTime: 0 };
                }
                if (unsubRes.error) {
                    console.error(`[email-overview:${cfg.key}] unsubscribed count error:`, unsubRes.error.message);
                }

                return {
                    key: cfg.key,
                    leads: normalizeLeads(cfg.key, rangeRes.data || []),
                    unsubscribedAllTime: unsubRes.count ?? 0,
                };
            })
        );

        const byAgent: Record<string, AgentStats> = {};
        const trendBuckets = new Map<string, { emailsSent: number; replies: number }>();

        let totalEmailsSent = 0;
        let totalReplies = 0;
        let totalUnsubscribed = 0;

        for (const { key, leads, unsubscribedAllTime } of perAgent) {
            let emailsSent = 0;
            let replies = 0;

            for (const lead of leads) {
                if (lead.email1.sentAt && inRange(lead.email1.sentAt)) {
                    emailsSent++;
                    const dayKey = String(lead.email1.sentAt).slice(0, 10);
                    const bucket = trendBuckets.get(dayKey) || { emailsSent: 0, replies: 0 };
                    bucket.emailsSent++;
                    trendBuckets.set(dayKey, bucket);
                }
                if (lead.email2.sentAt && inRange(lead.email2.sentAt)) {
                    emailsSent++;
                    const dayKey = String(lead.email2.sentAt).slice(0, 10);
                    const bucket = trendBuckets.get(dayKey) || { emailsSent: 0, replies: 0 };
                    bucket.emailsSent++;
                    trendBuckets.set(dayKey, bucket);
                }
                if (lead.emailReplied && lead.emailReplyDate && inRange(lead.emailReplyDate)) {
                    replies++;
                    const dayKey = String(lead.emailReplyDate).slice(0, 10);
                    const bucket = trendBuckets.get(dayKey) || { emailsSent: 0, replies: 0 };
                    bucket.replies++;
                    trendBuckets.set(dayKey, bucket);
                }
            }

            byAgent[key] = {
                emailsSent,
                replies,
                replyRate: emailsSent > 0 ? (replies / emailsSent) * 100 : 0,
                // Unsubscribed has no reliable per-event timestamp on these tables,
                // so it's queried and reported all-time (the UI labels it "all time").
                unsubscribed: unsubscribedAllTime,
            };

            totalEmailsSent += emailsSent;
            totalReplies += replies;
            totalUnsubscribed += unsubscribedAllTime;
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
