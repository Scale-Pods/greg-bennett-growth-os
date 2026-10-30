import { NextResponse } from 'next/server';
import { getProjectClient } from '@/lib/supabase-projects';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [realtyRes, wealthRes, bootcampsRes] = await Promise.all([
            getProjectClient('Realty').rpc('get_inbound_leads_count'),
            getProjectClient('wealth').rpc('get_inbound_leads_count'),
            getProjectClient('bootcamps').rpc('get_inbound_leads_count'),
        ]);

        if (realtyRes.error) console.error('[inbound-leads-metrics:realty] rpc error:', realtyRes.error.message);
        if (wealthRes.error) console.error('[inbound-leads-metrics:wealth] rpc error:', wealthRes.error.message);
        if (bootcampsRes.error) console.error('[inbound-leads-metrics:bootcamps] rpc error:', bootcampsRes.error.message);

        const realtyCount = realtyRes.data?.realtyCount ?? 0;
        const wealthCount = wealthRes.data?.wealthCount ?? 0;
        const bootcampsCount = bootcampsRes.data?.bootcampsCount ?? 0;

        return NextResponse.json({
            wealthCount,
            realtyCount,
            bootcampsCount,
            totalCount: wealthCount + realtyCount + bootcampsCount,
        });
    } catch (err: any) {
        console.error('[inbound-leads-metrics] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    }
}
