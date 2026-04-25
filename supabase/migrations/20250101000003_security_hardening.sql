-- ============================================================================
-- Migration 003: Hardening security and data integrity
-- ============================================================================
-- Fixes identified in self-audit:
--   1. profiles_update_self could allow role escalation
--   2. Missing DB-level check constraints on prices, dates, areas
--   3. No column-level protection on role changes
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fix 1: profiles_update_self - prevent role escalation properly
-- ---------------------------------------------------------------------------
-- The original policy had a SELECT inside WITH CHECK that could be cached
-- by Postgres, allowing role escalation in edge cases. We fix this by:
--   a) Dropping the flawed policy
--   b) Creating a BEFORE UPDATE trigger that blocks role changes for non-admins
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_update_self_non_role_fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger that prevents role/is_active changes unless by an admin
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role user_role;
begin
  -- Always allow if caller is service_role (bypasses RLS anyway, but we're defensive)
  if current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' then
    return new;
  end if;

  select role into caller_role from public.profiles where id = auth.uid();

  -- Non-admins cannot change role or is_active on ANY row
  if caller_role is distinct from 'admin' then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change user roles' using errcode = '42501';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Only admins can change user active status' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------------------------------------------------------------------------
-- Fix 2: DB-level check constraints for data integrity
-- ---------------------------------------------------------------------------
-- Even if application code fails or a scraper writes bad data, Postgres refuses.
-- ---------------------------------------------------------------------------

alter table public.projects
  add constraint projects_price_range_check
    check (price_min is null or price_max is null or price_min <= price_max);

alter table public.projects
  add constraint projects_date_range_check
    check (
      construction_start_date is null
      or expected_completion_date is null
      or construction_start_date <= expected_completion_date
    );

alter table public.projects
  add constraint projects_units_positive
    check (total_units is null or total_units > 0);

alter table public.projects
  add constraint projects_floors_positive
    check (floors is null or floors > 0);

alter table public.project_units
  add constraint units_area_positive
    check (area_sqm is null or area_sqm > 0);

alter table public.project_units
  add constraint units_rooms_reasonable
    check (rooms is null or (rooms > 0 and rooms <= 30));

alter table public.project_units
  add constraint units_price_positive
    check (price is null or price > 0);

alter table public.market_listings
  add constraint listings_price_positive
    check (price is null or price > 0);

alter table public.market_listings
  add constraint listings_area_positive
    check (area_sqm is null or area_sqm > 0);

alter table public.market_listings
  add constraint listings_rooms_reasonable
    check (rooms is null or (rooms > 0 and rooms <= 30));

-- ---------------------------------------------------------------------------
-- Fix 3: Cover image URL consistency
-- ---------------------------------------------------------------------------
-- Only one media item per project can be is_cover = true
-- ---------------------------------------------------------------------------

create unique index if not exists idx_project_media_single_cover
  on public.project_media(project_id) where is_cover = true;

-- ---------------------------------------------------------------------------
-- Fix 4: Cleanup function for orphaned storage objects
-- ---------------------------------------------------------------------------
-- When a project is hard-deleted or soft-deleted past 30 days,
-- its storage objects should be cleaned up.
-- Call this from a scheduled job.
-- ---------------------------------------------------------------------------

create or replace function public.list_orphaned_media_paths(grace_days int default 30)
returns table(storage_path text, project_id uuid, deleted_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select pm.storage_path, pm.project_id, p.deleted_at
  from public.project_media pm
  join public.projects p on p.id = pm.project_id
  where p.deleted_at is not null
    and p.deleted_at < now() - (grace_days || ' days')::interval;
$$;

-- ---------------------------------------------------------------------------
-- Fix 5: Index for analytics queries (missed in initial schema)
-- ---------------------------------------------------------------------------

create index if not exists idx_listings_city_date
  on public.market_listings(city, transaction_date desc) where transaction_date is not null;

create index if not exists idx_listings_price_range
  on public.market_listings(price) where price is not null;

-- ---------------------------------------------------------------------------
-- Fix 6: RLS for market_listings INSERT/UPDATE (was implicit via service_role)
-- ---------------------------------------------------------------------------
-- Make it explicit: authenticated users cannot write to market_listings.
-- Only service_role (via admin client in executor) can write.
-- ---------------------------------------------------------------------------

create policy "listings_no_insert_authenticated"
  on public.market_listings for insert
  to authenticated
  with check (false);

create policy "listings_no_update_authenticated"
  on public.market_listings for update
  to authenticated
  using (false);
