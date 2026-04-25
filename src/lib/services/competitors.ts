/**
 * Competitor Search Service
 *
 * Searches the web for competing real-estate projects near a given address,
 * then extracts structured data (marketer name, starting price, price per sqm)
 * from unstructured search results.
 *
 * ARCHITECTURE DECISIONS:
 *
 * 1. PROVIDER ADAPTER — supports both Tavily and Serper via a common interface.
 *    Tavily is preferred (returns extracted content → we parse prices from it),
 *    Serper is a fallback (returns only URLs/snippets → we get less data).
 *    User picks via env var: COMPETITOR_SEARCH_PROVIDER=tavily|serper
 *
 * 2. EXTRACTION IS BEST-EFFORT — Hebrew real-estate listings have no schema.
 *    Prices appear as "החל מ-3.5 מיליון ₪" or "2,850,000 ₪" or "₪4.2M".
 *    Marketer names are often in the domain ("boimi.co.il" → Boimi) or title.
 *    We use regex for prices and URL pattern matching for marketers.
 *    When extraction fails, we return partial data rather than dropping the
 *    result — the raw URL is always useful to the user.
 *
 * 3. WE FILTER FOR QUALITY — search often returns news articles, forum posts,
 *    and unrelated content. We require at least one of: recognized marketer
 *    domain, extracted price, or yad2/madlan URL.
 *
 * 4. NO DB PERSISTENCE (for now) — competitor scans are expensive to run
 *    repeatedly but results become stale within weeks. For production:
 *    cache results in a competitor_scans table with 7-day TTL, keyed by
 *    project_id + search_query hash. For now, fresh fetch every time with
 *    in-memory cache per process.
 */

// ===========================================================================
// PUBLIC TYPES
// ===========================================================================

export interface CompetitorProject {
  /** URL of the listing/project page */
  url: string;
  /** Best-guess project or listing name */
  name: string;
  /** Marketer/developer if identifiable (from domain or title) */
  marketer: string | null;
  /** "Starting from" price in ILS, null if not extracted */
  startingPrice: number | null;
  /** Derived price per sqm, null if we couldn't compute */
  pricePerSqm: number | null;
  /** Area in sqm if mentioned */
  areaSqm: number | null;
  /** Rooms if mentioned */
  rooms: number | null;
  /** Which source this came from */
  source: 'yad2' | 'madlan' | 'onmap' | 'homeless' | 'other';
  /** Short excerpt from search result — useful for "why did this match?" */
  snippet: string;
  /** Confidence 0-1 — how sure we are this is actually a competitor project */
  confidence: number;
  /** Raw search result for debugging */
  _raw?: unknown;
}

export interface CompetitorSearchResult {
  competitors: CompetitorProject[];
  searchQuery: string;
  provider: 'tavily' | 'serper';
  resultsFetched: number;
  resultsKept: number;
  /** Milliseconds */
  durationMs: number;
  warnings: string[];
}

// ===========================================================================
// MAIN ENTRY POINT
// ===========================================================================

import { getCachedOrCompute, buildCacheKey } from './cache';

export interface CompetitorSearchInput {
  city: string;
  address?: string | null;
  neighborhood?: string | null;
  /** How many results we want to keep (after filtering). Default 8. */
  maxResults?: number;
  /** Force re-fetch from Tavily/Serper even if cached. */
  forceRefresh?: boolean;
  /** User who triggered this search (for cache attribution). */
  userId?: string;
}

export async function searchCompetitors(
  input: CompetitorSearchInput
): Promise<CompetitorSearchResult> {
  // Cache by city + neighborhood + address + maxResults (not by userId or time).
  // Results stay fresh for 3 days per cache.ts defaults.
  const cacheKey = buildCacheKey({
    city: input.city,
    neighborhood: input.neighborhood,
    address: input.address,
    maxResults: String(input.maxResults ?? 8),
  });

  const cached = await getCachedOrCompute<CompetitorSearchResult>({
    cacheType: 'competitor_search',
    cacheKey,
    forceRefresh: input.forceRefresh,
    userId: input.userId,
    computeFn: async () => {
      const result = await searchCompetitorsFresh(input);
      return { data: result };
    },
  });

  return cached.data;
}

