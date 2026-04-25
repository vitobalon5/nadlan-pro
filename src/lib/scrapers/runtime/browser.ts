import type { ScrapeContext } from '../provider';

/**
 * Puppeteer wrapper for sites that need a real browser (JS-heavy SPAs,
 * anti-bot challenges). Uses dynamic import so Puppeteer isn't loaded
 * in Edge runtime or during build if no browser provider is actually used.
 *
 * IMPORTANT: Puppeteer is a heavy dependency (~300MB). Install with:
 *   npm install puppeteer
 *
 * For Vercel/serverless, use `@sparticuz/chromium` + `puppeteer-core`:
 *   npm install puppeteer-core @sparticuz/chromium
 *
 * This file works with both; it picks based on NODE_ENV.
 */

interface BrowserPage {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<void>;
  content(): Promise<string>;
  evaluate<R>(fn: () => R): Promise<R>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<unknown>;
  close(): Promise<void>;
}

interface BrowserInstance {
  newPage(): Promise<BrowserPage>;
  close(): Promise<void>;
}

let sharedBrowser: BrowserInstance | null = null;

async function launchBrowser(): Promise<BrowserInstance> {
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    // Lazy-load to avoid bundling in local dev
    const [{ default: chromium }, puppeteer] = await Promise.all([
      import('@sparticuz/chromium').catch(() => ({ default: null })),
      import('puppeteer-core').catch(() => null),
    ]);

    if (!chromium || !puppeteer) {
      throw new Error(
        'Serverless Puppeteer requires @sparticuz/chromium and puppeteer-core. ' +
          'Install: npm install puppeteer-core @sparticuz/chromium'
      );
    }

    return (await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })) as unknown as BrowserInstance;
  }

  // Local / long-running server
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer) {
    throw new Error('Puppeteer not installed. Run: npm install puppeteer');
  }

  return (await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })) as unknown as BrowserInstance;
}

/**
 * Run a function with a browser page. Handles setup/cleanup automatically.
 * Reuses the browser across calls within a single process for efficiency.
 */
export async function withPage<T>(
  ctx: ScrapeContext,
  fn: (page: BrowserPage) => Promise<T>
): Promise<T> {
  if (!sharedBrowser) {
    ctx.log('info', 'Launching browser');
    sharedBrowser = await launchBrowser();
  }

  const page = await sharedBrowser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Gracefully close the shared browser. Call on server shutdown.
 * Next.js doesn't give us a clean shutdown hook, so we register a process listener.
 */
export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
  }
}

if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    closeBrowser();
  });
}
