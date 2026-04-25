'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { generateReport, type ReportInputData } from '@/lib/services/ai-reports';
import { fetchCityData } from '@/lib/services/city-data';
import { searchCompetitors } from '@/lib/services/competitors';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION' | 'INTERNAL' };

async function requireEditor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'אנא התחבר', code: 'UNAUTHORIZED' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) return { error: 'החשבון הושבת', code: 'FORBIDDEN' as const };
  if (profile.role !== 'admin' && profile.role !== 'editor') {
    return { error: 'אין הרשאה ליצור דוחות', code: 'FORBIDDEN' as const };
  }
  return { user, profile, supabase };
}

// ============================================================================
// GATHER DATA - aggregates all data sources into ReportInputData
// ============================================================================

/**
 * Collects data from all sources for a given project.
 * Runs queries in parallel; partial failures degrade gracefully.
 */
async function gatherReportData(projectSlug: string): Promise<{
  data: ReportInputData;
  warnings: string[];
} | null> {
  const supabase = await createClient();
  const warnings: string[] = [];

  // 1. Load the project
  const { data: project } = await supabase
    .from('projects')
    .select(
      'id, name, description, city, neighborhood, address, developer_name, price_min, price_max, price_per_sqm_avg, total_units, construction_start_date, expected_completion_date'
    )
    .eq('slug', projectSlug)
    .is('deleted_at', null)
    .single();

  if (!project) return null;

  // 2. Neighborhood data (city-data service), market data (tax authority listings),
  //    and competitor search - all in parallel
  const [neighborhoodResult, marketResult, competitorsResult] = await Promise.allSettled([
    fetchCityData(project.city, project.neighborhood ?? undefined),

    supabase
      .from('market_listings')
      .select('price, price_per_sqm, area_sqm, rooms')
      .eq('city', project.city)
      .eq('listing_type', 'transaction')
      .gte('transaction_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .limit(500),

    // Best-effort - if no API key, this silently returns empty results
    searchCompetitors({
      city: project.city,
      neighborhood: project.neighborhood,
      address: project.address,
      maxResults: 5,
    }).catch(() => null),
  ]);

  // Process neighborhood
  const neighborhoodData = neighborhoodResult.status === 'fulfilled' ? neighborhoodResult.value : null;
  if (!neighborhoodData) warnings.push('neighborhood data unavailable');

  // Process market data
  let marketData: ReportInputData['marketData'] = null;
  if (marketResult.status === 'fulfilled' && marketResult.value.data) {
    const rows = marketResult.value.data;
    const prices = rows.map((r) => r.price).filter((p): p is number => typeof p === 'number');
    const ppsqms = rows
      .map((r) => r.price_per_sqm)
      .filter((p): p is number => typeof p === 'number');

    if (prices.length > 0) {
      const sorted = [...prices].sort((a, b) => a - b);
      const median =
        sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

      marketData = {
        transactionCount: rows.length,
        avgTransactionPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        medianTransactionPrice: Math.round(median),
        avgPricePerSqm:
          ppsqms.length > 0 ? Math.round(ppsqms.reduce((a, b) => a + b, 0) / ppsqms.length) : null,
        timeframe: '12 חודשים אחרונים',
      };
    }
  } else {
    warnings.push('market data unavailable');
  }

  // Process competitors
  const competitors: ReportInputData['competitors'] =
    competitorsResult.status === 'fulfilled' && competitorsResult.value
      ? competitorsResult.value.competitors.map((c) => ({
          name: c.name,
          marketer: c.marketer,
          pricePerSqm: c.pricePerSqm,
          startingPrice: c.startingPrice,
        }))
      : [];
  if (competitors.length === 0) warnings.push('no competitors found');

  // Transform neighborhood data into the shape ReportInputData expects
  const neighborhoodForReport: ReportInputData['neighborhood'] = neighborhoodData
    ? {
        socioeconomicCluster: neighborhoodData.socioeconomic?.cluster ?? null,
        socioeconomicPercentile: neighborhoodData.socioeconomic?.percentile ?? null,
        avgSchoolRating:
          neighborhoodData.schools.length > 0
            ? Math.round(
                (neighborhoodData.schools.reduce((s, sch) => s + sch.ratingOutOf10, 0) /
                  neighborhoodData.schools.length) *
                  10
              ) / 10
            : null,
        totalPopulation: neighborhoodData.ageDistribution?.total ?? null,
        ageDistribution: neighborhoodData.ageDistribution
          ? {
              youth: neighborhoodData.ageDistribution.youth,
              youngAdults: neighborhoodData.ageDistribution.youngAdults,
              middleAged: neighborhoodData.ageDistribution.middleAged,
              seniors:
                neighborhoodData.ageDistribution.seniors + neighborhoodData.ageDistribution.elderly,
            }
          : null,
      }
    : null;

  return {
    data: {
      project: {
        name: project.name,
        description: project.description,
        city: project.city,
        neighborhood: project.neighborhood,
        address: project.address,
        developer_name: project.developer_name,
        price_min: project.price_min != null ? Number(project.price_min) : null,
        price_max: project.price_max != null ? Number(project.price_max) : null,
        price_per_sqm_avg: project.price_per_sqm_avg != null ? Number(project.price_per_sqm_avg) : null,
        total_units: project.total_units,
        construction_start_date: project.construction_start_date,
        expected_completion_date: project.expected_completion_date,
      },
      neighborhood: neighborhoodForReport,
      marketData,
      competitors,
    },
    warnings,
  };
}

// ============================================================================
// GATHER ONLY (for streaming flow - client calls this first, then POSTs to
// /api/reports/stream with the gathered input to get a live streaming response)
// ============================================================================

export async function gatherReportInputAction(
  projectSlug: string
): Promise<
  ActionResult<{
    projectId: string;
    projectName: string;
    input: ReportInputData;
    warnings: string[];
  }>
> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  const gathered = await gatherReportData(projectSlug);
  if (!gathered) {
    return { ok: false, error: 'הפרויקט לא נמצא', code: 'VALIDATION' };
  }

  // Also fetch project id (not in gathered.data)
  const { data: project } = await auth.supabase
    .from('projects')
    .select('id, name')
    .eq('slug', projectSlug)
    .single();

  if (!project) {
    return { ok: false, error: 'הפרויקט לא נמצא', code: 'VALIDATION' };
  }

  return {
    ok: true,
    data: {
      projectId: project.id,
      projectName: project.name,
      input: gathered.data,
      warnings: gathered.warnings,
    },
  };
}

