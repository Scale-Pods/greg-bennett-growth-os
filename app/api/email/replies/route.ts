import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agents';
import { getProjectClient } from '@/lib/supabase-projects';
import { sanitizeEmailHtml } from '@/lib/email-sanitize';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const cfg = getAgent(agentKey || '');
    if (!cfg) {
        return NextResponse.json(
            { error: `Invalid or missing "agent" param.` },
            { status: 400 }
        );
    }

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    // Businesses with no Instantly replies table by design (e.g. bigLifeNewCampaign,
    // homeSeller, bootcampsNewLeads) simply have no reply data -- return an empty
    // list rather than calling a nonexistent RPC path for them.
    if (cfg.repliesTable === null) {
        return NextResponse.json(
            { agent: cfg.key, replies: [] },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    }

    try {
        const client = getProjectClient(cfg.envPrefix);
        const { data, error } = await client.rpc('get_email_replies', {
            p_from: from.toISOString(),
            p_to: to.toISOString(),
        });

        if (error) {
            console.error(`[email-replies:${cfg.key}] rpc error:`, error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        const allReplies = Array.isArray(data) ? data : [];
        const replies = allReplies
            .filter((r: any) => r.agent === cfg.key)
            .map((r: any) => ({ ...r, emailBodySent: sanitizeEmailHtml(r.emailBodySent) }));

        return NextResponse.json(
            { agent: cfg.key, replies },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error(`[email-replies:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