async function searchCompetitorsFresh(
  input: CompetitorSearchInput
): Promise<CompetitorSearchResult> {
  const startedAt = Date.now();
  const warnings: string[] = [];
  const maxResults = input.maxResults ?? 8;

  // Build the search query — specific enough to filter out noise
  const locationPart = [input.neighborhood, input.address, input.city]
    .filter(Boolean)
    .slice(0, 2) // avoid over-specification
    .join(' ');
  const searchQuery = `פרויקטים חדשים למכירה ${locationPart} יד2 מדלן`;

  const provider = (process.env.COMPETITOR_SEARCH_PROVIDER ?? 'tavily') as 'tavily' | 'serper';

  let rawResults: RawSearchResult[] = [];
  try {
    if (provider === 'tavily') {
      rawResults = await searchViaTavily(searchQuery);
    } else {
      rawResults = await searchViaSerper(searchQuery);
    }
  } catch (error: any) {
    warnings.push(`${provider} failed: ${error.message}`);
    return {
      competitors: [],
      searchQuery,
      provider,
      resultsFetched: 0,
      resultsKept: 0,
      durationMs: Date.now() - startedAt,
      warnings,
    };
  }

  // Extract structured data from each result
  const extracted = rawResults
    .map((r) => extractCompetitor(r))
    .filter((c): c is CompetitorProject => c !== null);

  // Sort by confidence descending, then by whether we have a price
  extracted.sort((a, b) => {
    const priceScore = (a.startingPrice ? 1 : 0) - (b.startingPrice ? 1 : 0);
    if (priceScore !== 0) return -priceScore;
    return b.confidence - a.confidence;
  });

  const competitors = extracted.slice(0, maxResults);

  return {
    competitors,
    searchQuery,
    provider,
    resultsFetched: rawResults.length,
    resultsKept: competitors.length,
    durationMs: Date.now() - startedAt,
    warnings,
  };
}

// ===========================================================================
// SEARCH PROVIDERS
// ===========================================================================

interface RawSearchResult {
  url: string;
  title: string;
  snippet: string;
  /** Full content if provider supports extraction (Tavily). */
  content?: string;
}

async function searchViaTavily(query: string): Promise<RawSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set. Get one at https://tavily.com');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: 15,
      include_domains: ['yad2.co.il', 'madlan.co.il', 'onmap.co.il', 'homeless.co.il'],
      // Tavily returns content cleanly extracted, which is huge for our regex
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Tavily returned HTTP ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ url: string; title: string; content: string; score?: number }>;
  };

  return (data.results ?? []).map((r) => ({
    url: r.url,
    title: r.title,
    snippet: r.content?.slice(0, 500) ?? '',
    content: r.content,
  }));
}

async function searchViaSerper(query: string): Promise<RawSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('SERPER_API_KEY is not set. Get one at https://serper.dev');
  }

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      q: query,
      gl: 'il', // Israel geo
      hl: 'he', // Hebrew
      num: 15,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Serper returned HTTP ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    organic?: Array<{ link: string; title: string; snippet: string }>;
  };

  return (data.organic ?? []).map((r) => ({
    url: r.link,
    title: r.title,
    snippet: r.snippet,
  }));
}

// ===========================================================================
// EXTRACTION — turn unstructured HTML-text into structured fields
// ===========================================================================

function extractCompetitor(raw: RawSearchResult): CompetitorProject | null {
  // Skip obvious non-matches early
  const blockedKeywords = ['ידיעה', 'כתבה', 'בלוג', 'מאמר', 'סקירה'];
  if (blockedKeywords.some((k) => raw.title.includes(k))) return null;

  const source = detectSource(raw.url);
  const marketer = extractMarketer(raw.url, raw.title);
  const textBlob = `${raw.title}\n${raw.snippet}\n${raw.content ?? ''}`;

  const priceMatch = extractPrice(textBlob);
  const areaMatch = extractArea(textBlob);
  const roomsMatch = extractRooms(textBlob);

  const pricePerSqm =
    priceMatch && areaMatch && areaMatch > 0 ? Math.round(priceMatch / areaMatch) : null;

  // Confidence scoring
  let confidence = 0.3; // baseline
  if (priceMatch) confidence += 0.3;
  if (source !== 'other') confidence += 0.2;
  if (marketer) confidence += 0.1;
  if (areaMatch) confidence += 0.1;

  // Require minimum signal
  if (confidence < 0.4 && !priceMatch) return null;

  return {
    url: raw.url,
    name: cleanTitle(raw.title),
    marketer,
    startingPrice: priceMatch,
    pricePerSqm,
    areaSqm: areaMatch,
    rooms: roomsMatch,
    source,
    snippet: raw.snippet.slice(0, 200),
    confidence: Math.min(1, confidence),
    _raw: raw,
  };
}

