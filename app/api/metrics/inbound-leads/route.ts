import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseWealth = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL_wealth!,
            process.env.SUPABASE_SERVICE_ROLE_KEY_wealth! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_wealth!
        );

        const supabaseRealty = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL_Realty!,
            process.env.SUPABASE_SERVICE_ROLE_KEY_Realty! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_Realty!
        );

        const supabaseBootcamps = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL_bootcamps!,
            process.env.SUPABASE_SERVICE_ROLE_KEY_bootcamps! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_bootcamps!
        );

        const [wealthRes, realtyRes, bootcampsRes] = await Promise.all([
            supabaseWealth.from('bennett_wealth_inbound_leads').select('id', { count: 'exact' }),
            supabaseRealty.from('bennett_realty_inbound_leads').select('id', { count: 'exact' }),
            supabaseBootcamps.from('bennett_bootcamps_inbound_leads').select('id', { count: 'exact' }),
        ]);

        return NextResponse.json({
            wealthCount: wealthRes.count || 0,
            realtyCount: realtyRes.count || 0,
            bootcampsCount: bootcampsRes.count || 0,
            totalCount: (wealthRes.count || 0) + (realtyRes.count || 0) + (bootcampsRes.count || 0)
        });
    } catch (err: any) {
        console.error('[inbound-leads-metrics] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    }
}
