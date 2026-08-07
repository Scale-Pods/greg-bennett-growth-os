import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAgent } from '@/lib/agents';
import { normalizeReplies, LeadLookup } from '@/lib/email-utils';
import { sanitizeEmailHtml } from '@/lib/email-sanitize';

export const dynamic = 'force-dynamic';

const clientCache = new Map<string, SupabaseClient>();

function getClient(envPrefix: string): SupabaseClient {
    const cached = clientCache.get(envPrefix);
    if (cached) return cached;

    const url = process.env[`NEXT_PUBLIC_SUPABASE_URL_${envPrefix}`];
    const serviceKey = process.env[`SUPABASE_SERVICE_ROLE_KEY_${envPrefix}`];
    const anonKey = process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${envPrefix}`];

    if (!url || !(serviceKey || anonKey)) {
        throw new Error(`Missing Supabase env vars for prefix "${envPrefix}"`);
    }

    const client = createClient(url, (serviceKey || anonKey)!);
    clientCache.set(envPrefix, client);
    return client;
}

function normalizeEmailKey(v: unknown): string {
    return String(v || '').trim().toLowerCase();
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const agentKey = searchParams.get('agent');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const cfg = getAgent(agentKey || '');
    if (!cfg) {
        return NextResponse.json(
            { error: `Invalid or missing "agent" param.` },
            { status: 400 }
        );
    }

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 7 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    try {
        const client = getClient(cfg.envPrefix);

        const [repliesRes, leadsRes] = await Promise.all([
            client
                .from(cfg.repliesTable)
                .select('*')
                .gte('reply_timestamp', from.toISOString())
                .lte('reply_timestamp', to.toISOString())
                .order('reply_timestamp', { ascending: false }),
            client
                .from(cfg.outreachTable)
                .select('id, full_name, First_Name, Personal_Email, Lead_Classification'),
        ]);

        if (repliesRes.error) {
            console.error(`[email-replies:${cfg.key}] replies table error:`, repliesRes.error.message);
            return NextResponse.json({ error: 'Query failed', detail: repliesRes.error.message }, { status: 502 });
        }
        if (leadsRes.error) {
            console.error(`[email-replies:${cfg.key}] outreach table error:`, leadsRes.error.message);
        }

        const leadsByEmail = new Map<string, LeadLookup>();
        for (const row of leadsRes.data || []) {
            const email = row.Personal_Email;
            if (!email) continue;
            leadsByEmail.set(normalizeEmailKey(email), {
                id: String(row.id),
                name: row.full_name || row.First_Name || 'Unknown',
                email,
                leadClassification: row.Lead_Classification || null,
            });
        }

        const sanitizedRows = (repliesRes.data || []).map((r: any) => ({
            ...r,
            emailbody_sent: sanitizeEmailHtml(r.emailbody_sent),
        }));

        const replies = normalizeReplies(cfg.key, sanitizedRows, leadsByEmail);

        return NextResponse.json(
            { agent: cfg.key, replies },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error(`[email-replies:${cfg.key}] fetch error:`, err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
