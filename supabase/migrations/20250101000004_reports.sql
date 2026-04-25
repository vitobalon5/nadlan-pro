-- ============================================================================
-- Migration 004: AI Market Reports
-- ============================================================================
-- Stores AI-generated market analysis reports per project, with edit history
-- ============================================================================

create type report_type as enum (
  'market_analysis',
  'competitor_analysis',
  'pricing_strategy',
  'general'
);

create type report_status as enum (
  'draft',
  'published',
  'archived'
);

create table if not exists public.project_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  report_type report_type not null default 'market_analysis',
  status report_status not null default 'draft',

  -- Content
  title text not null,
  /** HTML content from the editor (sanitized on write). */
  content_html text not null,
  /** Plain-text snapshot of the AI output before user edits. Immutable. */
  ai_original_text text,

  -- Model metadata
  model_name text,
  prompt_token_count integer,
  completion_token_count integer,

  -- The input data used - snapshot so we can trace what the AI saw
  input_snapshot jsonb,

  -- Audit
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reports_project on public.project_reports(project_id);
create index idx_reports_type on public.project_reports(report_type);
create index idx_reports_created_at on public.project_reports(created_at desc);

-- RLS - same policy as projects: viewers can read, editors/admins can write
alter table public.project_reports enable row level security;

create policy "reports_select_active_users"
  on public.project_reports for select
  using (public.is_active_user());

create policy "reports_write_editor"
  on public.project_reports for all
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

-- Trigger to update updated_at
create trigger trg_reports_updated_at
  before update on public.project_reports
  for each row execute function public.set_updated_at();
