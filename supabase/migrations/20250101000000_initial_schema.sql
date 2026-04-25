-- ============================================================================
-- Real Estate Platform - Initial Schema
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES & ROLES
-- ============================================================================

create type user_role as enum ('admin', 'editor', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role user_role not null default 'viewer',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. PROJECTS (real estate developments)
-- ============================================================================

create type project_status as enum (
  'planning',
  'pre_sale',
  'under_construction',
  'completed',
  'sold_out',
  'archived'
);

create type project_type as enum (
  'residential',
  'commercial',
  'mixed_use',
  'office',
  'retail',
  'industrial'
);

create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  -- Basic info
  name text not null,
  slug text not null unique,
  description text,
  project_type project_type not null default 'residential',
  status project_status not null default 'planning',

  -- Location
  address text,
  city text not null,
  neighborhood text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  gush text,
  helka text,

  -- Developer
  developer_name text,
  developer_contact text,

  -- Pricing
  price_min numeric(14, 2),
  price_max numeric(14, 2),
  price_per_sqm_avg numeric(10, 2),
  currency text not null default 'ILS',

  -- Dates
  construction_start_date date,
  expected_completion_date date,
  actual_completion_date date,

  -- Stats
  total_units integer,
  available_units integer,
  floors integer,

  -- Metadata
  cover_image_url text,
  external_ids jsonb default '{}'::jsonb, -- { "yad2": "...", "madlan": "..." }
  tags text[] default array[]::text[],

  -- Audit
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_projects_city on public.projects(city);
create index idx_projects_status on public.projects(status);
create index idx_projects_type on public.projects(project_type);
create index idx_projects_slug on public.projects(slug);
create index idx_projects_deleted_at on public.projects(deleted_at) where deleted_at is null;
create index idx_projects_location on public.projects(latitude, longitude);

-- ============================================================================
-- 3. PROJECT MEDIA (images, renderings, floor plans, documents)
-- ============================================================================

create type media_type as enum (
  'image',
  'rendering',
  'floor_plan',
  'site_plan',
  'document',
  'video'
);

create table public.project_media (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  media_type media_type not null default 'image',
  storage_path text not null, -- path in supabase storage
  public_url text,
  file_name text not null,
  file_size_bytes bigint,
  mime_type text,
  width integer,
  height integer,
  title text,
  description text,
  display_order integer not null default 0,
  is_cover boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_project_media_project on public.project_media(project_id);
create index idx_project_media_type on public.project_media(media_type);
create index idx_project_media_order on public.project_media(project_id, display_order);

-- ============================================================================
-- 4. PROJECT UNITS (individual apartments/units within a project)
-- ============================================================================

create type unit_status as enum ('available', 'reserved', 'sold', 'unavailable');

create table public.project_units (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  unit_number text not null,
  floor integer,
  rooms numeric(3, 1), -- 3, 3.5, 4, etc.
  area_sqm numeric(8, 2),
  balcony_area_sqm numeric(8, 2),
  garden_area_sqm numeric(8, 2),
  parking_spots integer default 0,
  storage_units integer default 0,
  price numeric(14, 2),
  price_per_sqm numeric(10, 2),
  status unit_status not null default 'available',
  direction text, -- 'north', 'south', 'east', 'west', 'northeast', etc.
  floor_plan_url text,
  notes text,
  sold_at timestamptz,
  sold_price numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, unit_number)
);

create index idx_units_project on public.project_units(project_id);
create index idx_units_status on public.project_units(status);
create index idx_units_rooms on public.project_units(rooms);

-- ============================================================================
-- 5. MARKET DATA (scraped listings from Yad2, Madlan, Tax Authority)
-- ============================================================================

create type data_source as enum ('yad2', 'madlan', 'tax_authority', 'manual', 'other');
create type listing_type as enum ('sale', 'rent', 'transaction');

create table public.market_listings (
  id uuid primary key default uuid_generate_v4(),
  source data_source not null,
  source_id text not null, -- external ID from the source
  listing_type listing_type not null,

  -- Location
  city text not null,
  neighborhood text,
  street text,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  gush text,
  helka text,

  -- Property details
  property_type text, -- "דירה", "פנטהאוז", etc.
  rooms numeric(3, 1),
  area_sqm numeric(8, 2),
  floor integer,
  total_floors integer,
  year_built integer,
  has_elevator boolean,
  has_parking boolean,
  has_balcony boolean,
  has_storage boolean,
  has_shelter boolean,
  is_renovated boolean,

  -- Price
  price numeric(14, 2),
  price_per_sqm numeric(10, 2),
  currency text not null default 'ILS',

  -- Source metadata
  source_url text,
  raw_data jsonb, -- full original payload for reference
  listed_at timestamptz,
  transaction_date date, -- for tax authority deals

  scraped_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(source, source_id)
);

create index idx_listings_city on public.market_listings(city);
create index idx_listings_neighborhood on public.market_listings(neighborhood);
create index idx_listings_source on public.market_listings(source);
create index idx_listings_type on public.market_listings(listing_type);
create index idx_listings_transaction_date on public.market_listings(transaction_date desc);
create index idx_listings_price_per_sqm on public.market_listings(price_per_sqm);
create index idx_listings_rooms on public.market_listings(rooms);
create index idx_listings_location on public.market_listings(latitude, longitude);

-- ============================================================================
-- 6. SCRAPING JOBS (track scraping runs)
-- ============================================================================

create type scrape_status as enum ('pending', 'running', 'completed', 'failed');

create table public.scraping_jobs (
  id uuid primary key default uuid_generate_v4(),
  source data_source not null,
  target_params jsonb not null default '{}'::jsonb, -- city, filters, etc.
  status scrape_status not null default 'pending',
  items_found integer default 0,
  items_new integer default 0,
  items_updated integer default 0,
  items_failed integer default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_scrape_jobs_status on public.scraping_jobs(status);
create index idx_scrape_jobs_source on public.scraping_jobs(source);
create index idx_scrape_jobs_created on public.scraping_jobs(created_at desc);

-- ============================================================================
-- 7. AUTO-UPDATE updated_at TRIGGERS
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();
create trigger trg_units_updated before update on public.project_units
  for each row execute function public.set_updated_at();
create trigger trg_listings_updated before update on public.market_listings
  for each row execute function public.set_updated_at();
