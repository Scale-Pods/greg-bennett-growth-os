import { NextResponse } from 'next/server';
import { getProjectClient } from '@/lib/supabase-projects';
import { getAgent, AGENTS } from '@/lib/agents';
import { extractDate } from '@/lib/leads-utils';

export const dynamic = 'force-dynamic';

// Re-exported so existing importers (e.g. metrics/voice's OUTREACH_AGENTS)
// keep working against the single source of truth in lib/agents.ts, now
// covering all 8 businesses instead of the old hardcoded 7-entry list.
export { AGENTS };

function isTruthyText(v: unknown): boolean {
    if (v === null || v === undefined) return false;
    const s = String(v).trim();
    return s !== '' && s.toLowerCase() !== 'no' && s.toLowerCase() !== 'null';
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const cfg = agentKey ? getAgent(agentKey) : undefined;
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

        // Realty's get_leads(from, to) takes no agent param (single-agent
        // project); the other 3 projects' get_leads(from, to, agent) require it.
        const rpcParams: Record<string, string> =
            cfg.envPrefix === 'Realty'
                ? { p_from: from.toISOString(), p_to: to.toISOString() }
                : { p_from: from.toISOString(), p_to: to.toISOString(), p_agent: cfg.rpcAgentKey };

        const { data, error } = await client.rpc('get_leads', rpcParams);

        if (error) {
            console.error(`[leads:${cfg.key}] rpc error:`, error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        const agent = data?.agent ?? cfg.key;
        const rawLeads: any[] = Array.isArray(data?.leads) ? data.leads : [];

        // The RPC returns raw emailReplyTrack/callReplyTrack text fields rather
        // than the derived emailReplied/emailReplyDate/callReplied/callReplyDate
        // booleans+dates that the frontend expects (previously computed by
        // normalizeLeads). Derive them here using the same extractDate/
        // isTruthyText logic from lib/leads-utils.ts.
        const leads = rawLeads.map((r: any) => {
            const emailReplyDate = extractDate(r.emailReplyTrack);
            const callReplyDate = extractDate(r.callReplyTrack);

            const { emailReplyTrack, callReplyTrack, ...rest } = r;

            return {
                ...rest,
                emailReplied: isTruthyText(emailReplyTrack),
                emailReplyDate: emailReplyDate ? emailReplyDate.toISOString() : null,
                callReplied: isTruthyText(callReplyTrack),
                callReplyDate: callReplyDate ? callReplyDate.toISOString() : null,
            };
        });

        return NextResponse.json(
            { agent, leads },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error(`[leads:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
