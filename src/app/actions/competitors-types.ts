/**
 * Types for competitor comparison action.
 * Lives outside the 'use server' file (only async exports allowed there).
 */

export interface CompetitorComparisonRow {
  /** true for the user's own project (first row, highlighted) */
  isSelf: boolean;
  name: string;
  marketer: string | null;
  location: string;
  startingPrice: number | null;
  areaSqm: number | null;
  rooms: number | null;
  pricePerSqm: number | null;
  /** Percentage delta vs the user's project. null for the self-row. */
  pricePerSqmDelta: number | null;
  source: string;
  url: string | null;
  confidence: number;
}

export interface CompetitorComparisonResult {
  rows: CompetitorComparisonRow[];
  selfPricePerSqm: number | null;
  searchQuery: string;
  provider: string;
  resultsFetched: number;
  warnings: string[];
  /** When this comparison was built */
  generatedAt: string;
}
