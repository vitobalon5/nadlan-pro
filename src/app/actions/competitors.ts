'use server';

import { createClient } from '@/lib/supabase/server';
import { searchCompetitors, type CompetitorProject } from '@/lib/services/competitors';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

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

export async function fetchCompetitorsAction(
  projectSlug: string
): Promise<ActionResult<CompetitorComparisonResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר' };

  // Load the user's project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, city, neighborhood, address, price_min, price_per_sqm_avg, developer_name, total_units')
    .eq('slug', projectSlug)
    .is('deleted_at', null)
    .single();

  if (projectError || !project) {
    return { ok: false, error: 'הפרויקט לא נמצא' };
  }

  // Run the competitor search
  const searchResult = await searchCompetitors({
    city: project.city,
    address: project.address,
    neighborhood: project.neighborhood,
    maxResults: 6,
  });

  // Build comparison rows — user's project first, then competitors
  const selfRow: CompetitorComparisonRow = {
    isSelf: true,
    name: project.name,
    marketer: project.developer_name ?? null,
    location: [project.neighborhood, project.city].filter(Boolean).join(', '),
    startingPrice: project.price_min != null ? Number(project.price_min) : null,
    areaSqm: null,
    rooms: null,
    pricePerSqm: project.price_per_sqm_avg != null ? Number(project.price_per_sqm_avg) : null,
    pricePerSqmDelta: null,
    source: 'self',
    url: null,
    confidence: 1,
  };

  const selfPpsqm = selfRow.pricePerSqm;

  const competitorRows: CompetitorComparisonRow[] = searchResult.competitors.map((c) =>
    buildComparisonRow(c, project.city, selfPpsqm)
  );

  return {
    ok: true,
    data: {
      rows: [selfRow, ...competitorRows],
      selfPricePerSqm: selfPpsqm,
      searchQuery: searchResult.searchQuery,
      provider: searchResult.provider,
      resultsFetched: searchResult.resultsFetched,
      warnings: searchResult.warnings,
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildComparisonRow(
  c: CompetitorProject,
  defaultCity: string,
  selfPpsqm: number | null
): CompetitorComparisonRow {
  let delta: number | null = null;
  if (selfPpsqm && c.pricePerSqm) {
    delta = Math.round(((c.pricePerSqm - selfPpsqm) / selfPpsqm) * 1000) / 10;
  }

  return {
    isSelf: false,
    name: c.name,
    marketer: c.marketer,
    location: defaultCity,
    startingPrice: c.startingPrice,
    areaSqm: c.areaSqm,
    rooms: c.rooms,
    pricePerSqm: c.pricePerSqm,
    pricePerSqmDelta: delta,
    source: c.source,
    url: c.url,
    confidence: c.confidence,
  };
}
