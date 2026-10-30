import { NextResponse } from 'next/server';
import { getProjectClient, PROJECT_PREFIXES } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const totals = await Promise.all(
            PROJECT_PREFIXES.map(async prefix => {
                const client = getProjectClient(prefix);
                const { data, error } = await client.rpc('get_vapi_cost');

                if (error) {
                    console.error(`[vapi-cost:${prefix}] rpc error:`, error.message);
                    return 0;
                }

                return (data && typeof data.totalUsed === 'number') ? data.totalUsed : Number(data?.totalUsed || 0);
            })
        );

        const totalUsed = totals.reduce((sum, t) => sum + t, 0);

        return NextResponse.json(
            { totalUsed },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[vapi-cost] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
