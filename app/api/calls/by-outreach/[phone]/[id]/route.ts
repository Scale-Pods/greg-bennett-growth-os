import { NextRequest, NextResponse } from 'next/server';
import { CALL_LOG_AGENTS } from '@/app/api/calls/route';
import { getProjectClient } from '@/lib/supabase-projects';
import { buildVoiceSlots } from '@/lib/voice-slots';

export const dynamic = 'force-dynamic';

function resolveName(row: any): string {
    return row.full_name || [row.First_Name, row.Last_Name].filter(Boolean).join(' ') || 'Guest';
}

/**
 * Public, shareable call view resolved directly from the agent's outreach
 * table row (by its own primary key `id`), not from a VAPI call id or a
 * vapi_call_logs row. The old /call/[id] -> by-lead -> master_lead_id chain
 * depended on a call-log/VAPI record surviving; those get pruned over time,
 * which broke old share links. The outreach row itself (and its
 * call1_note..call10_note / call_recording columns, written by the sentiment
 * workflows) never gets deleted, so this is stable long-term.
 *
 * `phone` in the URL is kept for human-readable/share-friendly links but is
 * not required for the lookup - the outreach row's `id` is already a unique
 * primary key within its table, and ids don't collide across agents' tables.
 */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ phone: string; id: string }> }
) {
    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const agentsWithOutreach = CALL_LOG_AGENTS.filter(a => a.outreachTable);

    try {
        const results = await Promise.all(
            agentsWithOutreach.map(async cfg => {
                try {
                    const client = getProjectClient(cfg.envPrefix);
                    const { data, error } = await client
                        .from(cfg.outreachTable!)
                        .select('*')
                        .eq('id', id)
                        .maybeSingle();
                    if (error || !data) return null;
                    return { row: data, cfg };
                } catch {
                    return null;
                }
            })
        );

        const match = results.find(r => r != null);
        if (!match) {
            return NextResponse.json({ error: 'Call not found' }, { status: 404 });
        }

        const { row, cfg } = match;
        const voiceSlots = buildVoiceSlots(row);
        const latest = voiceSlots[voiceSlots.length - 1] ?? null;
        const findSlot = (n: number) => voiceSlots.find(s => s.slot === n) ?? null;

        const transcript = voiceSlots.map(s => ({
            role: 'assistant',
            message: `Call ${s.slot} (${s.sentiment || 'n/a'}): ${s.note || ''}`,
        }));

        return NextResponse.json({
            id: row.id,
            agent: cfg.key,
            source: 'outreach',
            isInbound: false,
            type: 'Outbound',
            name: resolveName(row),
            phone: row.personal_phone || null,
            customer_number: row.personal_phone || null,
            startedAt: latest?.date || row.created_at || null,
            durationSeconds: 0,
            audio_url: row.call_recording || null,
            recordingUrl: row.call_recording || null,
            note: latest?.note || null,
            masterLeadId: row.master_lead_id || null,
            outreachId: row.id,
            personal_phone: row.personal_phone || null,
            voiceSlots,
            voice1Sentiment: findSlot(1)?.sentiment ?? null,
            call1Note: findSlot(1)?.note ?? null,
            voice2Sentiment: findSlot(2)?.sentiment ?? null,
            call2Note: findSlot(2)?.note ?? null,
            transcript,
        }, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to fetch call', detail: err?.message }, { status: 500 });
    }
}
