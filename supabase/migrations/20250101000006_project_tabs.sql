-- ============================================================================
-- Custom Project Tabs
-- ============================================================================

create table public.project_tabs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.project_tab_files (
  id           uuid primary key default gen_random_uuid(),
  tab_id       uuid not null references public.project_tabs(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  name         text not null,
  file_path    text not null,
  file_size    bigint not null,
  mime_type    text not null,
  uploaded_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.project_tabs enable row level security;

create policy "tabs_select_active_users"
  on public.project_tabs for select
  using (public.is_active_user());

create policy "tabs_write_editor"
  on public.project_tabs for all
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

alter table public.project_tab_files enable row level security;

create policy "tab_files_select_active_users"
  on public.project_tab_files for select
  using (public.is_active_user());

create policy "tab_files_write_editor"
  on public.project_tab_files for all
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

-- ============================================================================
-- Storage bucket for tab file uploads
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-tab-files',
  'project-tab-files',
  false,
  104857600,
  null
)
on conflict (id) do nothing;

create policy "tab_files_read_active_users"
  on storage.objects for select
  using (bucket_id = 'project-tab-files' and public.is_active_user());

create policy "tab_files_upload_editor"
  on storage.objects for insert
  with check (bucket_id = 'project-tab-files' and public.is_editor_or_admin());

create policy "tab_files_delete_editor"
  on storage.objects for delete
  using (bucket_id = 'project-tab-files' and public.is_editor_or_admin());
