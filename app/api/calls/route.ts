import { NextResponse } from 'next/server';
import { getProjectClient, ProjectPrefix } from '@/lib/supabase-projects';
import { getTwilioCostLookup } from '@/lib/twilio-cost';

export const dynamic = 'force-dynamic';

interface CallLogAgentConfig {
    key: string;
    envPrefix: ProjectPrefix;
    outreachTable?: string;
}

// Mirrors the OLD voice/calls-domain agent list (used only by the calls/voice
// routes, distinct from lib/agents.ts's AGENTS list). 'inbound' has no
// outreach table. bootcampsNewLeads is ADDED here (the old list omitted it
// even though its table/outreach exist and the RPCs now support it).
export const CALL_LOG_AGENTS: CallLogAgentConfig[] = [
    { key: 'recruiting', envPrefix: 'Realty', outreachTable: 'recruiting_ai_agent_outreach' },
    { key: 'coaching', envPrefix: 'platinum', outreachTable: 'coaching_ai_agent_outreach' },
    { key: 'investor', envPrefix: 'platinum', outreachTable: 'investor_funnel_ai_agent_outreach' },
    { key: 'biglife', envPrefix: 'wealth', outreachTable: 'biglife_new_leads_outreach' },
    { key: 'bigLifeNewCampaign', envPrefix: 'wealth', outreachTable: 'big_life_new_campaign_outreach' },
    { key: 'homeSeller', envPrefix: 'wealth', outreachTable: 'home_seller_leads_outreach' },
    { key: 'bootcampsFollowup', envPrefix: 'bootcamps', outreachTable: 'bootcamps_follow_up_outreach' },
    { key: 'bootcampsNewLeads', envPrefix: 'bootcamps', outreachTable: 'bootcamps_new_leads_outreach' },
    { key: 'inbound', envPrefix: 'wealth' }, // no outreach table: inbound callers have no pre-existing lead record
];

function normalizeRpcRow(row: any, telephonyCost: number | null) {
    const agentCost = row.cost ?? 0;
    return {
        id: row.id,
        agent: row.agent,
        isInbound: row.isInbound ?? (row.agent === 'inbound'),
        startedAt: row.startedAt,
        durationSeconds: row.durationSeconds || 0,
        cost: agentCost,
        telephonyCost,
        totalCost: telephonyCost !== null ? agentCost + telephonyCost : agentCost,
        phone: row.phone || 'Unknown',
        name: row.name || 'Guest',
        status: row.status || null,
        voiceCallStatus: row.voiceCallStatus || null,
        source: row.source || null,
        summary: row.summary || null,
        recordingUrl: row.recordingUrl || null,
        note: row.note || null,
        leadId: row.leadId || null,
        masterLeadId: row.masterLeadId ?? null,
        voice1Sentiment: row.voice1Sentiment ?? null,
        call1Note: row.call1Note ?? null,
        voice2Sentiment: row.voice2Sentiment ?? null,
        call2Note: row.call2Note ?? null,
    };
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const includeTelephony = searchParams.get('includeTelephony') === 'true';

    const cfg = CALL_LOG_AGENTS.find(a => a.key === agentKey);
    if (!cfg) {
        return NextResponse.json(
            { error: `Invalid or missing "agent" param. Valid values: ${CALL_LOG_AGENTS.map(a => a.key).join(', ')}` },
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
        const [{ data, error }, telephonyLookup] = await Promise.all([
            client.rpc('get_calls', { p_from: from.toISOString(), p_to: to.toISOString() }),
            includeTelephony ? getTwilioCostLookup(from, to) : Promise.resolve(null),
        ]);

        if (error) {
            console.error(`[calls:${cfg.key}] rpc error:`, error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        // get_calls is project-scoped (returns ALL businesses in that project combined),
        // so filter down to just the rows matching the requested agent.
        const allRows: any[] = Array.isArray(data) ? data : [];
        const filtered = allRows.filter(row => row.agent === cfg.key);

        const calls = filtered.map((row: any) => {
            const telephonyCost = telephonyLookup ? telephonyLookup(row.phone, row.startedAt) : null;
            return normalizeRpcRow(row, telephonyCost);
        });

        return NextResponse.json(calls, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error(`[calls:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
