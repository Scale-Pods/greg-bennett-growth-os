import { NextResponse } from 'next/server';
import { AGENTS } from '@/lib/agents';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentParam = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    if (agentParam && agentParam !== 'all' && !AGENTS.some(a => a.key === agentParam)) {
        return NextResponse.json(
            { error: `Invalid "agent" param. Valid values: all, ${AGENTS.map(a => a.key).join(', ')}` },
            { status: 400 }
        );
    }

    try {
        const perProject = await Promise.all(
            PROJECT_PREFIXES.map(async prefix => {
                const client = getProjectClient(prefix);
                const { data, error } = await client.rpc('get_master_leads', {
                    p_from: from.toISOString(),
                    p_to: to.toISOString(),
                });

                if (error) {
                    console.error(`[leads-master:${prefix}] rpc error:`, error.message);
                    return [];
                }

                return Array.isArray(data?.leads) ? data.leads : [];
            })
        );

        let leads = perProject.flat();

        if (agentParam && agentParam !== 'all') {
            leads = leads.filter((l: any) => l.agent === agentParam);
        }

        leads.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(
            { leads },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[leads-master] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
