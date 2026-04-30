/**
 * Types and schemas for analytics actions.
 *
 * Lives outside the 'use server' file because Next.js only allows
 * async function exports from a 'use server' module. Constants,
 * schemas, types and interfaces must live in a regular module.
 */

import { z } from 'zod';

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

export const MAX_EXPORT_ROWS = 5000;
