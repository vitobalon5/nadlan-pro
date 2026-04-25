'use client';

import * as React from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { PriceTrendChart } from './price-trend-chart';
import { PriceDistributionChart } from './price-distribution-chart';
import { RoomsScatterChart } from './rooms-scatter-chart';
import { fetchChartsAction, type ChartsData } from '@/app/actions/analytics-charts';
import type { AnalyticsFilters } from '@/app/actions/analytics';
import { cn } from '@/lib/utils';

interface Props {
  filters: AnalyticsFilters;
  totalRows: number;
}

export function AnalyticsCharts({ filters, totalRows }: Props) {
  const [data, setData] = React.useState<ChartsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Same race-condition-safe pattern as the table
  const requestIdRef = React.useRef(0);

  // Strip pagination+sort fields - charts don't care about those, and we want
  // to avoid re-fetching when only page changes
  const chartRelevantFilters = React.useMemo(
    () => {
      const { page, pageSize, sortBy, sortDir, ...rest } = filters;
      return rest;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filters.city,
      filters.neighborhood,
      filters.source,
      filters.listingType,
      filters.minPrice,
      filters.maxPrice,
      filters.minRooms,
      filters.maxRooms,
      filters.fromDate,
      filters.toDate,
    ]
  );

  React.useEffect(() => {
    if (isCollapsed) return;

    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    fetchChartsAction({ ...chartRelevantFilters, page: 1, pageSize: 50 }).then((res) => {
      if (reqId !== requestIdRef.current) return;

      if (res.ok) {
        setData(res.data);
      } else {
        setError(res.error);
      }
      setIsLoading(false);
    });
  }, [chartRelevantFilters, isCollapsed]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">תצוגה ויזואלית</h2>
          {data?.isSampled && (
            <span
              className="inline-flex items-center rounded-full bg-[hsl(var(--warning-bg))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--warning-foreground))]"
              title={`הגרפים מבוססים על דגימה של ${data.sampleSize} מתוך ${totalRows.toLocaleString('he-IL')} רשומות`}
            >
              דגימה
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              הרחב
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              כווץ
            </>
          )}
        </button>
      </div>

      <div
        className={cn(
          'grid gap-4 transition-all',
          isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        )}
      >
        <div className="overflow-hidden">
          {error ? (
            <div className="rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] p-3 text-sm">
              <p className="font-medium text-[hsl(var(--destructive))]">שגיאה בטעינת הגרפים</p>
              <p className="text-xs mt-0.5 text-[hsl(var(--destructive))] opacity-90">{error}</p>
            </div>
          ) : (
            <>
              <PriceTrendChart data={data?.priceTrend ?? []} isLoading={isLoading} />
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <PriceDistributionChart
                  data={data?.priceDistribution ?? []}
                  isLoading={isLoading}
                />
                <RoomsScatterChart
                  data={data?.roomsScatter ?? []}
                  isSampled={data?.isSampled ?? false}
                  isLoading={isLoading}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
