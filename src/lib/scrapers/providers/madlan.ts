import type { ScraperProvider, ProviderCapabilities } from '../provider';
import type { ScrapeQuery, ScrapeResult, NormalizedListing } from '../types';
import { NormalizedListingSchema } from '../types';
import { ApifyClient } from '../runtime/apify';

/**
 * Madlan.co.il via Apify.
 *
 * SETUP (required before this provider works):
 *   1. Sign up at https://apify.com
 *   2. Go to https://console.apify.com/store and search for "madlan"
 *   3. Pick an actor that matches your needs (prices vary by actor)
 *   4. Test it from the Apify Console to see the INPUT SCHEMA and OUTPUT SHAPE
 *   5. Set these environment variables:
 *      APIFY_API_TOKEN=your_token_from_account_settings
 *      APIFY_MADLAN_ACTOR_ID=username/actor-name
 *
 * OUTPUT SHAPE:
 *   This provider is defensive — it tolerates missing fields and stashes the
 *   full raw response in `raw_data`. If Madlan/Apify change the schema, broken
 *   fields become null rather than breaking the whole scrape. You can always
 *   re-parse from raw_data later.
 *
 * COST:
 *   Apify charges per "compute unit" (CU). A typical 50-listing scrape uses
 *   ~0.1 CU. Their free tier is ~$5/month which is enough for testing.
 *   For production, monitor usage at https://console.apify.com/billing
 */
export class MadlanApifyProvider implements ScraperProvider {
  readonly source = 'madlan' as const;
  readonly displayName = 'מדלן (דרך Apify)';

  readonly capabilities: ProviderCapabilities = {
    filters: {
      city: true,
      neighborhood: true,
      rooms: true,
      priceRange: true,
      listingType: true, // supports sale + rent
    },
    supportedListingTypes: ['sale', 'rent'],
    runtime: 'apify',
    estimatedRateLimitRps: 1,
    requiresCity: true,
  };

  private readonly actorId: string;

  constructor() {
    this.actorId = process.env.APIFY_MADLAN_ACTOR_ID ?? '';
  }

  async scrape(query: ScrapeQuery, ctx: Parameters<ScraperProvider['scrape']>[1]): Promise<ScrapeResult> {
    // Check env vars at scrape time, not construction time - so the provider
    // can be registered and introspected for capabilities even if unconfigured.
    if (!this.actorId) {
      throw new Error(
        'APIFY_MADLAN_ACTOR_ID is not set. Subscribe to a Madlan actor on Apify and set the env var. ' +
          'See src/lib/scrapers/providers/madlan.ts for setup instructions.'
      );
    }
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN is not set. Get one at https://console.apify.com/account/integrations');
    }

    const startedAt = Date.now();

    if (!query.city) {
      throw new Error('city is required for Madlan provider');
    }

    const client = new ApifyClient();

    // Translate our normalized query to the actor's expected input shape.
    // The exact shape is determined by the actor - check Apify Console for schema.
    const actorInput = {
      city: query.city,
      neighborhood: query.neighborhood,
      dealType: query.listingType === 'rent' ? 'rent' : 'sale',
      minRooms: query.minRooms,
      maxRooms: query.maxRooms,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      maxItems: query.limit ?? 50,
    };

    const rawItems = await client.runActor<MadlanRawListing>(this.actorId, actorInput, ctx, {
      memoryMb: 512,
      timeoutSec: 180,
    });

    const madlanListingType: 'sale' | 'rent' = query.listingType === 'rent' ? 'rent' : 'sale';
    const { valid, invalid, reasons } = this.normalizeAndValidate(
      rawItems,
      madlanListingType
    );

