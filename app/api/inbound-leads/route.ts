import { NextResponse } from 'next/server';
import { getProjectClient } from '@/lib/supabase-projects';
import type { ProjectPrefix } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

// platinum has no raw inbound-leads table/RPC, so it is intentionally excluded.
const INBOUND_PROJECTS: ProjectPrefix[] = ['Realty', 'wealth', 'bootcamps'];

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
        const results = await Promise.all(
            INBOUND_PROJECTS.map(async envPrefix => {
                const client = getProjectClient(envPrefix);
                const { data, error } = await client.rpc('get_inbound_leads', {
                    p_from: from.toISOString(),
                    p_to: to.toISOString(),
                });

                if (error) {
                    console.error(`[inbound-leads:${envPrefix}] rpc error:`, error.message);
                    return {};
                }

                return (data && typeof data === 'object') ? data : {};
            })
        );

        const byKey = Object.assign({}, ...results);

        return NextResponse.json(byKey, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
    } catch (err: any) {
        console.error('[inbound-leads] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
