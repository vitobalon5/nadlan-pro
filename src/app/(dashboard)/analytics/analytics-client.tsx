'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { AnalyticsKpiCards } from '@/components/analytics/kpi-cards';
import { AnalyticsFilterBar } from '@/components/analytics/filter-bar';
import { AnalyticsTable } from '@/components/analytics/data-table';
import { AnalyticsCharts } from '@/components/analytics/charts-section';
import { ExportExcelButton } from '@/components/analytics/export-button';
import { FadeIn } from '@/components/ui/motion';
import { fetchAnalyticsAction } from '@/app/actions/analytics';
import type {
  AnalyticsFilters,
  AnalyticsResult,
} from '@/app/actions/analytics-types';

interface Props {
  userName: string;
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  source: 'all',
  listingType: 'all',
  page: 1,
  pageSize: 50,
  sortBy: 'transaction_date',
  sortDir: 'desc',
};

export function AnalyticsPageClient({ userName }: Props) {
  const [filters, setFilters] = React.useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [result, setResult] = React.useState<AnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch data whenever filters change.
  // We use a ref to track the latest request to avoid race conditions where
  // a slow earlier request overwrites a faster later one.
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    fetchAnalyticsAction(filters).then((res) => {
      // Only apply result if this is still the latest request
      if (currentRequestId !== requestIdRef.current) return;

      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.error);
      }
      setIsLoading(false);
    });
  }, [filters]);

  const handleFilterChange = (partial: Partial<AnalyticsFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: 1, // any filter change resets to page 1
    }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleSortChange = (
    sortBy: AnalyticsFilters['sortBy'],
    sortDir: AnalyticsFilters['sortDir']
  ) => {
    setFilters((prev) => ({ ...prev, sortBy, sortDir, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="ניתוח שוק"
        description={
          result
            ? `${result.pagination.totalRows.toLocaleString('he-IL')} רשומות תואמות לסינון הנוכחי`
            : 'נתוני שוק שנאספו ממקורות מרובים'
        }
      >
        {result && (
          <ExportExcelButton
            filters={filters}
            stats={result.stats}
            userName={userName}
            totalRows={result.pagination.totalRows}
            disabled={isLoading}
          />
        )}
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] p-3 text-sm">
          <p className="font-medium text-[hsl(var(--destructive))]">שגיאה בטעינת נתונים</p>
          <p className="text-xs mt-0.5 text-[hsl(var(--destructive))] opacity-90">{error}</p>
        </div>
      )}

      <AnalyticsKpiCards
        stats={
          result?.stats ?? {
            totalCount: 0,
            avgPrice: null,
            medianPrice: null,
            avgPricePerSqm: null,
            avgAreaSqm: null,
            avgRooms: null,
          }
        }
        isLoading={isLoading}
      />

      <AnalyticsFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
        isLoading={isLoading}
      />

      <AnalyticsCharts filters={filters} totalRows={result?.pagination.totalRows ?? 0} />

      <FadeIn delay={0.15}>
        <AnalyticsTable
          rows={result?.rows ?? []}
          sortBy={filters.sortBy}
          sortDir={filters.sortDir}
          onSortChange={handleSortChange}
          pagination={
            result?.pagination ?? {
              page: 1,
              pageSize: filters.pageSize,
              totalPages: 0,
              totalRows: 0,
            }
          }
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      </FadeIn>
    </div>
  );
}
