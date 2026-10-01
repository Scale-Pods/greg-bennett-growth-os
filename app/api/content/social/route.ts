import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL_Realty;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_Realty;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_Realty;

    if (!url || !(serviceKey || anonKey)) {
        throw new Error('Missing Supabase env vars for prefix "Realty"');
    }

    client = createClient(url, (serviceKey || anonKey)!);
    return client;
}

export interface SocialContentItem {
    id: string;
    driveFileId: string;
    driveFileName: string | null;
    fileUrl: string | null;
    contentType: 'image' | 'video' | 'carousel';
    caption: string | null;
    hashtags: string | null;
    altText: string | null;
    captionSource: string | null;
    aiModelUsed: string | null;
    status: 'pending_approval' | 'approved' | 'rejected' | 'posted' | 'failed';
    rejectionReason: string | null;
    postToInstagram: boolean;
    postToFacebook: boolean;
    instagramPostId: string | null;
    facebookPostId: string | null;
    errorMessage: string | null;
    brand: string | null;
    targetPage: string | null;
    scheduledAt: string | null;
    createdAt: string;
    updatedAt: string;
}

function normalize(r: any): SocialContentItem {
    return {
        id: r.id,
        driveFileId: r.drive_file_id,
        driveFileName: r.drive_file_name ?? null,
        fileUrl: r.file_url ?? null,
        contentType: r.content_type,
        caption: r.caption ?? null,
        hashtags: r.hashtags ?? null,
        altText: r.alt_text ?? null,
        captionSource: r.caption_source ?? null,
        aiModelUsed: r.ai_model_used ?? null,
        status: r.status || 'pending_approval',
        rejectionReason: r.rejection_reason ?? null,
        postToInstagram: r.post_to_instagram ?? r.post_to_ig ?? true,
        postToFacebook: r.post_to_facebook ?? true,
        instagramPostId: r.instagram_post_id ?? null,
        facebookPostId: r.facebook_post_id ?? null,
        errorMessage: r.error_message ?? null,
        brand: r.brand ?? null,
        targetPage: r.target_page ?? null,
        scheduledAt: r.scheduled_at ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
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
            .from('content_queue')
            .select('*')
            .gte('created_at', from.toISOString())
            .lte('created_at', to.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[content:social] table error:', error.message);
            return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 502 });
        }

        const rows = (data || []).map(normalize);

        return NextResponse.json(
            { rows },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
    } catch (err: any) {
        console.error('[content:social] fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed', detail: err?.message }, { status: 500 });
    }
}
