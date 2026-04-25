import type { ScrapeContext } from '../provider';

export interface FetchOptions extends RequestInit {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Hardened fetch with exponential backoff, honoring 429 Retry-After header,
 * abort signal, and timeout. Use this instead of raw fetch in providers.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  ctx: ScrapeContext
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    timeoutMs = 30_000,
    ...fetchOpts
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (ctx.signal.aborted) throw new Error('Scrape aborted');

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // Combine user's abort signal with our timeout
    const combinedSignal = AbortSignal.any
      ? AbortSignal.any([ctx.signal, timeoutController.signal])
      : ctx.signal;

    try {
      const response = await fetch(url, {
        ...fetchOpts,
        signal: combinedSignal,
        headers: {
          'User-Agent': process.env.SCRAPER_USER_AGENT ?? 'RealEstatePlatform/1.0',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
          ...(fetchOpts.headers ?? {}),
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) return response;

      // 429: honor Retry-After if present, otherwise exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : baseDelayMs * Math.pow(2, attempt);
        ctx.log('warn', `Rate limited on ${url}, waiting ${waitMs}ms`);
        await sleep(waitMs, ctx.signal);
        continue;
      }

      // 5xx: retry with backoff
      if (response.status >= 500 && attempt < maxRetries - 1) {
        ctx.log('warn', `Server error ${response.status} on ${url}, retrying`);
        await sleep(baseDelayMs * Math.pow(2, attempt), ctx.signal);
        continue;
      }

      // 4xx (other than 429): don't retry - fail fast
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (ctx.signal.aborted) throw error;

      if (attempt < maxRetries - 1) {
        const waitMs = baseDelayMs * Math.pow(2, attempt);
        ctx.log('warn', `Fetch failed (attempt ${attempt + 1}/${maxRetries}): ${(error as Error).message}`);
        await sleep(waitMs, ctx.signal);
      }
    }
  }

  throw lastError ?? new Error(`Failed after ${maxRetries} attempts: ${url}`);
}

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new Error('Aborted during sleep'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
