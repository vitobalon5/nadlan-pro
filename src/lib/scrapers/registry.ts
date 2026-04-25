import type { ScraperProvider } from './provider';
import type { DataSource } from './types';
import { TaxAuthorityProvider } from './providers/tax-authority';
import { MadlanApifyProvider } from './providers/madlan';
import { Yad2BrowserProvider } from './providers/yad2';

/**
 * THE ONE PLACE you add a new data source.
 *
 * Adding a provider:
 *   1. Create providers/yoursite.ts implementing ScraperProvider
 *   2. Add `yoursite` to the DataSource enum in types.ts AND the DB migration
 *   3. Add one line to PROVIDERS below
 *
 * That's it. The API route, Server Actions, UI forms, and analytics
 * all adapt automatically via capabilities introspection.
 */

const PROVIDERS: Record<DataSource, () => ScraperProvider> = {
  tax_authority: () => new TaxAuthorityProvider(),
  madlan: () => new MadlanApifyProvider(),
  yad2: () => new Yad2BrowserProvider(),
  manual: () => {
    throw new Error('manual is not a scrapable source');
  },
  other: () => {
    throw new Error('other is not a scrapable source');
  },
};

/** Get a provider instance by source. Throws if source is invalid/unscrapable. */
export function getProvider(source: DataSource): ScraperProvider {
  const factory = PROVIDERS[source];
  if (!factory) throw new Error(`Unknown source: ${source}`);
  return factory();
}

/** List all scrapable providers (for UI dropdown). */
export function listProviders(): ScraperProvider[] {
  const scrapable: DataSource[] = ['tax_authority', 'madlan', 'yad2'];
  return scrapable.map((s) => PROVIDERS[s]());
}

/** Get provider metadata without instantiating full provider. Cheaper for UI. */
export function listProviderSummaries() {
  return listProviders().map((p) => ({
    source: p.source,
    displayName: p.displayName,
    capabilities: p.capabilities,
  }));
}
