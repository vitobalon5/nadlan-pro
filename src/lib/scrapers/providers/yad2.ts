import type { ScraperProvider, ProviderCapabilities } from '../provider';
import type { ScrapeQuery, ScrapeResult, NormalizedListing } from '../types';
import { NormalizedListingSchema } from '../types';
import { withPage } from '../runtime/browser';

/**
 * Yad2 via Puppeteer - demonstrates the browser runtime pattern.
 *
 * ⚠ IMPORTANT CAVEATS:
 * 1. Yad2 has aggressive anti-bot (Cloudflare Bot Fight Mode). Running this
 *    from a residential IP works, from datacenter IPs usually blocks within
 *    minutes. For production, use Apify instead (they also have a Yad2 actor).
 * 2. You MUST review Yad2's Terms of Service before using this at scale.
 * 3. Puppeteer install is ~300MB. If you never use this provider, remove
 *    puppeteer from package.json.
 *
 * This file is intentionally conservative: small batches, long delays,
 * visible User-Agent. Anything more aggressive will get you blocked.
 */
export class Yad2BrowserProvider implements ScraperProvider {
  readonly source = 'yad2' as const;
  readonly displayName = 'יד2 (Puppeteer)';

  readonly capabilities: ProviderCapabilities = {
    filters: {
      city: true,
      neighborhood: true,
      rooms: true,
      priceRange: true,
      listingType: true,
    },
    supportedListingTypes: ['sale', 'rent'],
    runtime: 'browser',
    estimatedRateLimitRps: 0.2, // Very conservative - 1 page per 5 seconds
    requiresCity: true,
  };

  async scrape(query: ScrapeQuery, ctx: Parameters<ScraperProvider['scrape']>[1]): Promise<ScrapeResult> {
    const startedAt = Date.now();

    if (!query.city) {
      throw new Error('city is required for Yad2 provider');
    }

    const url = this.buildUrl(query);
    ctx.log('info', `Yad2: navigating to ${url}`);

    const rawItems = await withPage(ctx, async (page) => {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });

      // Wait for listings container - adjust selector after inspecting Yad2 DOM
      await page.waitForSelector('[data-testid="feeditem"]', { timeout: 10_000 });

      // Extract data from the rendered page
      return page.evaluate<Yad2RawItem[]>(() => {
        const items: Yad2RawItem[] = [];
        const cards = document.querySelectorAll<HTMLElement>('[data-testid="feeditem"]');

        cards.forEach((card) => {
          const link = card.querySelector('a')?.getAttribute('href') ?? '';
          const priceText = card.querySelector('[data-testid="price"]')?.textContent?.trim() ?? '';
          const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

          const roomsText =
            card.querySelector('[data-testid="rooms"]')?.textContent?.trim() ?? '';
          const rooms = parseFloat(roomsText) || undefined;

          const areaText = card.querySelector('[data-testid="area"]')?.textContent?.trim() ?? '';
          const area = parseInt(areaText, 10) || undefined;

          const floorText =
            card.querySelector('[data-testid="floor"]')?.textContent?.trim() ?? '';
          const floor = parseInt(floorText, 10) || undefined;

          const address =
            card.querySelector('[data-testid="address"]')?.textContent?.trim() ?? '';

          const id = link.split('/').pop() || link;

          items.push({
            id,
            url: link.startsWith('http') ? link : `https://www.yad2.co.il${link}`,
            price: Number.isFinite(price) ? price : undefined,
            rooms,
            area,
            floor,
            address,
          });
        });

        return items;
      });
    });

    ctx.log('info', `Yad2: extracted ${rawItems.length} items`);

    const yad2ListingType: 'sale' | 'rent' = query.listingType === 'rent' ? 'rent' : 'sale';
    const { valid, invalid, reasons } = this.normalizeAndValidate(
      rawItems,
      query.city,
      yad2ListingType
    );

    return {
      listings: valid,
      hasMore: rawItems.length >= 20,
      meta: {
        durationMs: Date.now() - startedAt,
        fetchedCount: rawItems.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        invalidReasons: reasons.slice(0, 5),
      },
    };
  }

  private buildUrl(query: ScrapeQuery): string {
    const base = process.env.YAD2_BASE_URL ?? 'https://www.yad2.co.il';
    const section = query.listingType === 'rent' ? 'rent' : 'forsale';
    const params = new URLSearchParams();
    params.set('city', query.city ?? '');
    if (query.minRooms) params.set('rooms', String(query.minRooms));
    if (query.minPrice) params.set('price', `${query.minPrice}-${query.maxPrice ?? ''}`);
    if (query.page && query.page > 1) params.set('page', String(query.page));
    return `${base}/realestate/${section}?${params.toString()}`;
  }

  private normalizeAndValidate(
    rawItems: Yad2RawItem[],
    city: string,
    listingType: 'sale' | 'rent'
  ) {
    const valid: NormalizedListing[] = [];
    const invalid: Yad2RawItem[] = [];
    const reasons: string[] = [];

    for (const raw of rawItems) {
      const candidate: Partial<NormalizedListing> = {
        source: 'yad2',
        source_id: raw.id ?? raw.url ?? '',
        listing_type: listingType,
        city,
        address: raw.address,
        rooms: raw.rooms,
        area_sqm: raw.area,
        floor: raw.floor,
        price: raw.price,
        price_per_sqm:
          raw.price && raw.area ? Math.round(raw.price / raw.area) : undefined,
        currency: 'ILS',
        source_url: raw.url,
        raw_data: raw,
      };

      const result = NormalizedListingSchema.safeParse(candidate);
      if (result.success) {
        valid.push(result.data);
      } else {
        invalid.push(raw);
        reasons.push(result.error.issues[0]?.message ?? 'unknown');
      }
    }

    return { valid, invalid, reasons };
  }
}

interface Yad2RawItem {
  id?: string;
  url?: string;
  price?: number;
  rooms?: number;
  area?: number;
  floor?: number;
  address?: string;
}
