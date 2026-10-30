import { NextResponse } from 'next/server';
import { PROJECT_PREFIXES, getProjectClient } from '@/lib/supabase-projects';
import { sanitizeEmailHtml } from '@/lib/email-sanitize';

export const dynamic = 'force-dynamic';

/**
 * Public, shareable single-reply view resolved by a token that is either the
 * reply's message_id (preferred — guaranteed unique per row) or its
 * thread_id (fallback — some callers, like the n8n classification workflow,
 * only have the thread id on hand; when a thread has multiple replies the
 * most recent one is returned).
 *
 * The token alone doesn't say which project's replies table the reply lives
 * in, so each of the 4 projects' get_email_reply_by_token RPC is tried in
 * turn (each RPC already internally covers whichever of its own businesses
 * has a replies table) until one returns a non-null result.
 */
export async function GET(
    _request: Request,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params;
    if (!token) {
        return NextResponse.json({ error: 'Missing reply id' }, { status: 400 });
    }

    for (const prefix of PROJECT_PREFIXES) {
        try {
            const client = getProjectClient(prefix);
            const { data, error } = await client.rpc('get_email_reply_by_token', { p_token: token });

            if (error) {
                console.error(`[email-reply-by-id:${prefix}] rpc error:`, error.message);
                continue;
            }

            if (!data) continue;

            const reply = { ...data, emailBodySent: sanitizeEmailHtml((data as any).emailBodySent) };

            return NextResponse.json(
                { reply },
                { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
            );
        } catch (err) {
            // try next project
        }
    }

    return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
}
