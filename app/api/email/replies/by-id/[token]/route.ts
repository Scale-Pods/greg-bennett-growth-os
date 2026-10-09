import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AGENTS } from '@/lib/agents';
import { normalizeReplies, LeadLookup } from '@/lib/email-utils';
import { sanitizeEmailHtml } from '@/lib/email-sanitize';

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

function normalizeEmailKey(v: unknown): string {
    return String(v || '').trim().toLowerCase();
}

/**
 * Public, shareable single-reply view resolved by a token that is either the
 * reply's message_id (preferred — guaranteed unique per row) or its
 * thread_id (fallback — some callers, like the n8n classification workflow,
 * only have the thread id on hand; when a thread has multiple replies the
 * most recent one is returned).
 *
 * The token alone doesn't say which agent's table the reply lives in, so
 * every agent's repliesTable is tried in turn until one matches.
 */
export async function GET(
    _request: Request,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params;
    if (!token) {
        return NextResponse.json({ error: 'Missing reply id' }, { status: 400 });
    }

    for (const cfg of AGENTS) {
        try {
            const client = getClient(cfg.envPrefix);

            // Try message_id first (exact, unique match).
            let { data: row } = await client
                .from(cfg.repliesTable)
                .select('*')
                .eq('message_id', token)
                .maybeSingle();

            // Fall back to thread_id (most recent reply on that thread).
            if (!row) {
                const { data: byThread } = await client
                    .from(cfg.repliesTable)
                    .select('*')
                    .eq('thread_id', token)
                    .order('reply_timestamp', { ascending: false })
                    .limit(1);
                row = byThread?.[0] ?? null;
            }

            if (!row) continue;

            const leadsByEmail = new Map<string, LeadLookup>();
            if (row.lead_email_id) {
                const { data: leadRows } = await client
                    .from(cfg.outreachTable)
                    .select('id, full_name, First_Name, Personal_Email, Lead_Classification')
                    .ilike('Personal_Email', row.lead_email_id);

                for (const leadRow of leadRows || []) {
                    const email = leadRow.Personal_Email;
                    if (!email) continue;
                    leadsByEmail.set(normalizeEmailKey(email), {
                        id: String(leadRow.id),
                        name: leadRow.full_name || leadRow.First_Name || 'Unknown',
                        email,
                        leadClassification: leadRow.Lead_Classification || null,
                    });
                }
            }

            const sanitizedRow = { ...row, emailbody_sent: sanitizeEmailHtml(row.emailbody_sent) };
            const [reply] = normalizeReplies(cfg.key, [sanitizedRow], leadsByEmail);

            return NextResponse.json(
                { reply },
                { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
            );
        } catch (err) {
            // try next agent's table
        }
    }

    return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
}
