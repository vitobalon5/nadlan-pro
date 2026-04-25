import { NextResponse } from 'next/server';
import { executeScrape } from '@/lib/scrapers/executor';
import { DataSourceSchema, ScrapeQuerySchema } from '@/lib/scrapers/types';
import { z } from 'zod';

/**
 * POST /api/scrape
 *
 * External trigger for scraping jobs. Used by:
 *   - Cron jobs (Vercel Cron, GitHub Actions, etc.)
 *   - Webhooks from Apify / other scrapers
 *   - Manual curl for testing
 *
 * Authentication: Bearer token that matches CRON_SECRET env var.
 * This is separate from user auth because these calls come from
 * infrastructure, not browsers.
 *
 * Body: { source: string, query: ScrapeQuery }
 *
 * Example:
 *   curl -X POST https://yourapp.com/api/scrape \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"source":"tax_authority","query":{"city":"תל אביב","page":1}}'
 */

const RequestSchema = z.object({
  source: DataSourceSchema,
  query: ScrapeQuerySchema,
});

// Runtime: nodejs because Puppeteer provider needs fs/network primitives
// that aren't available on edge runtime. For http-only providers this could
// be `edge` for lower latency.
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function POST(request: Request) {
  // 1. Authenticate
  const auth = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server' },
      { status: 500 }
    );
  }

  if (auth !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  // 3. Execute with request signal for client disconnect handling
  try {
    const result = await executeScrape({
      source: parsed.data.source,
      query: parsed.data.query,
      triggeredBy: null, // system-triggered
      signal: request.signal,
    });

    return NextResponse.json(result, {
      status: result.status === 'completed' ? 200 : 500,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scrape - List scraping jobs. Same auth.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = createAdminClient();

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100);
  const source = url.searchParams.get('source');

  let query = supabase
    .from('scraping_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (source) query = query.eq('source', source);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data });
}
