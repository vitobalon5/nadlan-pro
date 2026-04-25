import type { DataSource, ScrapeQuery, ScrapeResult } from './types';

/**
 * What each provider declares about itself. This lets the UI show a sensible
 * form (only cities? supports rooms filter? etc) without hardcoding per-source logic.
 */
export interface ProviderCapabilities {
  /** Does the provider support this filter? Missing = not supported. */
  filters: {
    city: boolean;
    neighborhood: boolean;
    rooms: boolean;
    priceRange: boolean;
    listingType: boolean;
  };
  /** Which listing types the provider can actually produce. */
  supportedListingTypes: ('sale' | 'rent' | 'transaction')[];
  /** How this provider is executed — helps the UI warn about long-running jobs. */
  runtime: 'http' | 'apify' | 'browser';
  /** Typical items per second — used for ETA estimation. */
  estimatedRateLimitRps: number;
  /** Does the scraper need a city to be provided, or can it scrape nationally? */
  requiresCity: boolean;
}

/**
 * The one interface every scraper must implement.
 *
 * Adding a new source:
 *   1. Implement this interface in providers/{name}.ts
 *   2. Register it in providers/registry.ts
 *   3. Done — the API route, Server Actions, and UI all work automatically.
 */
export interface ScraperProvider {
  /** Stable identifier (matches DataSource enum). */
  readonly source: DataSource;
  /** Human-readable name shown in UI. */
  readonly displayName: string;
  /** What this provider can and can't do. */
  readonly capabilities: ProviderCapabilities;

  /**
   * Scrape one page of results. Idempotent per query.
   * Must throw on fatal errors (auth, site down). Should NOT throw on
   * individual row parse errors - those go in `meta.invalidReasons`.
   */
  scrape(query: ScrapeQuery, ctx: ScrapeContext): Promise<ScrapeResult>;

  /**
   * Optional health check - returns true if the provider is reachable.
   * Used by /scraping UI to show health dots.
   */
  healthCheck?(): Promise<boolean>;
}

/**
 * Runtime context passed to every scrape call. Providers get logging, abort signal,
 * and config without needing to know where it comes from.
 */
export interface ScrapeContext {
  /** Logger - providers should log at info/warn/error level. */
  log: (level: 'info' | 'warn' | 'error', message: string, meta?: unknown) => void;
  /** Abort signal - providers should respect this on long-running ops. */
  signal: AbortSignal;
  /** Correlation ID for tracing this job across logs. */
  jobId: string;
}
