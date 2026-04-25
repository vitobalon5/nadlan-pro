-- ============================================================================
-- Analytics Views - for market analysis dashboard
-- ============================================================================

-- Average price per sqm by city and month (from transactions)
create or replace view public.v_price_trends_by_city as
select
  city,
  date_trunc('month', transaction_date)::date as month,
  count(*) as transaction_count,
  round(avg(price_per_sqm)::numeric, 2) as avg_price_per_sqm,
  round(percentile_cont(0.5) within group (order by price_per_sqm)::numeric, 2) as median_price_per_sqm,
  round(min(price_per_sqm)::numeric, 2) as min_price_per_sqm,
  round(max(price_per_sqm)::numeric, 2) as max_price_per_sqm
from public.market_listings
where
  listing_type = 'transaction'
  and transaction_date is not null
  and price_per_sqm is not null
  and price_per_sqm between 1000 and 200000 -- sanity bounds
group by city, date_trunc('month', transaction_date);

-- Neighborhood comparison snapshot (last 12 months)
create or replace view public.v_neighborhood_comparison as
select
  city,
  neighborhood,
  count(*) as total_listings,
  round(avg(price_per_sqm)::numeric, 2) as avg_price_per_sqm,
  round(percentile_cont(0.5) within group (order by price_per_sqm)::numeric, 2) as median_price_per_sqm,
  round(avg(area_sqm)::numeric, 1) as avg_area_sqm,
  round(avg(rooms)::numeric, 1) as avg_rooms
from public.market_listings
where
  neighborhood is not null
  and price_per_sqm is not null
  and price_per_sqm between 1000 and 200000
  and (
    (listing_type = 'transaction' and transaction_date >= current_date - interval '12 months')
    or (listing_type = 'sale' and listed_at >= now() - interval '3 months')
  )
group by city, neighborhood
having count(*) >= 3;

-- Project vs market comparison - how our projects price vs surrounding market
create or replace view public.v_project_market_comparison as
select
  p.id as project_id,
  p.name as project_name,
  p.city,
  p.neighborhood,
  p.price_per_sqm_avg as project_price_per_sqm,
  nc.avg_price_per_sqm as market_avg_price_per_sqm,
  nc.median_price_per_sqm as market_median_price_per_sqm,
  case
    when nc.avg_price_per_sqm is null or nc.avg_price_per_sqm = 0 then null
    else round(((p.price_per_sqm_avg - nc.avg_price_per_sqm) / nc.avg_price_per_sqm * 100)::numeric, 2)
  end as premium_pct,
  nc.total_listings as market_sample_size
from public.projects p
left join public.v_neighborhood_comparison nc
  on nc.city = p.city and nc.neighborhood = p.neighborhood
where p.deleted_at is null;

-- Scraping health - recent jobs summary
create or replace view public.v_scraping_health as
select
  source,
  count(*) filter (where status = 'completed' and created_at >= now() - interval '24 hours') as completed_24h,
  count(*) filter (where status = 'failed' and created_at >= now() - interval '24 hours') as failed_24h,
  sum(items_new) filter (where created_at >= now() - interval '24 hours') as new_items_24h,
  max(completed_at) as last_successful_run
from public.scraping_jobs
group by source;
