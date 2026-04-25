-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Helper function: get current user role
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.is_editor_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'editor') and is_active
  );
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_active);
$$;

-- ============================================================================
-- PROFILES
-- ============================================================================
alter table public.profiles enable row level security;

create policy "profiles_select_active_users"
  on public.profiles for select
  using (public.is_active_user());

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- PROJECTS
-- ============================================================================
alter table public.projects enable row level security;

create policy "projects_select_active_users"
  on public.projects for select
  using (public.is_active_user() and deleted_at is null);

create policy "projects_insert_editor"
  on public.projects for insert
  with check (public.is_editor_or_admin());

create policy "projects_update_editor"
  on public.projects for update
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

create policy "projects_delete_admin"
  on public.projects for delete
  using (public.is_admin());

-- ============================================================================
-- PROJECT MEDIA
-- ============================================================================
alter table public.project_media enable row level security;

create policy "media_select_active_users"
  on public.project_media for select
  using (public.is_active_user());

create policy "media_write_editor"
  on public.project_media for all
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

-- ============================================================================
-- PROJECT UNITS
-- ============================================================================
alter table public.project_units enable row level security;

create policy "units_select_active_users"
  on public.project_units for select
  using (public.is_active_user());

create policy "units_write_editor"
  on public.project_units for all
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

-- ============================================================================
-- MARKET LISTINGS
-- ============================================================================
alter table public.market_listings enable row level security;

create policy "listings_select_active_users"
  on public.market_listings for select
  using (public.is_active_user());

-- Writes are only via service_role (scraper), so no policy for INSERT/UPDATE
-- service_role bypasses RLS anyway

create policy "listings_delete_admin"
  on public.market_listings for delete
  using (public.is_admin());

-- ============================================================================
-- SCRAPING JOBS
-- ============================================================================
alter table public.scraping_jobs enable row level security;

create policy "jobs_select_editor"
  on public.scraping_jobs for select
  using (public.is_editor_or_admin());

create policy "jobs_insert_editor"
  on public.scraping_jobs for insert
  with check (public.is_editor_or_admin());

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create buckets (run separately if not using migrations for storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-media', 'project-media', true, 52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4'])
on conflict (id) do nothing;

-- Storage policies
create policy "project_media_read_public"
  on storage.objects for select
  using (bucket_id = 'project-media');

create policy "project_media_upload_editor"
  on storage.objects for insert
  with check (
    bucket_id = 'project-media'
    and public.is_editor_or_admin()
  );

create policy "project_media_update_editor"
  on storage.objects for update
  using (
    bucket_id = 'project-media'
    and public.is_editor_or_admin()
  );

create policy "project_media_delete_editor"
  on storage.objects for delete
  using (
    bucket_id = 'project-media'
    and public.is_editor_or_admin()
  );
