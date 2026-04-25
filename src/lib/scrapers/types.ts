import { z } from 'zod';

/**
 * The canonical shape of a real-estate listing in our system.
 * Every provider — no matter the source — must normalize its output to this.
 *
 * This is our "anti-corruption layer": external data shapes change, break,
 * and differ wildly. We isolate that chaos at the provider boundary.
 */

export const ListingTypeSchema = z.enum(['sale', 'rent', 'transaction']);
export type ListingType = z.infer<typeof ListingTypeSchema>;

export const DataSourceSchema = z.enum([
  'yad2',
  'madlan',
  'tax_authority',
  'manual',
  'other',
]);
export type DataSource = z.infer<typeof DataSourceSchema>;

/**
 * Strict schema: a provider that produces data violating this will fail
 * validation and the failure will be logged, not silently corrupted into DB.
 */
export const NormalizedListingSchema = z.object({
  // Identity
  source: DataSourceSchema,
  source_id: z.string().min(1, 'source_id is required'),
  listing_type: ListingTypeSchema,

  // Location
  city: z.string().min(1),
  neighborhood: z.string().optional(),
  street: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  gush: z.string().optional(),
  helka: z.string().optional(),

  // Property
  property_type: z.string().optional(),
  rooms: z.number().min(0).max(30).optional(),
  area_sqm: z.number().positive().optional(),
  floor: z.number().int().optional(),
  total_floors: z.number().int().positive().optional(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional(),
  has_elevator: z.boolean().optional(),
  has_parking: z.boolean().optional(),
  has_balcony: z.boolean().optional(),
  has_storage: z.boolean().optional(),
  has_shelter: z.boolean().optional(),
  is_renovated: z.boolean().optional(),

  // Price (sanity bounds to catch garbage data)
  price: z.number().positive().max(1_000_000_000).optional(),
  price_per_sqm: z.number().positive().max(500_000).optional(),
  currency: z.string().default('ILS'),

  // Provenance (critical - never lose the original)
  source_url: z.string().url().optional(),
  listed_at: z.string().datetime().optional(),
  transaction_date: z.string().optional(), // ISO date (yyyy-mm-dd)
  raw_data: z.unknown().optional(),
});

export type NormalizedListing = z.infer<typeof NormalizedListingSchema>;

/**
 * Query params that a provider accepts. Not all providers support all params -
 * providers advertise their capabilities via `ProviderCapabilities`.
 */
export const ScrapeQuerySchema = z.object({
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  minRooms: z.number().min(0).max(30).optional(),
  maxRooms: z.number().min(0).max(30).optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  listingType: ListingTypeSchema.optional(),
  // Pagination
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(50),
});

export type ScrapeQuery = z.infer<typeof ScrapeQuerySchema>;

/**
 * What a provider returns from a single scrape call.
 */
export interface ScrapeResult {
  listings: NormalizedListing[];
  hasMore: boolean;
  nextCursor?: string | number;
  /** Informational metadata — logged, not stored. */
  meta: {
    durationMs: number;
    fetchedCount: number;
    validCount: number;
    invalidCount: number;
    invalidReasons?: string[];
  };
}
