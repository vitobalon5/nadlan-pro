'use client';

import * as React from 'react';
import { ArrowUp, ArrowDown, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatILS, formatNumber } from '@/lib/utils';
import type { AnalyticsRow, AnalyticsFilters } from '@/app/actions/analytics';

interface Column {
  key: keyof AnalyticsRow | 'price_per_sqm' | 'actions';
  label: string;
  sortable?: boolean;
  align?: 'start' | 'end' | 'center';
  width?: string;
}

const COLUMNS: Column[] = [
  { key: 'city', label: 'עיר', sortable: true, width: 'w-24' },
  { key: 'neighborhood', label: 'שכונה', width: 'w-28' },
  { key: 'street', label: 'רחוב', width: 'w-36' },
  { key: 'rooms', label: 'חדרים', sortable: true, align: 'center', width: 'w-16' },
  { key: 'area_sqm', label: 'שטח', sortable: true, align: 'end', width: 'w-16' },
  { key: 'floor', label: 'קומה', align: 'center', width: 'w-14' },
  { key: 'price', label: 'מחיר', sortable: true, align: 'end', width: 'w-28' },
  { key: 'price_per_sqm', label: 'למ"ר', sortable: true, align: 'end', width: 'w-24' },
  { key: 'transaction_date', label: 'תאריך', sortable: true, align: 'end', width: 'w-24' },
  { key: 'source', label: 'מקור', align: 'center', width: 'w-24' },
  { key: 'actions', label: '', width: 'w-10' },
];

const SOURCE_LABELS: Record<string, string> = {
  yad2: 'יד2',
  madlan: 'מדלן',
  tax_authority: 'רשות המיסים',
  manual: 'ידני',
};

const SOURCE_VARIANTS: Record<string, 'info' | 'success' | 'warning' | 'secondary'> = {
  tax_authority: 'success',
  madlan: 'info',
  yad2: 'warning',
  manual: 'secondary',
};

interface Props {
  rows: AnalyticsRow[];
  sortBy: AnalyticsFilters['sortBy'];
  sortDir: AnalyticsFilters['sortDir'];
  onSortChange: (sortBy: AnalyticsFilters['sortBy'], sortDir: AnalyticsFilters['sortDir']) => void;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
  };
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function AnalyticsTable({
  rows,
  sortBy,
  sortDir,
  onSortChange,
  pagination,
  onPageChange,
  isLoading,
}: Props) {
  const handleSortClick = (columnKey: string) => {
    const col = COLUMNS.find((c) => c.key === columnKey);
    if (!col?.sortable) return;

    const key = columnKey as AnalyticsFilters['sortBy'];
    if (sortBy === key) {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'desc');
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Desktop/tablet: traditional table */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
              {COLUMNS.map((col) => {
                const isSorted = sortBy === col.key;
                const Icon = isSorted ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : null;

                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 py-2.5 font-medium',
                      col.align === 'end' && 'text-left',
                      col.align === 'center' && 'text-center',
                      col.width
                    )}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSortClick(col.key as string)}
                        className={cn(
                          'inline-flex items-center gap-1 transition-colors',
                          isSorted && 'text-foreground',
                          !isSorted && 'hover:text-foreground'
                        )}
                      >
                        {col.label}
                        {Icon && <Icon className="h-3 w-3" />}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-20 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-3 w-3 shimmer rounded-full" />
                    טוען נתונים...
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-20 text-center">
                  <p className="text-sm text-muted-foreground">לא נמצאו נתונים לסינון הנוכחי</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    נסה לשנות את הסינון או לבצע scraping חדש
                  </p>
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                <td className="px-3 py-2.5 font-medium">{row.city}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.neighborhood ?? '—'}</td>
                <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[144px]">
                  {row.street ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {row.rooms != null ? formatNumber(row.rooms) : '—'}
                </td>
                <td className="px-3 py-2.5 text-left tabular-nums">
                  {row.area_sqm ? `${formatNumber(row.area_sqm)} מ"ר` : '—'}
                </td>
                <td className="px-3 py-2.5 text-center">{row.floor ?? '—'}</td>
                <td className="px-3 py-2.5 text-left font-medium tabular-nums">
                  {row.price != null ? formatILS(row.price) : '—'}
                </td>
                <td className="px-3 py-2.5 text-left tabular-nums text-muted-foreground">
                  {row.price_per_sqm != null ? formatILS(row.price_per_sqm) : '—'}
                </td>
                <td className="px-3 py-2.5 text-left tabular-nums text-muted-foreground">
                  {formatDate(row.transaction_date ?? row.listed_at)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Badge variant={SOURCE_VARIANTS[row.source] ?? 'secondary'}>
                    {SOURCE_LABELS[row.source] ?? row.source}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {row.source_url && (
                    <a
                      href={row.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      aria-label="פתח במקור"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card-per-row layout */}
      <div className="md:hidden">
        {isLoading && rows.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">טוען...</div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">לא נמצאו נתונים</p>
          </div>
        )}
        <div className="divide-y">
          {rows.map((row) => (
            <div key={row.id} className="p-4 hover:bg-accent/30">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{row.city}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[row.neighborhood, row.street].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <Badge variant={SOURCE_VARIANTS[row.source] ?? 'secondary'}>
                  {SOURCE_LABELS[row.source] ?? row.source}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">חדרים</p>
                  <p className="font-medium tabular-nums">
                    {row.rooms != null ? formatNumber(row.rooms) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">שטח</p>
                  <p className="font-medium tabular-nums">
                    {row.area_sqm ? `${row.area_sqm}מ"ר` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">קומה</p>
                  <p className="font-medium tabular-nums">{row.floor ?? '—'}</p>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t flex items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">מחיר</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {row.price != null ? formatILS(row.price) : '—'}
                  </p>
                  {row.price_per_sqm != null && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {formatILS(row.price_per_sqm)}/מ"ר
                    </p>
                  )}
                </div>
                {row.source_url && (
                  <a
                    href={row.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline"
                  >
                    פתח
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalRows > 0 && (
        <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-xs">
          <div className="text-muted-foreground">
            מציג{' '}
            <span className="font-medium text-foreground">
              {(pagination.page - 1) * pagination.pageSize + 1}
              {'–'}
              {Math.min(pagination.page * pagination.pageSize, pagination.totalRows)}
            </span>{' '}
            מתוך <span className="font-medium text-foreground">{formatNumber(pagination.totalRows)}</span> רשומות
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="h-7 px-2"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              הקודם
            </Button>
            <span className="px-2 text-muted-foreground tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="h-7 px-2"
            >
              הבא
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(isoString: string | null): string {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
