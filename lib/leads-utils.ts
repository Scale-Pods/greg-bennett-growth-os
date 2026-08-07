export interface NormalizedMasterLead {
    id: string;
    agent: string;
    name: string;
    phone: string;
    email: string;
    leadClassification: string | null;
    leadClassificationReason: string | null;
    syncedToOutreach: boolean;
    createdAt: string;
}

/** Maps a raw row from any of the 6 *_master_leads tables (same column shape
 *  across all of them, per supabase.md) into a normalized shape. */
export function normalizeMasterLeads(agent: string, rows: any[]): NormalizedMasterLead[] {
    if (!Array.isArray(rows)) return [];

    return rows.map((r: any) => ({
        id: String(r.id),
        agent,
        name: r.full_name || r.first_name || 'Unknown',
        phone: r.personal_phone || '',
        email: r.personal_email || '',
        leadClassification: r.lead_classification || null,
        leadClassificationReason: r.lead_classification_reason || null,
        syncedToOutreach: !!r.synced_to_outreach,
        createdAt: r.created_at || new Date().toISOString(),
    }));
}

export interface NormalizedLead {
    id: string;
    agent: string;
    name: string;
    phone: string;
    email: string;
    leadClassification: string | null;
    leadClassificationReason: string | null;
    sequenceStatus: string;
    outreachStep: number;
    email1: { body: string | null; status: string | null; sentAt: string | null };
    email2: { body: string | null; status: string | null; sentAt: string | null };
    voice1: { date: string | null; status: string | null; sentiment: string | null; note: string | null };
    voice2: { date: string | null; status: string | null; sentiment: string | null; note: string | null };
    emailReplied: boolean;
    emailReplyDate: string | null;
    callReplied: boolean;
    callReplyDate: string | null;
    emailUnsubscribed: boolean;
    emailBounced: boolean;
    createdAt: string;
}

/** Extracts the first parseable ISO-ish date found in a text field. Handles
 *  plain ISO strings ("2026-07-28T07:32:21.000-04:00") as well as
 *  "Yes 2026-08-06T02:16:31.204-04:00" style reply-track values. */
export function extractDate(value: unknown): Date | null {
    if (!value) return null;
    const str = String(value).trim();
    if (!str) return null;

    const isoMatch = str.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)?/);
    const candidate = isoMatch ? isoMatch[0] : str;

    const d = new Date(candidate);
    return isNaN(d.getTime()) ? null : d;
}

function isTruthyText(v: unknown): boolean {
    if (v === null || v === undefined) return false;
    const s = String(v).trim();
    return s !== '' && s.toLowerCase() !== 'no' && s.toLowerCase() !== 'null';
}

/** Maps a raw row from any of the 6 outreach tables (same column shape across
 *  all of them, per supabase.md) into the app's normalized lead shape. */
export function normalizeLeads(agent: string, rows: any[]): NormalizedLead[] {
    if (!Array.isArray(rows)) return [];

    return rows.map((r: any) => {
        const emailReplyDate = extractDate(r.Email_Reply_Track);
        const callReplyDate = extractDate(r.Call_Reply_Track);

        return {
            id: String(r.id),
            agent,
            name: r.full_name || r.First_Name || 'Unknown',
            phone: r.personal_phone || '',
            email: r.Personal_Email || '',
            leadClassification: r.Lead_Classification || null,
            leadClassificationReason: r.Lead_Classification_Reason || null,
            sequenceStatus: r.sequence_status || 'active',
            outreachStep: typeof r.outreach_step === 'number' ? r.outreach_step : 0,
            email1: {
                body: r.Email_1 ?? null,
                status: r.Email_1_Status ?? null,
                sentAt: r.Email_1_Sent_At ?? null,
            },
            email2: {
                body: r.Email_2 ?? null,
                status: r.Email_2_Status ?? null,
                sentAt: r.Email_2_Sent_At ?? null,
            },
            voice1: {
                date: r.Voice_1_Date ?? null,
                status: r.Voice_1_Status ?? null,
                sentiment: r.voice1_sentiment ?? null,
                note: r.call1_note ?? null,
            },
            voice2: {
                date: r.Voice_2_Date ?? null,
                status: r.Voice_2_Status ?? null,
                sentiment: r.voice2_sentiment ?? null,
                note: r.call2_note ?? null,
            },
            emailReplied: isTruthyText(r.Email_Reply_Track),
            emailReplyDate: emailReplyDate ? emailReplyDate.toISOString() : null,
            callReplied: isTruthyText(r.Call_Reply_Track),
            callReplyDate: callReplyDate ? callReplyDate.toISOString() : null,
            emailUnsubscribed: isTruthyText(r.email_unsubscribed),
            emailBounced: isTruthyText(r.email_bounced),
            createdAt: r.created_at || new Date().toISOString(),
        };
    });
}
