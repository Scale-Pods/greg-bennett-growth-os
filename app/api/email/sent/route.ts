import { NextResponse } from 'next/server';
import { AGENTS } from '@/lib/agents';
import { getProjectClient } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

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

    try {
        const client = getProjectClient(cfg.envPrefix);
        const { data, error } = await client.rpc('get_email_sent', {
            p_from: from.toISOString(),
            p_to: to.toISOString(),
        });

        if (error) {
            console.error(`[email-sent:${cfg.key}] rpc error:`, error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        // Realty's RPC returns a flat { agent, sentEmails } shape (single business
        // per project); the other 3 projects return a keyed object per business,
        // e.g. { investor: {...}, coaching: {...} } or { biglife: {...} }.
        const payload = data && typeof data === 'object' && !Array.isArray(data) && 'sentEmails' in data
            ? data
            : (data?.[cfg.key] ?? { agent: cfg.key, sentEmails: [] });

        return NextResponse.json(
            { agent: cfg.key, sentEmails: payload.sentEmails ?? [] },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error(`[email-sent:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