// ============================================================================
// GENERATE REPORT - calls Gemini and returns HTML
// ============================================================================

export async function generateReportAction(
  projectSlug: string
): Promise<
  ActionResult<{
    html: string;
    inputSnapshot: ReportInputData;
    warnings: string[];
    model: string;
    tokens: { prompt: number; completion: number };
  }>
> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  // Gather all data
  const gathered = await gatherReportData(projectSlug);
  if (!gathered) {
    return { ok: false, error: 'הפרויקט לא נמצא', code: 'VALIDATION' };
  }

  // Generate with Gemini
  try {
    const result = await generateReport({
      input: gathered.data,
      language: 'he',
    });

    return {
      ok: true,
      data: {
        html: result.html,
        inputSnapshot: gathered.data,
        warnings: gathered.warnings,
        model: result.model,
        tokens: {
          prompt: result.promptTokens,
          completion: result.completionTokens,
        },
      },
    };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'שגיאה ביצירת הדוח', code: 'INTERNAL' };
  }
}

// ============================================================================
// SAVE REPORT
// ============================================================================

const saveReportSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  content_html: z.string().min(10).max(100_000),
  ai_original_text: z.string().max(100_000).optional(),
  input_snapshot: z.unknown().optional(),
  model_name: z.string().optional(),
  prompt_tokens: z.number().int().optional(),
  completion_tokens: z.number().int().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export async function saveReportAction(
  input: z.infer<typeof saveReportSchema>
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  const parsed = saveReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
      code: 'VALIDATION',
    };
  }

  // Sanitize HTML - basic defense against stored XSS
  // Strip script/style tags and on* attributes. The editor's own sanitizer
  // also runs client-side, but we defense-in-depth.
  const sanitizedHtml = parsed.data.content_html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\sjavascript:/gi, '');

  const { data, error } = await auth.supabase
    .from('project_reports')
    .insert({
      project_id: parsed.data.project_id,
      report_type: 'market_analysis',
      status: parsed.data.status,
      title: parsed.data.title,
      content_html: sanitizedHtml,
      ai_original_text: parsed.data.ai_original_text ?? null,
      input_snapshot: parsed.data.input_snapshot ?? null,
      model_name: parsed.data.model_name ?? null,
      prompt_token_count: parsed.data.prompt_tokens ?? null,
      completion_token_count: parsed.data.completion_tokens ?? null,
      created_by: auth.user.id,
      updated_by: auth.user.id,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };

  revalidatePath('/projects');
  return { ok: true, data };
}

// ============================================================================
// LIST REPORTS for a project
// ============================================================================

export async function listReportsAction(
  projectId: string
): Promise<
  ActionResult<
    Array<{
      id: string;
      title: string;
      status: string;
      created_at: string;
      updated_at: string;
      model_name: string | null;
    }>
  >
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר', code: 'UNAUTHORIZED' };

  const { data, error } = await supabase
    .from('project_reports')
    .select('id, title, status, created_at, updated_at, model_name')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };
  return { ok: true, data: data ?? [] };
}

// ============================================================================
// DELETE REPORT
// ============================================================================

export async function deleteReportAction(
  reportId: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  if (!z.string().uuid().safeParse(reportId).success) {
    return { ok: false, error: 'Invalid report id', code: 'VALIDATION' };
  }

  const { error } = await auth.supabase.from('project_reports').delete().eq('id', reportId);
  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };

  revalidatePath('/projects');
  return { ok: true, data: { deleted: true } };
}
