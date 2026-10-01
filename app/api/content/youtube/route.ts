import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL_bootcamps;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_bootcamps;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_bootcamps;

    if (!url || !(serviceKey || anonKey)) {
        throw new Error('Missing Supabase env vars for prefix "bootcamps"');
    }

    client = createClient(url, (serviceKey || anonKey)!);
    return client;
}

export interface YoutubeApproval {
    id: string;
    token: string;
    fileId: string;
    fileName: string | null;
    aiTitle: string | null;
    aiDescription: string | null;
    aiTags: string | null;
    scheduledDateTime: string | null;
    finalTitle: string | null;
    finalDescription: string | null;
    finalScheduledDateTime: string | null;
    status: string;
    approverEmail: string | null;
    createdAt: string;
    respondedAt: string | null;
}

function normalize(r: any): YoutubeApproval {
    return {
        id: r.id,
        token: r.token,
        fileId: r.file_id,
        fileName: r.file_name ?? null,
        aiTitle: r.ai_title ?? null,
        aiDescription: r.ai_description ?? null,
        aiTags: r.ai_tags ?? null,
        scheduledDateTime: r.scheduled_date_time ?? null,
        finalTitle: r.final_title ?? null,
        finalDescription: r.final_description ?? null,
        finalScheduledDateTime: r.final_scheduled_date_time ?? null,
        status: r.status || 'pending',
        approverEmail: r.approver_email ?? null,
        createdAt: r.created_at,
        respondedAt: r.responded_at ?? null,
    };
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json({ error: 'Invalid from/to date' }, { status: 400 });
    }

    try {
        const { data, error } = await getClient()
            .from('youtube_approvals')
            .select('*')
            .gte('created_at', from.toISOString())
            .lte('created_at', to.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[content:youtube] table error:', error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        const rows = (data || []).map(normalize);

        return NextResponse.json(
            { rows },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[content:youtube] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
