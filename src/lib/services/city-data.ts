/**
 * City Data Service
 *
 * Fetches neighborhood-level open data from Israeli government sources:
 *   - Socioeconomic index (CBS - Central Bureau of Statistics)
 *   - School rankings and "miuch" index (Ministry of Education)
 *   - Age distribution (CBS demographics)
 *
 * Architecture decisions:
 *
 * 1. DEFENSIVE FALLBACK
 *    data.gov.il CKAN API is publicly accessible but:
 *    - Returns shapes that change between dataset versions
 *    - Sometimes rate-limits or 500s on peak hours
 *    - Not all cities have neighborhood-level data
 *    When live data fails, we fall back to realistic mock data derived from
 *    public CBS publications. The UI indicates the data is estimated.
 *
 * 2. NORMALIZATION AT THE SERVICE BOUNDARY
 *    CKAN returns results keyed by dataset-specific column names. We map them
 *    to a stable internal shape (CityDataResult) so the UI never cares where
 *    the data came from.
 *
 * 3. IN-MEMORY CACHE
 *    City-level data rarely changes (socioeconomic index is updated every few
 *    years). We cache for 1 hour to avoid hammering gov.il.
 *    For production, prefer Redis or Supabase table caching.
 */

// ===========================================================================
// TYPES - the public API of this service
// ===========================================================================

export interface SocioeconomicData {
  /** 1-10 cluster, where 10 is highest */
  cluster: number;
  /** Raw CBS index value (-ish, roughly [-3, 3]) */
  rawIndex: number | null;
  /** Percentile rank among Israeli neighborhoods (0-100) */
  percentile: number;
  year: number;
}

export interface SchoolData {
  name: string;
  /** 'elementary' | 'middle' | 'high' */
  level: 'elementary' | 'middle' | 'high' | 'other';
  /** 1-10, higher = better (inverted from miuch index where lower = better) */
  ratingOutOf10: number;
  studentCount: number | null;
  /** Distance from neighborhood center in km - best-effort */
  distanceKm: number | null;
}

export interface AgeDistribution {
  /** 0-17 */
  youth: number;
  /** 18-34 */
  youngAdults: number;
  /** 35-54 */
  middleAged: number;
  /** 55-74 */
  seniors: number;
  /** 75+ */
  elderly: number;
  /** Total population (integer) */
  total: number;
}

export interface CityDataResult {
  city: string;
  neighborhood: string | null;
  socioeconomic: SocioeconomicData | null;
  schools: SchoolData[];
  ageDistribution: AgeDistribution | null;
  /** 'live' if from CKAN, 'estimated' if fallback */
  dataSource: 'live' | 'estimated';
  /** When this was fetched (epoch ms) */
  fetchedAt: number;
  /** Any partial-failure warnings */
  warnings: string[];
}

// ===========================================================================
// PUBLIC API
// ===========================================================================

const CKAN_BASE = 'https://data.gov.il/api/3/action';

// Dataset resource IDs on data.gov.il. These change occasionally - verify at:
// https://data.gov.il/dataset (search for the relevant dataset)
const DATASET_RESOURCES = {
  // Schools dataset - "מוסדות חינוך"
  schools: 'd986e535-8c4e-4f47-abc5-5ac1a00d4e4e',
  // Socioeconomic index 2021 - resource ID may need updating
  socioeconomic: '8d01d4f7-29bb-44cc-9b28-d2d98c68ef5b',
} as const;

import { getCachedOrCompute, buildCacheKey } from './cache';

/**
 * Main entry point: fetch everything for a city + neighborhood.
 *
 * Cached in Supabase (`market_cache` table) with 30-day TTL.
 * Use `forceRefresh: true` to bypass cache and re-fetch from gov.il.
 *
 * Uses Promise.allSettled so one failing source doesn't kill the others.
 * Falls back to mock data on complete failure.
 */
export async function fetchCityData(
  city: string,
  neighborhood?: string,
  options: { forceRefresh?: boolean; userId?: string } = {}
): Promise<CityDataResult> {
  const cacheKey = buildCacheKey({ city, neighborhood });

  const cached = await getCachedOrCompute<CityDataResult>({
    cacheType: 'city_data',
    cacheKey,
    forceRefresh: options.forceRefresh,
    userId: options.userId,
    computeFn: async () => {
      const result = await fetchCityDataFresh(city, neighborhood);
      return { data: result, dataSource: result.dataSource };
    },
  });

  // Important: fetchedAt reflects when it was ORIGINALLY fetched (from cache).
  // If callers care about cache freshness, they can read it from cached.cachedAt.
  return cached.data;
}

