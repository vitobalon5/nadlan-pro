import type { ScrapeContext } from '../provider';
import { fetchWithRetry } from './http';

/**
 * Thin wrapper over Apify's REST API.
 * Docs: https://docs.apify.com/api/v2
 *
 * Apify has two ways to run an Actor:
 * - `run-sync-get-dataset-items` — blocks until finished, returns items directly.
 *   Good for small jobs (<5 min), simpler to use.
 * - `runs` — async, returns run ID, poll for completion.
 *   Required for long jobs.
 *
 * We use sync for real-estate actors since a page of listings finishes fast.
 */

const APIFY_BASE = 'https://api.apify.com/v2';

export class ApifyClient {
  private readonly token: string;

  constructor(token?: string) {
    const t = token ?? process.env.APIFY_API_TOKEN;
    if (!t) {
      throw new Error(
        'APIFY_API_TOKEN is not set. Get one at https://console.apify.com/account/integrations'
      );
    }
    this.token = t;
  }

  /**
   * Run an Actor synchronously and return dataset items.
   * Times out at 5 minutes (Apify's hard limit for sync runs).
   */
  async runActor<T = unknown>(
    actorId: string,
    input: unknown,
    ctx: ScrapeContext,
    options: { memoryMb?: number; timeoutSec?: number } = {}
  ): Promise<T[]> {
    const { memoryMb = 512, timeoutSec = 300 } = options;

    const url = new URL(`${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items`);
    url.searchParams.set('token', this.token);
    url.searchParams.set('memory', String(memoryMb));
    url.searchParams.set('timeout', String(timeoutSec));

    ctx.log('info', `Starting Apify actor ${actorId}`, { input });

    const response = await fetchWithRetry(
      url.toString(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        timeoutMs: (timeoutSec + 30) * 1000,
        maxRetries: 2, // Apify runs are expensive, don't retry aggressively
      },
      ctx
    );

    const items = (await response.json()) as T[];
    ctx.log('info', `Apify actor ${actorId} returned ${items.length} items`);
    return items;
  }
}