function detectSource(url: string): CompetitorProject['source'] {
  const lower = url.toLowerCase();
  if (lower.includes('yad2.co.il')) return 'yad2';
  if (lower.includes('madlan.co.il')) return 'madlan';
  if (lower.includes('onmap.co.il')) return 'onmap';
  if (lower.includes('homeless.co.il')) return 'homeless';
  return 'other';
}

/**
 * Try to identify the marketer from URL domain or title patterns.
 * Real-estate marketers often appear as subdomain or first title segment.
 */
function extractMarketer(url: string, title: string): string | null {
  // Known marketer patterns in titles (case-insensitive)
  const titleMarketers = [
    'אפריקה ישראל', 'אשדר', 'בוני התיכון', 'אאורה', 'שיכון ובינוי',
    'אזורים', 'גינדי', 'חנן מור', 'דמרי', 'מליסרון', 'רמי לוי',
  ];
  for (const m of titleMarketers) {
    if (title.includes(m)) return m;
  }

  // Extract from domain (excluding known aggregators)
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const skip = ['yad2.co.il', 'madlan.co.il', 'onmap.co.il', 'homeless.co.il', 'google.com'];
    if (skip.some((s) => hostname.endsWith(s))) return null;

    // e.g. "dimri.co.il" → "Dimri"
    const mainPart = hostname.split('.')[0];
    if (mainPart.length < 3) return null;
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  } catch {
    return null;
  }
}

/**
 * Extract price in ILS from Hebrew real-estate text.
 * Handles common formats:
 *   - "החל מ-3,500,000 ₪" / "החל מ-3.5 מיליון"
 *   - "2,850,000 ש״ח" / "2850000 שח"
 *   - "₪4.2M" / "4.2 מיליון ש״ח"
 */
function extractPrice(text: string): number | null {
  // Pattern 1: Number + "מיליון" (millions)
  const millionsRegex = /(?:החל מ[־-])?\s*(\d+(?:[.,]\d+)?)\s*מיליון/g;
  const millionsMatch = millionsRegex.exec(text);
  if (millionsMatch) {
    const num = parseFloat(millionsMatch[1].replace(',', '.'));
    if (num >= 0.5 && num <= 200) {
      return Math.round(num * 1_000_000);
    }
  }

  // Pattern 2: Full number with commas + currency symbol
  // e.g. "3,500,000 ₪" or "3,500,000 ש״ח"
  const fullNumberRegex = /(\d{1,3}(?:,\d{3}){1,3})\s*(?:₪|ש[״"]?ח|ils)/gi;
  let match: RegExpExecArray | null;
  const candidates: number[] = [];
  while ((match = fullNumberRegex.exec(text)) !== null) {
    const num = parseInt(match[1].replace(/,/g, ''), 10);
    // Real estate prices in Israel: 500K to 50M range
    if (num >= 500_000 && num <= 50_000_000) {
      candidates.push(num);
    }
  }

  // Pattern 3: "₪" prefix with M suffix, e.g. "₪4.2M" or "4.2M ₪"
  const shortMRegex = /(?:₪\s*)?(\d+(?:\.\d+)?)\s*M\b|(\d+(?:\.\d+)?)\s*M\s*₪/gi;
  const shortMMatch = shortMRegex.exec(text);
  if (shortMMatch) {
    const numStr = shortMMatch[1] ?? shortMMatch[2];
    const num = parseFloat(numStr);
    if (num >= 0.5 && num <= 100) {
      candidates.push(Math.round(num * 1_000_000));
    }
  }

  if (candidates.length === 0) return null;

  // Return the minimum — "starting from" semantics
  return Math.min(...candidates);
}

function extractArea(text: string): number | null {
  // "95 מ"ר" / "120 מטר" / "85 m²"
  const patterns = [
    /(\d{2,4})\s*מ[״"]?ר\b/,
    /(\d{2,4})\s*מטר\s*(?:מרובע)?/,
    /(\d{2,4})\s*m[²2]/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 25 && num <= 1000) return num;
    }
  }
  return null;
}

function extractRooms(text: string): number | null {
  // "4 חדרים" / "דירת 3.5 חדרים"
  const match = text.match(/(\d+(?:\.\d)?)\s*חדרים/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (num >= 1 && num <= 10) return num;
  return null;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|\-–]\s*(?:יד2|Yad2|Madlan|מדלן|Onmap).*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}