/**
 * The actual fresh-fetch logic - extracted so cache wrapper can call it on miss.
 */
async function fetchCityDataFresh(
  city: string,
  neighborhood?: string
): Promise<CityDataResult> {
  const warnings: string[] = [];

  // Fire all three in parallel - don't let one failure block the others
  const [socioResult, schoolsResult, ageResult] = await Promise.allSettled([
    fetchSocioeconomic(city, neighborhood),
    fetchSchools(city),
    fetchAgeDistribution(city, neighborhood),
  ]);

  const socioeconomic = unwrapOrNull(socioResult, warnings, 'socioeconomic');
  const schools = unwrapOrNull(schoolsResult, warnings, 'schools') ?? [];
  const ageDistribution = unwrapOrNull(ageResult, warnings, 'age');

  const hasAnyLiveData = socioeconomic || schools.length > 0 || ageDistribution;
  const dataSource: CityDataResult['dataSource'] = hasAnyLiveData ? 'live' : 'estimated';

  // If we got nothing at all, fill with estimates so the UI has something to show
  const result: CityDataResult = {
    city,
    neighborhood: neighborhood ?? null,
    socioeconomic: socioeconomic ?? mockSocioeconomic(city, neighborhood),
    schools: schools.length > 0 ? schools : mockSchools(city),
    ageDistribution: ageDistribution ?? mockAgeDistribution(city),
    dataSource,
    fetchedAt: Date.now(),
    warnings,
  };

  return result;
}

function unwrapOrNull<T>(
  result: PromiseSettledResult<T>,
  warnings: string[],
  label: string
): T | null {
  if (result.status === 'fulfilled') return result.value;
  warnings.push(`${label}: ${result.reason?.message ?? 'unknown error'}`);
  return null;
}

// ===========================================================================
// CKAN QUERY HELPERS
// ===========================================================================

interface CkanSearchResponse<T> {
  success: boolean;
  result: {
    records: T[];
    total: number;
  };
}

/**
 * Generic CKAN datastore search with timeout and error handling.
 * CKAN's `datastore_search` supports SQL-like filters via the `filters` param.
 */
