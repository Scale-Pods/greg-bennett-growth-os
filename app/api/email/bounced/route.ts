import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agents';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

// There's no bounce-event timestamp column on these tables, only the
// email_bounced flag, so this is an all-time list (no date filtering).
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agent');

    if (agentKey && agentKey !== 'all' && !getAgent(agentKey)) {
        return NextResponse.json({ error: `Invalid "agent" param.` }, { status: 400 });
    }

    try {
        const perProject = await Promise.all(
            PROJECT_PREFIXES.map(async prefix => {
                const client = getProjectClient(prefix);
                const { data, error } = await client.rpc('get_email_bounced');

                if (error) {
                    console.error(`[email-bounced:${prefix}] rpc error:`, error.message);
                    return [];
                }

                return Array.isArray(data?.leads) ? data.leads : [];
            })
        );

        let leads = perProject.flat();

        if (agentKey && agentKey !== 'all') {
            leads = leads.filter((l: any) => l.agent === agentKey);
        }

        leads.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(
            { leads },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[email-bounced] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
