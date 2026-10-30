import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type ProjectPrefix = 'Realty' | 'platinum' | 'wealth' | 'bootcamps';

const clientCache = new Map<ProjectPrefix, SupabaseClient>();

/** Returns a cached Supabase client for one of the 4 project envPrefixes
 *  (Realty, platinum, wealth, bootcamps). Used to call that project's RPCs
 *  via client.rpc('fn_name', params). */
export function getProjectClient(envPrefix: ProjectPrefix): SupabaseClient {
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

export const PROJECT_PREFIXES: ProjectPrefix[] = ['Realty', 'platinum', 'wealth', 'bootcamps'];
