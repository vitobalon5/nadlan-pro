/**
 * Types for analytics chart actions.
 *
 * Lives outside the 'use server' file because Next.js only allows
 * async function exports from a 'use server' module.
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