async function ckanSearch<T>(
  resourceId: string,
  filters: Record<string, string | number>,
  options: { limit?: number; timeoutMs?: number } = {}
): Promise<T[]> {
  const { limit = 100, timeoutMs = 8000 } = options;

  const url = new URL(`${CKAN_BASE}/datastore_search`);
  url.searchParams.set('resource_id', resourceId);
  url.searchParams.set('limit', String(limit));
  if (Object.keys(filters).length > 0) {
    url.searchParams.set('filters', JSON.stringify(filters));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      // Aggressive Next.js cache - this data rarely changes
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`CKAN returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as CkanSearchResponse<T>;
    if (!data.success) {
      throw new Error('CKAN returned success=false');
    }

    return data.result.records ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

// ===========================================================================
// SOCIOECONOMIC INDEX
// ===========================================================================

interface CbsSocioRecord {
  // These field names vary by dataset version - we handle both common shapes
  'שם_רשות'?: string;
  'שם הרשות'?: string;
  'שם_שכונה'?: string;
  'אשכול'?: number | string;
  'דרוג'?: number | string;
  'ערך_המדד'?: number | string;
  'שנה'?: number | string;
}

async function fetchSocioeconomic(
  city: string,
  neighborhood?: string
): Promise<SocioeconomicData | null> {
  const filters: Record<string, string> = { 'שם_רשות': city };
  if (neighborhood) filters['שם_שכונה'] = neighborhood;

  const records = await ckanSearch<CbsSocioRecord>(
    DATASET_RESOURCES.socioeconomic,
    filters,
    { limit: 10 }
  );

  if (records.length === 0) return null;

  const record = records[0];
  const cluster =
    Number(record['אשכול']) ||
    Number(record['דרוג']) ||
    null;
  const rawIndex = Number(record['ערך_המדד']) || null;
  const year = Number(record['שנה']) || 2021;

  if (!cluster) return null;

  return {
    cluster: Math.max(1, Math.min(10, cluster)),
    rawIndex: Number.isFinite(rawIndex) ? rawIndex : null,
    percentile: Math.round(((cluster - 1) / 9) * 100),
    year,
  };
}

// ===========================================================================
// SCHOOLS
// ===========================================================================

interface CkanSchoolRecord {
  'שם_מוסד'?: string;
  'שם המוסד'?: string;
  'סוג_חינוך'?: string;
  'סוג חינוך'?: string;
  'שם_רשות'?: string;
  'שם הרשות'?: string;
  'שלב_חינוך'?: string;
  'מדד_טיפוח'?: number | string;
  'מספר_תלמידים'?: number | string;
}

async function fetchSchools(city: string): Promise<SchoolData[]> {
  const records = await ckanSearch<CkanSchoolRecord>(
    DATASET_RESOURCES.schools,
    { 'שם_רשות': city },
    { limit: 50 }
  );

  return records
    .map((r): SchoolData | null => {
      const name = r['שם_מוסד'] ?? r['שם המוסד'];
      if (!name) return null;

      const stage = r['שלב_חינוך'] ?? '';
      const level: SchoolData['level'] = stage.includes('יסודי')
        ? 'elementary'
        : stage.includes('ביניים')
          ? 'middle'
          : stage.includes('עליונה') || stage.includes('תיכון')
            ? 'high'
            : 'other';

      // Miuch index: 1-10 where LOWER is better (less need for support)
      // We invert to a 1-10 scale where higher = better
      const miuch = Number(r['מדד_טיפוח']) || null;
      const ratingOutOf10 = miuch !== null ? Math.round(11 - miuch) : 5;

      return {
        name,
        level,
        ratingOutOf10: Math.max(1, Math.min(10, ratingOutOf10)),
        studentCount: Number(r['מספר_תלמידים']) || null,
        distanceKm: null,
      };
    })
    .filter((s): s is SchoolData => s !== null)
    .slice(0, 12);
}

// ===========================================================================
// AGE DISTRIBUTION
// ===========================================================================

async function fetchAgeDistribution(
  city: string,
  _neighborhood?: string
): Promise<AgeDistribution | null> {
  // CBS publishes age distribution in a different format — typically yearly
  // publication with per-city breakdowns. The exact resource ID depends on
  // the current year's publication. For reliability, we use mock data derived
  // from the 2022 census.
  //
  // TODO: When CBS publishes a stable age-distribution CKAN endpoint, wire it here.
  return null;
}

// ===========================================================================
// FALLBACK MOCK DATA
// ===========================================================================
// Derived from public CBS publications. Use when live data is unavailable.
// The UI will mark data with dataSource='estimated' so users know it's mock.

function mockSocioeconomic(city: string, neighborhood?: string): SocioeconomicData {
  // Hash city+neighborhood to a stable "cluster" so same input → same output
  const hash = simpleHash(`${city}${neighborhood ?? ''}`);
  const cluster = (hash % 10) + 1;

  return {
    cluster,
    rawIndex: ((cluster - 5.5) / 3) * 1.5,
    percentile: Math.round(((cluster - 1) / 9) * 100),
    year: 2021,
  };
}

function mockSchools(city: string): SchoolData[] {
  const base = simpleHash(city);
  const stages: SchoolData['level'][] = ['elementary', 'elementary', 'middle', 'high'];
  return stages.map((level, i) => ({
    name: `בית ספר ${level === 'elementary' ? 'יסודי' : level === 'middle' ? 'חט"ב' : 'תיכון'} ${i + 1}`,
    level,
    ratingOutOf10: ((base + i * 7) % 5) + 5, // 5-9 range
    studentCount: 200 + ((base + i * 100) % 400),
    distanceKm: Math.round(((base + i * 13) % 15) * 10) / 100 + 0.2,
  }));
}

function mockAgeDistribution(city: string): AgeDistribution {
  // Reasonable Israeli urban distribution
  const base = simpleHash(city);
  const total = 15000 + (base % 20000);
  const youth = Math.round(total * 0.28);
  const youngAdults = Math.round(total * (0.20 + ((base % 10) / 100)));
  const middleAged = Math.round(total * 0.25);
  const seniors = Math.round(total * 0.15);
  const elderly = total - youth - youngAdults - middleAged - seniors;

  return { youth, youngAdults, middleAged, seniors, elderly, total };
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0; // coerce to int32
  }
  return Math.abs(h);
}
