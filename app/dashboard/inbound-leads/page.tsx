import { createClient } from '@supabase/supabase-js';
import InboundLeadsClient from './inbound-leads-client';

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

export const revalidate = 0; // Fetch fresh data on every request

export default async function InboundLeadsPage() {
    // Fetch from all three databases
    const [wealthRes, realtyRes, bootcampsRes] = await Promise.all([
        supabaseWealth.from('bennett_wealth_inbound_leads').select('*').order('created_at', { ascending: false }),
        supabaseRealty.from('bennett_realty_inbound_leads').select('*').order('created_at', { ascending: false }),
        supabaseBootcamps.from('bennett_bootcamps_inbound_leads').select('*').order('created_at', { ascending: false }),
    ]);

    return (
        <div className="p-6 h-full">
            <InboundLeadsClient 
                wealthLeads={wealthRes.data || []}
                realtyLeads={realtyRes.data || []}
                bootcampsLeads={bootcampsRes.data || []}
            />
        </div>
    );
}
