import { NextResponse } from 'next/server';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

interface AgentMetrics {
    key: string;
    totalLeads: number;
    emailsSent: number;
    voiceCalls: number;
    emailReplies: number;
    callReplies: number;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    try {
        const perProject = await Promise.all(
            PROJECT_PREFIXES.map(async prefix => {
                const client = getProjectClient(prefix);
                const { data, error } = await client.rpc('get_agent_metrics', {
                    p_from: from.toISOString(),
                    p_to: to.toISOString(),
                });

                if (error) {
                    console.error(`[agent-metrics:${prefix}] rpc error:`, error.message);
                    return {} as Record<string, AgentMetrics>;
                }

                return (data || {}) as Record<string, AgentMetrics>;
            })
        );

        const byKey: Record<string, AgentMetrics> = {};
        for (const projectResult of perProject) {
            for (const [key, metrics] of Object.entries(projectResult)) {
                byKey[key] = metrics;
            }
        }

        return NextResponse.json(byKey, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error('[agent-metrics] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
