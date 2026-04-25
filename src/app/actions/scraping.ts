'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { executeScrape } from '@/lib/scrapers/executor';
import { DataSourceSchema, ScrapeQuerySchema } from '@/lib/scrapers/types';
import { listProviderSummaries } from '@/lib/scrapers/registry';
import { z } from 'zod';

/**
 * Server Actions for scraping operations.
 *
 * All actions check:
 *   1. User is authenticated
 *   2. User is editor or admin (viewers cannot trigger scrapes)
 *
 * Returns discriminated union so the UI can handle success/error cleanly.
 */

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const TriggerInputSchema = z.object({
  source: DataSourceSchema,
  query: ScrapeQuerySchema,
});

/**
 * Trigger a scrape job. Blocks until done (for small sync scrapes).
 * For long scrapes (>30s), prefer calling the /api/scrape route with a cron secret.
 */
export async function triggerScrapeAction(
  input: z.infer<typeof TriggerInputSchema>
): Promise<ActionResult<Awaited<ReturnType<typeof executeScrape>>>> {
  // Authorize
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) return { ok: false, error: 'החשבון לא פעיל' };
  if (profile.role !== 'admin' && profile.role !== 'editor') {
    return { ok: false, error: 'אין הרשאה להפעיל scraping' };
  }

  // Validate input
  const parsed = TriggerInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  // Execute
  try {
    const result = await executeScrape({
      source: parsed.data.source,
      query: parsed.data.query,
      triggeredBy: user.id,
    });

    revalidatePath('/scraping');
    revalidatePath('/market-analysis');

    return { ok: true, data: result };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'שגיאה ב-scraping' };
  }
}

/**
 * List all available scraping providers with their capabilities.
 * UI uses this to render the trigger form dynamically per provider.
 * Also checks health status (whether env vars are set) for each.
 */
export async function listProvidersAction(): Promise<
  ActionResult<
    Array<
      ReturnType<typeof listProviderSummaries>[number] & { healthy: boolean }
    >
  >
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר' };

  const summaries = listProviderSummaries();

  // Check health for each in parallel
  const { getProvider } = await import('@/lib/scrapers/registry');
  const withHealth = await Promise.all(
    summaries.map(async (s) => {
      try {
        const p = getProvider(s.source);
        const healthy = p.healthCheck ? await p.healthCheck() : true;
        return { ...s, healthy };
      } catch {
        return { ...s, healthy: false };
      }
    })
  );

  return { ok: true, data: withHealth };
}

/**
 * Recent jobs - for /scraping dashboard.
 */
export async function listRecentJobsAction(limit = 20): Promise<
  ActionResult<
    Array<{
      id: string;
      source: string;
      status: string;
      items_found: number | null;
      items_new: number | null;
      items_failed: number | null;
      started_at: string | null;
      completed_at: string | null;
      error_message: string | null;
    }>
  >
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scraping_jobs')
    .select(
      'id, source, status, items_found, items_new, items_failed, started_at, completed_at, error_message'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}
