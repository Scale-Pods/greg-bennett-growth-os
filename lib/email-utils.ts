export interface LeadLookup {
    id: string;
    name: string;
    email: string;
    leadClassification: string | null;
}

export interface NormalizedReply {
    messageId: string;
    agent: string;
    threadId: string | null;
    campaignId: string | null;
    senderEmailId: string | null;
    leadEmailId: string | null;
    replySubject: string | null;
    emailBodySent: string | null;
    cleanReplyText: string | null;
    replyTimestamp: string | null;
    aiInterestScore: number | null;
    sentiment: string | null;
    sentimentReason: string | null;
    createdAt: string | null;
    lead: LeadLookup | null;
}

function normalizeEmailKey(v: unknown): string {
    return String(v || '').trim().toLowerCase();
}

/** Maps raw instantly_lead_replies rows into the normalized shape, optionally
 *  joining each reply to a lead by matching lead_email_id against the given
 *  lookup map (keyed by lower/trimmed email). emailBodySent is expected to
 *  already be sanitized by the caller before this function runs. */
export function normalizeReplies(
    agent: string,
    rows: any[],
    leadsByEmail?: Map<string, LeadLookup>
): NormalizedReply[] {
    if (!Array.isArray(rows)) return [];

    return rows.map((r: any) => {
        const key = normalizeEmailKey(r.lead_email_id);
        const lead = leadsByEmail?.get(key) || null;

        return {
            messageId: String(r.message_id),
            agent,
            threadId: r.thread_id ?? null,
            campaignId: r.campaign_id ?? null,
            senderEmailId: r.sender_email_id ?? null,
            leadEmailId: r.lead_email_id ?? null,
            replySubject: r.reply_subject ?? null,
            emailBodySent: r.emailbody_sent ?? null,
            cleanReplyText: r.clean_reply_text ?? null,
            replyTimestamp: r.reply_timestamp ?? null,
            aiInterestScore: typeof r.ai_interest_score === 'number' ? r.ai_interest_score : (r.ai_interest_score ? Number(r.ai_interest_score) : null),
            sentiment: r.sentiment ?? null,
            sentimentReason: r.sentiment_reason ?? null,
            createdAt: r.created_at ?? null,
            lead,
        };
    });
}

export interface NormalizedCampaignAnalytics {
    campaignId: string;
    agent: string;
    campaignName: string | null;
    campaignStatus: string | null;
    isEvergreen: boolean;
    leadsCount: number;
    contactedCount: number;
    emailsSentCount: number;
    newLeadsContactedCount: number;
    openCount: number;
    openCountUnique: number;
    replyCount: number;
    replyCountUnique: number;
    replyCountAutomatic: number;
    replyCountAutomaticUnique: number;
    linkClickCount: number;
    linkClickCountUnique: number;
    bouncedCount: number;
    unsubscribedCount: number;
    completedCount: number;
    totalOpportunities: number;
    totalOpportunityValue: number;
    updatedAt: string | null;
    reportDate: string | null;
}

function toNum(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}

function toBool(v: unknown): boolean {
    return String(v || '').trim().toLowerCase() === 'true';
}

/** Maps raw instantly_campaign_analytics rows (every numeric-looking column is
 *  actually stored as text) into a normalized, properly-typed shape. */
export function normalizeCampaignAnalytics(agent: string, rows: any[]): NormalizedCampaignAnalytics[] {
    if (!Array.isArray(rows)) return [];

    return rows.map((r: any) => ({
        campaignId: String(r.campaign_id),
        agent,
        campaignName: r.campaign_name ?? null,
        campaignStatus: r.campaign_status ?? null,
        isEvergreen: toBool(r.campaign_is_evergreen),
        leadsCount: toNum(r.leads_count),
        contactedCount: toNum(r.contacted_count),
        emailsSentCount: toNum(r.emails_sent_count),
        newLeadsContactedCount: toNum(r.new_leads_contacted_count),
        openCount: toNum(r.open_count),
        openCountUnique: toNum(r.open_count_unique),
        replyCount: toNum(r.reply_count),
        replyCountUnique: toNum(r.reply_count_unique),
        replyCountAutomatic: toNum(r.reply_count_automatic),
        replyCountAutomaticUnique: toNum(r.reply_count_automatic_unique),
        linkClickCount: toNum(r.link_click_count),
        linkClickCountUnique: toNum(r.link_click_count_unique),
        bouncedCount: toNum(r.bounced_count),
        unsubscribedCount: toNum(r.unsubscribed_count),
        completedCount: toNum(r.completed_count),
        totalOpportunities: toNum(r.total_opportunities),
        totalOpportunityValue: toNum(r.total_opportunity_value),
        updatedAt: r.updated_at ?? null,
        reportDate: r.report_date ?? null,
    }));
}
