import { NextRequest, NextResponse } from 'next/server';
import { CALL_LOG_AGENTS } from '@/app/api/calls/route';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';
import { GET as getCallById } from '@/app/api/calls/[id]/route';

export const dynamic = 'force-dynamic';

/**
 * Public, shareable call view resolved by master_lead_id.
 *
 * get_call_by_master_lead(masterLeadId, agent) requires knowing the agent
 * ahead of time (it's not master-lead-id-ambiguous within a project's
 * multi-business RPCs), so we try it across all plausible (project, agent)
 * pairs in parallel and take the first non-null result, then delegate to the
 * existing /api/calls/[id] resolver for the full transcript/recording payload.
 *
 * Inbound calls (vapi_call_logs_inbound) have no outreach row / master_lead_id,
 * so the share link carries the call-log row id directly. When no
 * master-lead match resolves, we fall back to treating the id as a direct
 * call-log row id via get_call_by_id across all 4 projects.
 */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ masterLeadId: string }> }
) {
    const { masterLeadId } = await context.params;
    if (!masterLeadId) {
        return NextResponse.json({ error: 'Missing master lead id' }, { status: 400 });
    }

    // Try get_call_by_master_lead across all 8 agents (their respective projects) in parallel.
    const agentsWithOutreach = CALL_LOG_AGENTS.filter(a => a.outreachTable);
    try {
        const results = await Promise.all(
            agentsWithOutreach.map(async cfg => {
                try {
                    const client = getProjectClient(cfg.envPrefix);
                    const { data, error } = await client.rpc('get_call_by_master_lead', {
                        p_master_lead_id: masterLeadId,
                        p_agent: cfg.key,
                    });
                    if (error || !data) return null;
                    return data;
                } catch (e) {
                    return null;
                }
            })
        );

        const match = results.find(r => r != null);
        if (match?.id) {
            return getCallById(_request, { params: Promise.resolve({ id: String(match.id) }) });
        }
    } catch (e) {
        // fall through to fallback
    }

    // Fallback: no master-lead mapping resolved. The id may be a call-log row id
    // directly — this is how inbound calls (vapi_call_logs_inbound), which have
    // no outreach row, are shared. Check get_call_by_id across all 4 projects.
    try {
        const results = await Promise.all(
            PROJECT_PREFIXES.map(async prefix => {
                try {
                    const client = getProjectClient(prefix);
                    const { data, error } = await client.rpc('get_call_by_id', { p_id: masterLeadId });
                    if (error || !data) return null;
                    return data;
                } catch (e) {
                    return null;
                }
            })
        );

        const call = results.find(r => r != null);
        if (call?.id) {
            return getCallById(_request, { params: Promise.resolve({ id: String(call.id) }) });
        }
    } catch (e) {
        // fall through to not-found
    }

    return NextResponse.json({ error: 'Call not found' }, { status: 404 });
}
