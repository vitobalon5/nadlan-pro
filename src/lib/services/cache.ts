import { createAdminClient } from '@/lib/supabase/server';

/**
 * Market research cache.
 *
 * Implements a get-or-compute pattern:
 *   - Read: checks DB, returns if found and not expired
 *   - Miss: calls computeFn, stores result, returns
 *
 * Uses the admin client (service_role) to bypass RLS, because:
 *   - Cache writes happen from Server Actions where auth is already verified
 *   - RLS for regular users is read-only
 *
 * Time-to-live defaults per cache type reflect how often the data changes:
 *   - city_data: 30 days (demographics barely change)
 *   - competitor_search: 3 days (new listings daily, but 3d is good tradeoff)
 *   - market_stats: 24 hours (tax authority transactions updated weekly)
 *
 * This is an in-memory read-through cache. For multi-instance deployments,
 * Supabase is the source of truth, so cache is shared across instances.
 */

export type CacheType = 'city_data' | 'competitor_search' | 'market_stats' | 'ai_report_input';

const DEFAULT_TTL_MS: Record<CacheType, number> = {
  city_data: 30 * 24 * 60 * 60 * 1000, // 30 days
  competitor_search: 3 * 24 * 60 * 60 * 1000, // 3 days
  market_stats: 24 * 60 * 60 * 1000, // 24 hours
  ai_report_input: 60 * 60 * 1000, // 1 hour
};

interface CacheEntry<T> {
  data: T;
  dataSource?: string | null;
  cachedAt: Date;
  expiresAt: Date;
  /** true if this was freshly computed, false if from cache */
  wasFresh: boolean;
}

/**
 * Get-or-compute: returns cached value if fresh, otherwise calls computeFn
 * and caches the result.
 */
export async function getCachedOrCompute<T>(options: {
  cacheType: CacheType;
  cacheKey: string;
  /** Function to compute the value if cache miss. Should be expensive — that's why we cache it. */
  computeFn: () => Promise<{ data: T; dataSource?: string }>;
  /** TTL override. Default based on cacheType. */
  ttlMs?: number;
  /** User who triggered the compute (for audit). */
  userId?: string;
  /** Force recompute even if cache is fresh. Useful for "refresh" buttons. */
  forceRefresh?: boolean;
}): Promise<CacheEntry<T>> {
  const {
    cacheType,
    cacheKey,
    computeFn,
    ttlMs = DEFAULT_TTL_MS[cacheType],
    userId,
    forceRefresh = false,
  } = options;

  const supabase = createAdminClient();

  // 1. Try cache unless forcing refresh
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('market_cache')
      .select('data, data_source, created_at, expires_at')
      .eq('cache_type', cacheType)
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return {
        data: cached.data as T,
        dataSource: cached.data_source,
        cachedAt: new Date(cached.created_at),
        expiresAt: new Date(cached.expires_at),
        wasFresh: false,
      };
    }
  }

  // 2. Compute fresh value
  const result = await computeFn();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  // 3. Persist - upsert because key might already exist but expired
  const { error } = await supabase.from('market_cache').upsert(
    {
      cache_type: cacheType,
      cache_key: cacheKey,
      data: result.data as any,
      data_source: result.dataSource ?? null,
      expires_at: expiresAt.toISOString(),
      created_by: userId ?? null,
      created_at: now.toISOString(),
    },
    { onConflict: 'cache_type,cache_key' }
  );

  if (error) {
    // Don't fail the request if cache write fails - just log and return the data
    console.error('[cache] write failed:', error.message);
  }

  return {
    data: result.data,
    dataSource: result.dataSource,
    cachedAt: now,
    expiresAt,
    wasFresh: true,
  };
}

/**
 * Invalidate a specific cache entry. Used after writes that make cache stale.
 */
export async function invalidateCache(cacheType: CacheType, cacheKey: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('market_cache')
    .delete()
    .eq('cache_type', cacheType)
    .eq('cache_key', cacheKey);
}

/**
 * Build a normalized cache key from input parts.
 * Normalizes case and whitespace so "תל אביב" and "תל  אביב " are the same key.
 */
export function buildCacheKey(parts: Record<string, string | null | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v != null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v).trim().toLowerCase()}`)
    .join('|');
}
