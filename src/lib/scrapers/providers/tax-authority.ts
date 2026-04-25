import type { ScraperProvider, ProviderCapabilities } from '../provider';
import type { ScrapeQuery, ScrapeResult, NormalizedListing } from '../types';
import { NormalizedListingSchema } from '../types';
import { fetchWithRetry } from '../runtime/http';

/**
 * Israeli Tax Authority - https://www.nadlan.gov.il
 * Provides actual recorded transaction prices. No rate limits observed,
 * no anti-bot, totally public data. Best starting point for any analysis.
 *
 * ⚠ Their API shape changes 1-2x per year. Check the raw_data in DB if
 * something stops parsing.
 */
export class TaxAuthorityProvider implements ScraperProvider {
  readonly source = 'tax_authority' as const;
  readonly displayName = 'רשות המיסים (נדל"ן)';

  readonly capabilities: ProviderCapabilities = {
    filters: {
      city: true,
      neighborhood: false, // API doesn't filter by neighborhood directly
      rooms: false,
      priceRange: false,
      listingType: false, // Always transactions
    },
    supportedListingTypes: ['transaction'],
    runtime: 'http',
    estimatedRateLimitRps: 2,
    requiresCity: true,
  };

  private readonly endpoint: string;

  constructor() {
    this.endpoint =
      process.env.TAX_AUTHORITY_API_URL ??
      'https://www.nadlan.gov.il/Nadlan.REST/Main/GetAssestAndDeals';
  }

  async scrape(query: ScrapeQuery, ctx: Parameters<ScraperProvider['scrape']>[1]): Promise<ScrapeResult> {
    const startedAt = Date.now();

    if (!query.city) {
      throw new Error('city is required for Tax Authority provider');
    }

    const payload = {
      Query: {
        QueryObj: [{ ObjectKey: query.city, ObjectType: 1, ObjectDisplayText: query.city }],
      },
      PageNumber: query.page ?? 1,
      PageSize: Math.min(query.limit ?? 50, 50),
    };

    ctx.log('info', `Querying Tax Authority for ${query.city} page ${query.page}`);

    const response = await fetchWithRetry(
      this.endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      ctx
    );

    const data = (await response.json()) as TaxAuthorityResponse;
    const rawDeals = data.AllResults ?? [];

    const { valid, invalid, reasons } = this.normalizeAndValidate(rawDeals, query.city);

    return {
      listings: valid,
      hasMore: rawDeals.length >= 50,
      nextCursor: (query.page ?? 1) + 1,
      meta: {
        durationMs: Date.now() - startedAt,
        fetchedCount: rawDeals.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        invalidReasons: reasons.slice(0, 5), // Cap to avoid huge log payloads
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Query: { QueryObj: [{ ObjectKey: 'תל אביב', ObjectType: 1 }] },
          PageNumber: 1,
          PageSize: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private normalizeAndValidate(
    rawDeals: TaxAuthorityDeal[],
    city: string
  ): { valid: NormalizedListing[]; invalid: TaxAuthorityDeal[]; reasons: string[] } {
    const valid: NormalizedListing[] = [];
    const invalid: TaxAuthorityDeal[] = [];
    const reasons: string[] = [];

    for (const deal of rawDeals) {
      const candidate = this.normalize(deal, city);
      const result = NormalizedListingSchema.safeParse(candidate);
      if (result.success) {
        valid.push(result.data);
      } else {
        invalid.push(deal);
        reasons.push(result.error.issues[0]?.message ?? 'unknown validation error');
      }
    }

    return { valid, invalid, reasons };
  }

  private normalize(deal: TaxAuthorityDeal, city: string): Partial<NormalizedListing> {
    const price = numeric(deal.DEALAMOUNT);
    const area = numeric(deal.DEALNATURE);
    const pricePerSqm = price && area && area > 0 ? Math.round(price / area) : undefined;

    return {
      source: 'tax_authority',
      source_id: String(deal.KEYVALUE ?? `${deal.GUSH}-${deal.HELKA}-${deal.DEALDATETIME}`),
      listing_type: 'transaction',
      city,
      neighborhood: deal.NEIGHBORHOOD || undefined,
      street: deal.DISPLAYADRESS || undefined,
      address: deal.FULLADRESS || undefined,
      property_type: deal.DEALNATUREDESCRIPTION || undefined,
      rooms: numeric(deal.ASSETROOMNUM),
      area_sqm: area,
      floor: deal.FLOORNO ? parseInt(String(deal.FLOORNO), 10) : undefined,
      year_built: numeric(deal.BUILDINGYEAR),
      gush: deal.GUSH || undefined,
      helka: deal.HELKA || undefined,
      price,
      price_per_sqm: pricePerSqm,
      currency: 'ILS',
      transaction_date: deal.DEALDATETIME?.split('T')[0],
      raw_data: deal,
    };
  }
}

function numeric(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// Response shape (verify against live API - changes occasionally)
interface TaxAuthorityResponse {
  AllResults?: TaxAuthorityDeal[];
  TotalRecords?: number;
}

interface TaxAuthorityDeal {
  KEYVALUE?: string;
  DEALDATETIME?: string;
  DEALAMOUNT?: string | number;
  DEALNATURE?: string | number;
  DEALNATUREDESCRIPTION?: string;
  ASSETROOMNUM?: string | number;
  FLOORNO?: string | number;
  BUILDINGYEAR?: string | number;
  NEIGHBORHOOD?: string;
  DISPLAYADRESS?: string;
  FULLADRESS?: string;
  GUSH?: string;
  HELKA?: string;
}
