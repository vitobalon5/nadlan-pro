import { createAdminClient } from '@/lib/supabase/server';
import { getProvider } from './registry';
import type { ScrapeQuery } from './types';
import type { DataSource } from './types';

/**
 * The only function that actually executes a scrape end-to-end:
 *   1. Record job start in scraping_jobs
 *   2. Call provider.scrape()
 *   3. Upsert results into market_listings
 *   4. Record job completion (or failure)
 *
 * Both the POST /api/scrape route AND the triggerScrape() Server Action
 * delegate here, so the logic exists in exactly one place.
 *
 * Uses the admin client (service_role) to bypass RLS — this is correct because
 * caller authorization happens at the API/Action boundary, not here.
 */

export interface ExecuteScrapeInput {
  source: DataSource;
  query: ScrapeQuery;
  triggeredBy: string | null;
  /** Optional abort signal (e.g. request cancellation). */
  signal?: AbortSignal;
}

export interface ExecuteScrapeResult {
  jobId: string;
  status: 'completed' | 'failed';
  itemsFound: number;
  itemsNew: number;
  itemsUpdated: number;
  itemsFailed: number;
  durationMs: number;
  error?: string;
}

export async function executeScrape(input: ExecuteScrapeInput): Promise<ExecuteScrapeResult> {
  const supabase = createAdminClient();
  const startedAt = Date.now();

  // 1. Create job record - this gives us an ID to track everything by
  const { data: job, error: jobError } = await supabase
    .from('scraping_jobs')
    .insert({
      source: input.source,
      target_params: input.query,
      status: 'running',
      started_at: new Date().toISOString(),
      triggered_by: input.triggeredBy,
    })
    .select('id')
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to create scraping job: ${jobError?.message}`);
  }

  const jobId = job.id as string;
  const abortController = new AbortController();
  if (input.signal) {
    input.signal.addEventListener('abort', () => abortController.abort(), { once: true });
  }

  const logs: Array<{ level: string; message: string; meta?: unknown }> = [];
  const ctx = {
    jobId,
    signal: abortController.signal,
    log: (level: 'info' | 'warn' | 'error', message: string, meta?: unknown) => {
      logs.push({ level, message, meta });
      // Also mirror to console for local dev; in prod pipe to your logging service
      const prefix = `[scrape:${jobId.slice(0, 8)}:${input.source}]`;
      if (level === 'error') console.error(prefix, message, meta);
      else if (level === 'warn') console.warn(prefix, message, meta);
      else console.log(prefix, message, meta);
    },
  };

  try {
    // 2. Run the provider
    const provider = getProvider(input.source);
    const result = await provider.scrape(input.query, ctx);

    // 3. Upsert results - unique (source, source_id) handles duplicates
    let itemsNew = 0;
    let itemsUpdated = 0;

    if (result.listings.length > 0) {
      // Check which are new vs updated BEFORE upsert for accurate counts
      const ids = result.listings.map((l) => l.source_id);
      const { data: existing } = await supabase
        .from('market_listings')
        .select('source_id')
        .eq('source', input.source)
        .in('source_id', ids);

      const existingIds = new Set((existing ?? []).map((r) => r.source_id));
      itemsNew = result.listings.filter((l) => !existingIds.has(l.source_id)).length;
      itemsUpdated = result.listings.length - itemsNew;

      // Upsert in batches of 100 to avoid hitting Postgres limits
      const BATCH = 100;
      for (let i = 0; i < result.listings.length; i += BATCH) {
        const batch = result.listings.slice(i, i + BATCH);
        const { error: upsertError } = await supabase.from('market_listings').upsert(
          batch.map((l) => ({
            ...l,
            raw_data: l.raw_data ?? null,
            scraped_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'source,source_id', ignoreDuplicates: false }
        );

        if (upsertError) {
          ctx.log('error', `Batch upsert failed: ${upsertError.message}`);
          throw upsertError;
        }
      }
    }

    const durationMs = Date.now() - startedAt;

    // 4. Mark job complete
    await supabase
      .from('scraping_jobs')
      .update({
        status: 'completed',
        items_found: result.meta.fetchedCount,
        items_new: itemsNew,
        items_updated: itemsUpdated,
        items_failed: result.meta.invalidCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return {
      jobId,
      status: 'completed',
      itemsFound: result.meta.fetchedCount,
      itemsNew,
      itemsUpdated,
      itemsFailed: result.meta.invalidCount,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error?.message ?? 'Unknown error';

    await supabase
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return {
      jobId,
      status: 'failed',
      itemsFound: 0,
      itemsNew: 0,
      itemsUpdated: 0,
      itemsFailed: 0,
      durationMs,
      error: errorMessage,
    };
  }
}
