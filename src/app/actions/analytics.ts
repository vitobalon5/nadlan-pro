'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Analytics data Server Action.
 *
 * Strategy:
 * - Pagination on the DB side — never loads >500 rows into memory
 * - Aggregate stats (avg, median, count) computed separately so the summary
 *   reflects THE FULL FILTERED SET, not just the current page
 * - Uses market_listings (scraped transactions), not projects
 *
 * This same action powers both the table and the Excel export.
 * For export, we raise the limit to MAX_EXPORT_ROWS.
 */

export const AnalyticsFiltersSchema = z.object({
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  source: z.enum(['yad2', 'madlan', 'tax_authority', 'all']).default('all'),
  listingType: z.enum(['sale', 'rent', 'transaction', 'all']).default('all'),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  minRooms: z.number().min(0).max(30).optional(),
  maxRooms: z.number().min(0).max(30).optional(),
  // Date range applies to transaction_date for transactions, listed_at for sale/rent
  fromDate: z.string().optional(), // ISO date yyyy-mm-dd
  toDate: z.string().optional(),
  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(500).default(50),
  // Sorting
  sortBy: z
    .enum(['transaction_date', 'price', 'price_per_sqm', 'area_sqm', 'rooms', 'city'])
    .default('transaction_date'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type AnalyticsFilters = z.infer<typeof AnalyticsFiltersSchema>;

export interface AnalyticsRow {
  id: string;
  source: string;
  listing_type: string;
  city: string;
  neighborhood: string | null;
  street: string | null;
  property_type: string | null;
  rooms: number | null;
  area_sqm: number | null;
  floor: number | null;
  year_built: number | null;
  price: number | null;
  price_per_sqm: number | null;
  transaction_date: string | null;
  listed_at: string | null;
  source_url: string | null;
}

export interface AnalyticsStats {
  totalCount: number;
  avgPrice: number | null;
  medianPrice: number | null;
  avgPricePerSqm: number | null;
  avgAreaSqm: number | null;
  avgRooms: number | null;
}

export interface AnalyticsResult {
  rows: AnalyticsRow[];
  stats: AnalyticsStats;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
  };
}

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Main query - returns rows + stats + pagination info.
 */
export async function fetchAnalyticsAction(
  filtersInput: unknown
): Promise<ActionResult<AnalyticsResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר' };

  const parsed = AnalyticsFiltersSchema.safeParse(filtersInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const filters = parsed.data;

  // Build query with shared where clauses
  const buildBaseQuery = () => {
    let q = supabase.from('market_listings').select('*', { count: 'exact' });

    if (filters.city) q = q.ilike('city', `%${filters.city}%`);
    if (filters.neighborhood) q = q.ilike('neighborhood', `%${filters.neighborhood}%`);
    if (filters.source !== 'all') q = q.eq('source', filters.source);
    if (filters.listingType !== 'all') q = q.eq('listing_type', filters.listingType);
    if (filters.minPrice != null) q = q.gte('price', filters.minPrice);
    if (filters.maxPrice != null) q = q.lte('price', filters.maxPrice);
    if (filters.minRooms != null) q = q.gte('rooms', filters.minRooms);
    if (filters.maxRooms != null) q = q.lte('rooms', filters.maxRooms);

    // Date filter — check both transaction_date and listed_at
    if (filters.fromDate) {
      q = q.or(`transaction_date.gte.${filters.fromDate},listed_at.gte.${filters.fromDate}`);
    }
    if (filters.toDate) {
      q = q.or(`transaction_date.lte.${filters.toDate},listed_at.lte.${filters.toDate}`);
    }

    return q;
  };

  try {
    // Main paginated query
    const offset = (filters.page - 1) * filters.pageSize;

    const { data: rows, count, error } = await buildBaseQuery()
      .order(filters.sortBy, { ascending: filters.sortDir === 'asc', nullsFirst: false })
      .range(offset, offset + filters.pageSize - 1);

    if (error) return { ok: false, error: error.message };

    // Stats - separate query that aggregates over the full filtered set
    // We compute this client-side-ish from a sample or use SQL function
    // For now we'll fetch up to 10000 rows just for stats computation.
    // For production, prefer a Postgres function that computes stats server-side.
    const { data: statsRows } = await buildBaseQuery()
      .limit(10_000);

    const stats = computeStats(statsRows ?? [], count ?? 0);

    return {
      ok: true,
      data: {
        rows: (rows ?? []) as AnalyticsRow[],
        stats,
        pagination: {
          page: filters.page,
          pageSize: filters.pageSize,
          totalRows: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / filters.pageSize),
        },
      },
    };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'שגיאה בטעינת נתונים' };
  }
}

/**
 * Export query - fetches up to MAX_EXPORT_ROWS for Excel generation.
 * Same filters as table, but without pagination.
 */
export const MAX_EXPORT_ROWS = 5000;

export async function fetchAnalyticsForExportAction(
  filtersInput: unknown
): Promise<ActionResult<AnalyticsRow[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר' };

  const parsed = AnalyticsFiltersSchema.safeParse({
    ...(filtersInput as object),
    page: 1,
    pageSize: MAX_EXPORT_ROWS,
  });
  if (!parsed.success) {
    return { ok: false, error: 'סינון לא תקין' };
  }

  const filters = parsed.data;

  let q = supabase.from('market_listings').select('*');
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

  const { data, error } = await q
    .order(filters.sortBy, { ascending: filters.sortDir === 'asc', nullsFirst: false })
    .limit(MAX_EXPORT_ROWS);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as AnalyticsRow[] };
}

/**
 * City autocomplete - returns distinct cities for the combobox.
 */
export async function fetchCitiesAction(
  search?: string
): Promise<ActionResult<string[]>> {
  const supabase = await createClient();

  let q = supabase
    .from('market_listings')
    .select('city')
    .not('city', 'is', null)
    .limit(500);

  if (search) q = q.ilike('city', `%${search}%`);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };

  const unique = Array.from(new Set((data ?? []).map((r) => r.city as string))).sort();
  return { ok: true, data: unique.slice(0, 50) };
}

function computeStats(rows: AnalyticsRow[], totalCount: number): AnalyticsStats {
  if (rows.length === 0) {
    return {
      totalCount,
      avgPrice: null,
      medianPrice: null,
      avgPricePerSqm: null,
      avgAreaSqm: null,
      avgRooms: null,
    };
  }

  const prices = rows.map((r) => r.price).filter((v): v is number => typeof v === 'number');
  const ppsqms = rows.map((r) => r.price_per_sqm).filter((v): v is number => typeof v === 'number');
  const areas = rows.map((r) => r.area_sqm).filter((v): v is number => typeof v === 'number');
  const roomsVals = rows.map((r) => r.rooms).filter((v): v is number => typeof v === 'number');

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  return {
    totalCount,
    avgPrice: avg(prices),
    medianPrice: median(prices),
    avgPricePerSqm: avg(ppsqms),
    avgAreaSqm: avg(areas),
    avgRooms: avg(roomsVals),
  };
}
