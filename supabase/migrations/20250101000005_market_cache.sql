-- ============================================================================
-- Migration 005: Market research cache
-- ============================================================================
-- Caches expensive external API calls:
--   - data.gov.il CKAN (demographics, schools) — slow + unreliable
--   - Tavily/Serper competitor searches — paid per query
--   - Tax Authority transactions — already in market_listings but expensive to aggregate
--
-- Design:
--   - Keyed by (cache_type, cache_key) where cache_key is usually a hash
--     or canonical string (e.g. "city=תל אביב|neighborhood=נווה צדק")
--   - TTL enforced at read time (not via cron) to avoid stale-cleanup complexity
--   - Stored as JSONB so different cache types have different shapes
--   - created_by tracked so we can rate-limit per-user if needed
-- ============================================================================

create type cache_type as enum (
  'city_data',           -- demographics + socioeconomic + schools
  'competitor_search',   -- Tavily/Serper results for a project
  'market_stats',        -- aggregated market stats for city/neighborhood
  'ai_report_input'      -- combined input snapshot for AI report
);

create table if not exists public.market_cache (
  id uuid primary key default gen_random_uuid(),
  cache_type cache_type not null,
  cache_key text not null,
  data jsonb not null,
  /** Where the data came from - 'live' or 'estimated' (fallback) */
  data_source text,
  /** Expiration - read side filters rows where expires_at > now() */
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,

  unique(cache_type, cache_key)
);

create index idx_market_cache_type_key on public.market_cache(cache_type, cache_key);
create index idx_market_cache_expires on public.market_cache(expires_at);

-- RLS: all active users can read cache, but only service_role can write
-- (cache is populated by Server Actions using admin client)
alter table public.market_cache enable row level security;

create policy "cache_read_active_users"
  on public.market_cache for select
  using (public.is_active_user());

-- No insert/update/delete policies for regular users - only service_role writes.
-- service_role bypasses RLS by default.

-- ---------------------------------------------------------------------------
-- Helper: cleanup expired entries
-- Schedule this to run daily via pg_cron if you have it, or call manually.
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_expired_cache()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.market_cache
    where expires_at < now() - interval '7 days'  -- grace period for debugging
    returning id
  )
  select count(*)::integer from deleted;
$$;
