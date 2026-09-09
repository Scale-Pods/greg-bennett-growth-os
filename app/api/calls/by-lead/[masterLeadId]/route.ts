import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CALL_LOG_AGENTS } from '@/app/api/calls/route';
import { GET as getCallById } from '@/app/api/calls/[id]/route';

export const dynamic = 'force-dynamic';

/**
 * Public, shareable call view resolved by master_lead_id.
 *
 * master_lead_id lives on the *_outreach rows (one per lead). The call log rows
 * (vapi_call_logs_*) reference that outreach row via lead_id (= outreach.id).
 * So: master_lead_id -> outreach.id -> call log row -> call id, then we reuse the
 * existing /api/calls/[id] resolver for the full transcript/recording payload.
 *
 * Inbound calls (vapi_call_logs_inbound) have no outreach row / master_lead_id,
 * so the share link carries the call-log row id directly. When no outreach
 * mapping resolves, we fall back to treating the id as a direct call-log id.
 */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ masterLeadId: string }> }
) {
    const { masterLeadId } = await context.params;
    if (!masterLeadId) {
        return NextResponse.json({ error: 'Missing master lead id' }, { status: 400 });
    }

    for (const cfg of CALL_LOG_AGENTS) {
        if (!cfg.outreachTable) continue;
        try {
            const url = process.env[`NEXT_PUBLIC_SUPABASE_URL_${cfg.envPrefix}`];
            const serviceKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${cfg.envPrefix}`];
            const anonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${cfg.envPrefix}`];
            if (!url || !(serviceKey || anonKey)) continue;

            const client = createClient(url, (serviceKey || anonKey)!);

            const { data: outreachRows } = await client
                .from(cfg.outreachTable)
                .select('id')
                .eq('master_lead_id', masterLeadId);

            const outreachIds = (outreachRows || []).map((r: any) => String(r.id));
            if (outreachIds.length === 0) continue;

            const { data: callRows } = await client
                .from(cfg.table)
                .select('id, started_at')
                .in('lead_id', outreachIds)
                .order('started_at', { ascending: false })
                .limit(1);

            const callId = callRows?.[0]?.id;
            if (!callId) continue;

            // Reuse the existing single-call resolver (Vapi + archived logs + sentiment).
            return getCallById(_request, { params: Promise.resolve({ id: String(callId) }) });
        } catch (e) {
            // try next agent
        }
    }

    // Fallback: no outreach mapping resolved. The id may be a call-log row id
    // directly — this is how inbound calls (vapi_call_logs_inbound), which have
    // no outreach row, are shared. Check the call-log tables for a matching id.
    for (const cfg of CALL_LOG_AGENTS) {
        try {
            const url = process.env[`NEXT_PUBLIC_SUPABASE_URL_${cfg.envPrefix}`];
            const serviceKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${cfg.envPrefix}`];
            const anonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${cfg.envPrefix}`];
            if (!url || !(serviceKey || anonKey)) continue;

            const client = createClient(url, (serviceKey || anonKey)!);
            const { data: callRow } = await client
                .from(cfg.table)
                .select('id')
                .eq('id', masterLeadId)
                .maybeSingle();

            if (!callRow?.id) continue;

            return getCallById(_request, { params: Promise.resolve({ id: String(callRow.id) }) });
        } catch (e) {
            // try next table
        }
    }

    return NextResponse.json({ error: 'Call not found' }, { status: 404 });
}