    return {
      listings: valid,
      hasMore: rawItems.length >= (query.limit ?? 50),
      meta: {
        durationMs: Date.now() - startedAt,
        fetchedCount: rawItems.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        invalidReasons: reasons.slice(0, 5),
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(process.env.APIFY_API_TOKEN && process.env.APIFY_MADLAN_ACTOR_ID);
  }

  private normalizeAndValidate(
    rawItems: MadlanRawListing[],
    listingType: 'sale' | 'rent'
  ): { valid: NormalizedListing[]; invalid: MadlanRawListing[]; reasons: string[] } {
    const valid: NormalizedListing[] = [];
    const invalid: MadlanRawListing[] = [];
    const reasons: string[] = [];

    for (const raw of rawItems) {
      const candidate = this.normalize(raw, listingType);
      const result = NormalizedListingSchema.safeParse(candidate);
      if (result.success) {
        valid.push(result.data);
      } else {
        invalid.push(raw);
        reasons.push(result.error.issues[0]?.message ?? 'unknown validation error');
      }
    }

    return { valid, invalid, reasons };
  }

  private normalize(raw: MadlanRawListing, listingType: 'sale' | 'rent'): Partial<NormalizedListing> {
    // Defensive field extraction - actors use different field names
    const get = <T>(obj: any, paths: string[]): T | undefined => {
      for (const path of paths) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
          current = current?.[part];
          if (current == null) break;
        }
        if (current != null) return current as T;
      }
      return undefined;
    };

    const price = get<number>(raw, ['price', 'askingPrice', 'listPrice']);
    const area = get<number>(raw, ['area', 'size', 'squareMeters', 'area_sqm']);
    const rooms = get<number>(raw, ['rooms', 'roomsNumber', 'numberOfRooms']);
    const city = get<string>(raw, ['city', 'location.city', 'address.city']);
    const url = get<string>(raw, ['url', 'link', 'sourceUrl']);

    return {
      source: 'madlan',
      source_id: String(get(raw, ['id', 'listingId', '_id']) ?? url ?? ''),
      listing_type: listingType,
      city: city ?? '',
      neighborhood: get<string>(raw, ['neighborhood', 'location.neighborhood']),
      street: get<string>(raw, ['street', 'location.street']),
      address: get<string>(raw, ['address', 'location.address', 'fullAddress']),
      latitude: get<number>(raw, ['lat', 'latitude', 'location.lat']),
      longitude: get<number>(raw, ['lng', 'lon', 'longitude', 'location.lng']),
      property_type: get<string>(raw, ['propertyType', 'type', 'assetType']),
      rooms: typeof rooms === 'number' ? rooms : undefined,
      area_sqm: typeof area === 'number' ? area : undefined,
      floor: get<number>(raw, ['floor', 'floorNumber']),
      total_floors: get<number>(raw, ['totalFloors', 'maxFloor', 'buildingFloors']),
      year_built: get<number>(raw, ['yearBuilt', 'constructionYear', 'year']),
      has_elevator: get<boolean>(raw, ['hasElevator', 'elevator']),
      has_parking: get<boolean>(raw, ['hasParking', 'parking']),
      has_balcony: get<boolean>(raw, ['hasBalcony', 'balcony']),
      price: typeof price === 'number' ? price : undefined,
      price_per_sqm: price && area ? Math.round(price / area) : undefined,
      currency: 'ILS',
      source_url: url,
      listed_at: get<string>(raw, ['listedAt', 'createdAt', 'publishedAt']),
      raw_data: raw, // always keep the original for debugging
    };
  }
}

/**
 * Expected shape from the Apify actor. The real actor returns more fields —
 * add them to raw_data. Verify current shape at
 * apify.com/swerve/madlan-scraper/input-schema
 */
interface MadlanRawListing {
  id?: string;
  url?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  address?: string;
  lat?: number;
  lng?: number;
  propertyType?: string;
  rooms?: number;
  area?: number;
  floor?: number;
  totalFloors?: number;
  yearBuilt?: number;
  price?: number;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasBalcony?: boolean;
  listedAt?: string;
  [key: string]: unknown;
}
