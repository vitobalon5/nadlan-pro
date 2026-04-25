'use server';

import { createClient } from '@/lib/supabase/server';
import { AnalyticsFiltersSchema, type AnalyticsFilters } from './analytics';

/**
 * Chart data server action.
 *
 * Returns three aggregated datasets that match the same filter criteria as
 * the analytics table. This ensures visual consistency: the numbers the user
 * sees in the table are reflected in the charts.
 *
 * Performance: we aggregate client-side on up to 10K rows. If the filter
 * returns more, we sample. For production scale, move aggregation to SQL
 * (Postgres GROUP BY).
 */

export interface PriceTrendPoint {
  month: string; // 'yyyy-mm' format
  monthLabel: string; // 'ינו 2026' for display
  avgPrice: number;
  medianPrice: number;
  count: number;
}

export interface PriceDistributionBucket {
  /** Bucket lower bound in ILS */
  from: number;
  /** Bucket upper bound in ILS */
  to: number;
  /** Midpoint for axis labels */
  label: string;
  count: number;
}

export interface RoomsScatterPoint {
  rooms: number;
  pricePerSqm: number;
  /** jitter for visual separation when many points overlap */
  id: string;
}

export interface ChartsData {
  priceTrend: PriceTrendPoint[];
  priceDistribution: PriceDistributionBucket[];
  roomsScatter: RoomsScatterPoint[];
  /** Meta for UI - show "based on N records" */
  sampleSize: number;
  /** True when sample < full set, so UI can show "approximate" badge */
  isSampled: boolean;
}

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX_SAMPLE = 10_000;
const SCATTER_MAX_POINTS = 500;

export async function fetchChartsAction(
  filtersInput: unknown
): Promise<ActionResult<ChartsData>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר' };

  const parsed = AnalyticsFiltersSchema.safeParse(filtersInput);
  if (!parsed.success) {
    return { ok: false, error: 'סינון לא תקין' };
  }
  const filters = parsed.data;

  // Build the same filtered query used by the table
  let q = supabase
    .from('market_listings')
    .select('price, price_per_sqm, rooms, area_sqm, transaction_date, listed_at');

  if (filters.city) q = q.ilike('city', `%${filters.city}%`);
  if (filters.neighborhood) q = q.ilike('neighborhood', `%${filters.neighborhood}%`);
  if (filters.source !== 'all') q = q.eq('source', filters.source);
  if (filters.listingType !== 'all') q = q.eq('listing_type', filters.listingType);
  if (filters.minPrice != null) q = q.gte('price', filters.minPrice);
  if (filters.maxPrice != null) q = q.lte('price', filters.maxPrice);
  if (filters.minRooms != null) q = q.gte('rooms', filters.minRooms);
  if (filters.maxRooms != null) q = q.lte('rooms', filters.maxRooms);
  if (filters.fromDate) {
    q = q.or(`transaction_date.gte.${filters.fromDate},listed_at.gte.${filters.fromDate}`);
  }
  if (filters.toDate) {
    q = q.or(`transaction_date.lte.${filters.toDate},listed_at.lte.${filters.toDate}`);
  }

  const { data, error } = await q.limit(MAX_SAMPLE);
  if (error) return { ok: false, error: error.message };

  const rows = data ?? [];

  return {
    ok: true,
    data: {
      priceTrend: buildPriceTrend(rows),
      priceDistribution: buildPriceDistribution(rows),
      roomsScatter: buildRoomsScatter(rows),
      sampleSize: rows.length,
      isSampled: rows.length === MAX_SAMPLE,
    },
  };
}

// ---------------------------------------------------------------------------
// Price trend: monthly aggregation
// ---------------------------------------------------------------------------

type Row = {
  price: number | null;
  price_per_sqm: number | null;
  rooms: number | null;
  area_sqm: number | null;
  transaction_date: string | null;
  listed_at: string | null;
};

const HE_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

function buildPriceTrend(rows: Row[]): PriceTrendPoint[] {
  // Group by year-month using whichever date is available
  const buckets = new Map<string, number[]>();

  for (const r of rows) {
    const dateStr = r.transaction_date ?? r.listed_at;
    if (!dateStr || r.price == null) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!buckets.has(monthKey)) buckets.set(monthKey, []);
    buckets.get(monthKey)!.push(r.price);
  }

  const sortedKeys = [...buckets.keys()].sort();

  return sortedKeys.map((monthKey) => {
    const prices = buckets.get(monthKey)!;
    const sorted = [...prices].sort((a, b) => a - b);
    const avgPrice = prices.reduce((s, v) => s + v, 0) / prices.length;
    const medianPrice =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const [year, month] = monthKey.split('-').map(Number);
    const monthLabel = `${HE_MONTHS[month - 1]} ${year}`;

    return {
      month: monthKey,
      monthLabel,
      avgPrice: Math.round(avgPrice),
      medianPrice: Math.round(medianPrice),
      count: prices.length,
    };
  });
}

// ---------------------------------------------------------------------------
// Price distribution: histogram with dynamic buckets
// ---------------------------------------------------------------------------

function buildPriceDistribution(rows: Row[]): PriceDistributionBucket[] {
  const prices = rows.map((r) => r.price).filter((v): v is number => typeof v === 'number');
  if (prices.length === 0) return [];

  const sorted = [...prices].sort((a, b) => a - b);

  // Use 5th and 95th percentile as bucket range (ignore extreme outliers)
  const p5 = sorted[Math.floor(sorted.length * 0.05)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  // 10 buckets, rounded to a nice number
  const rawStep = (p95 - p5) / 10;
  const step = roundToNiceNumber(rawStep);
  const from = Math.floor(p5 / step) * step;
  const to = Math.ceil(p95 / step) * step;

  const buckets: PriceDistributionBucket[] = [];
  for (let lo = from; lo < to; lo += step) {
    const hi = lo + step;
    const count = prices.filter((p) => p >= lo && p < hi).length;
    buckets.push({
      from: lo,
      to: hi,
      label: formatBucketLabel(lo, hi),
      count,
    });
  }

  return buckets;
}

function roundToNiceNumber(n: number): number {
  // Round to 1 / 2 / 5 × 10^k
  const exp = Math.floor(Math.log10(n));
  const fraction = n / Math.pow(10, exp);
  let nice: number;
  if (fraction <= 1.5) nice = 1;
  else if (fraction <= 3) nice = 2;
  else if (fraction <= 7) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

function formatBucketLabel(lo: number, hi: number): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  };
  return `${fmt(lo)}-${fmt(hi)}`;
}

// ---------------------------------------------------------------------------
// Rooms × Price scatter
// ---------------------------------------------------------------------------

function buildRoomsScatter(rows: Row[]): RoomsScatterPoint[] {
  const points: RoomsScatterPoint[] = [];

  for (const r of rows) {
    if (r.rooms == null || r.price_per_sqm == null) continue;
    if (r.rooms <= 0 || r.rooms > 10) continue; // sanity
    points.push({
      rooms: r.rooms,
      pricePerSqm: r.price_per_sqm,
      id: `${points.length}`,
    });
  }

  // Sample if too many points (chart becomes unreadable)
  if (points.length <= SCATTER_MAX_POINTS) return points;

  const step = points.length / SCATTER_MAX_POINTS;
  const sampled: RoomsScatterPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[Math.floor(i)]);
  }
  return sampled;
}
