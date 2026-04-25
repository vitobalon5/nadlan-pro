'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchCityData } from '@/lib/services/city-data';
import { searchCompetitors } from '@/lib/services/competitors';
import type { FullExportData } from '@/lib/export/project-excel';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Gathers ALL project data for export.
 * Runs all data sources in parallel, falls back gracefully on failures.
 * Same gather logic as reports.ts, but shaped for export needs.
 */
export async function gatherExportDataAction(
  projectSlug: string
): Promise<ActionResult<Omit<FullExportData, 'generatedAt' | 'generatedBy'>>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר' };

  // 1. Load the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', projectSlug)
    .is('deleted_at', null)
    .single();

  if (projectError || !project) {
    return { ok: false, error: 'הפרויקט לא נמצא' };
  }

  // 2. Parallel fetches
  const [
    unitsResult,
    mediaResult,
    demographicsResult,
    competitorsResult,
    transactionsResult,
    reportResult,
  ] = await Promise.allSettled([
    supabase
      .from('project_units')
      .select('unit_number, floor, rooms, area_sqm, price, price_per_sqm, status')
      .eq('project_id', project.id)
      .order('unit_number', { ascending: true }),

    supabase
      .from('project_media')
      .select('id, public_url, media_type, file_name, is_cover, display_order')
      .eq('project_id', project.id)
      .in('media_type', ['image', 'rendering'])
      .order('is_cover', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(6),

    fetchCityData(project.city, project.neighborhood ?? undefined),

    searchCompetitors({
      city: project.city,
      neighborhood: project.neighborhood,
      address: project.address,
      maxResults: 6,
    }).catch(() => null),

    supabase
      .from('market_listings')
      .select('city, neighborhood, street, rooms, area_sqm, price, price_per_sqm, transaction_date')
      .eq('city', project.city)
      .eq('listing_type', 'transaction')
      .order('transaction_date', { ascending: false })
      .limit(100),

    supabase
      .from('project_reports')
      .select('content_html')
      .eq('project_id', project.id)
      .eq('report_type', 'market_analysis')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Process results - none of these failing should abort the export
  const units =
    unitsResult.status === 'fulfilled' && unitsResult.value.data ? unitsResult.value.data : [];
  const media =
    mediaResult.status === 'fulfilled' && mediaResult.value.data ? mediaResult.value.data : [];

  const demographics =
    demographicsResult.status === 'fulfilled'
      ? transformDemographics(demographicsResult.value)
      : null;

  const competitorsRaw =
    competitorsResult.status === 'fulfilled' && competitorsResult.value
      ? competitorsResult.value.competitors
      : [];

  const selfPpsqm = project.price_per_sqm_avg != null ? Number(project.price_per_sqm_avg) : null;
  const competitors = competitorsRaw.map((c) => ({
    name: c.name,
    marketer: c.marketer,
    rooms: c.rooms,
    areaSqm: c.areaSqm,
    startingPrice: c.startingPrice,
    pricePerSqm: c.pricePerSqm,
    deltaPct:
      selfPpsqm && c.pricePerSqm
        ? Math.round(((c.pricePerSqm - selfPpsqm) / selfPpsqm) * 1000) / 10
        : null,
    source: c.source,
    url: c.url,
  }));

  const transactions =
    transactionsResult.status === 'fulfilled' && transactionsResult.value.data
      ? transactionsResult.value.data.map((t) => ({
          city: t.city,
          neighborhood: t.neighborhood,
          street: t.street,
          rooms: t.rooms,
          areaSqm: t.area_sqm,
          price: t.price != null ? Number(t.price) : null,
          pricePerSqm: t.price_per_sqm != null ? Number(t.price_per_sqm) : null,
          transactionDate: t.transaction_date,
        }))
      : [];

  const aiReportText =
    reportResult.status === 'fulfilled' && reportResult.value.data?.content_html
      ? reportResult.value.data.content_html
      : null;

  return {
    ok: true,
    data: {
      project: {
        name: project.name,
        slug: project.slug,
        description: project.description,
        city: project.city,
        neighborhood: project.neighborhood,
        address: project.address,
        developer_name: project.developer_name,
        project_type: project.project_type,
        status: project.status,
        price_min: project.price_min != null ? Number(project.price_min) : null,
        price_max: project.price_max != null ? Number(project.price_max) : null,
        price_per_sqm_avg: selfPpsqm,
        total_units: project.total_units,
        available_units: project.available_units,
        floors: project.floors,
        construction_start_date: project.construction_start_date,
        expected_completion_date: project.expected_completion_date,
      },
      units: units.map((u) => ({
        unit_number: u.unit_number,
        floor: u.floor,
        rooms: u.rooms != null ? Number(u.rooms) : null,
        area_sqm: u.area_sqm != null ? Number(u.area_sqm) : null,
        price: u.price != null ? Number(u.price) : null,
        price_per_sqm: u.price_per_sqm != null ? Number(u.price_per_sqm) : null,
        status: u.status,
      })),
      competitors,
      demographics,
      transactions,
      aiReportText,
      // Extra data for PDF: media URLs
      media: media.map((m: any) => ({
        url: m.public_url as string,
        isCover: m.is_cover as boolean,
        type: m.media_type as string,
      })),
    } as any,
  };
}

function transformDemographics(cityData: any): FullExportData['demographics'] {
  if (!cityData) return null;

  return {
    socioeconomicCluster: cityData.socioeconomic?.cluster ?? null,
    socioeconomicPercentile: cityData.socioeconomic?.percentile ?? null,
    avgSchoolRating:
      cityData.schools.length > 0
        ? Math.round(
            (cityData.schools.reduce((s: number, sch: any) => s + sch.ratingOutOf10, 0) /
              cityData.schools.length) *
              10
          ) / 10
        : null,
    totalPopulation: cityData.ageDistribution?.total ?? null,
    ageDistribution: cityData.ageDistribution
      ? {
          youth: cityData.ageDistribution.youth,
          youngAdults: cityData.ageDistribution.youngAdults,
          middleAged: cityData.ageDistribution.middleAged,
          seniors: cityData.ageDistribution.seniors,
          elderly: cityData.ageDistribution.elderly,
        }
      : null,
    schools: cityData.schools.map((s: any) => ({
      name: s.name,
      level: s.level,
      ratingOutOf10: s.ratingOutOf10,
      studentCount: s.studentCount,
    })),
  };
}
