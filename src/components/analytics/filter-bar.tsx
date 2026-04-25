'use client';

import * as React from 'react';
import { X, Filter, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AnalyticsFilters } from '@/app/actions/analytics';

interface Props {
  filters: AnalyticsFilters;
  onChange: (filters: Partial<AnalyticsFilters>) => void;
  onReset: () => void;
  isLoading?: boolean;
}

/**
 * Date presets - covers the most common queries in one click.
 */
function getDatePreset(preset: '7d' | '30d' | '90d' | '12m' | 'ytd'): {
  fromDate: string;
  toDate: string;
} {
  const now = new Date();
  const toDate = now.toISOString().slice(0, 10);
  const from = new Date(now);

  switch (preset) {
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case '12m':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case 'ytd':
      from.setMonth(0, 1);
      break;
  }

  return { fromDate: from.toISOString().slice(0, 10), toDate };
}

export function AnalyticsFilterBar({ filters, onChange, onReset, isLoading }: Props) {
  // Local state for price/room inputs so typing isn't laggy.
  // We only propagate to parent after debounce.
  const [localCity, setLocalCity] = React.useState(filters.city ?? '');
  const [localNeighborhood, setLocalNeighborhood] = React.useState(filters.neighborhood ?? '');
  const [localMinPrice, setLocalMinPrice] = React.useState(
    filters.minPrice?.toString() ?? ''
  );
  const [localMaxPrice, setLocalMaxPrice] = React.useState(
    filters.maxPrice?.toString() ?? ''
  );
  const [localMinRooms, setLocalMinRooms] = React.useState(filters.minRooms?.toString() ?? '');
  const [localMaxRooms, setLocalMaxRooms] = React.useState(filters.maxRooms?.toString() ?? '');

  // Sync local state when parent filters change (e.g. on reset)
  React.useEffect(() => {
    setLocalCity(filters.city ?? '');
    setLocalNeighborhood(filters.neighborhood ?? '');
    setLocalMinPrice(filters.minPrice?.toString() ?? '');
    setLocalMaxPrice(filters.maxPrice?.toString() ?? '');
    setLocalMinRooms(filters.minRooms?.toString() ?? '');
    setLocalMaxRooms(filters.maxRooms?.toString() ?? '');
  }, [filters]);

  // Debounced commit to parent
  React.useEffect(() => {
    const t = setTimeout(() => {
      const next: Partial<AnalyticsFilters> = {};
      const trimmedCity = localCity.trim() || undefined;
      const trimmedNeigh = localNeighborhood.trim() || undefined;
      const minP = localMinPrice ? Number(localMinPrice) : undefined;
      const maxP = localMaxPrice ? Number(localMaxPrice) : undefined;
      const minR = localMinRooms ? Number(localMinRooms) : undefined;
      const maxR = localMaxRooms ? Number(localMaxRooms) : undefined;

      if (trimmedCity !== filters.city) next.city = trimmedCity;
      if (trimmedNeigh !== filters.neighborhood) next.neighborhood = trimmedNeigh;
      if (minP !== filters.minPrice) next.minPrice = minP;
      if (maxP !== filters.maxPrice) next.maxPrice = maxP;
      if (minR !== filters.minRooms) next.minRooms = minR;
      if (maxR !== filters.maxRooms) next.maxRooms = maxR;

      if (Object.keys(next).length > 0) onChange(next);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCity, localNeighborhood, localMinPrice, localMaxPrice, localMinRooms, localMaxRooms]);

  const activeFilterCount = [
    filters.city,
    filters.neighborhood,
    filters.source !== 'all' ? 1 : null,
    filters.listingType !== 'all' ? 1 : null,
    filters.minPrice,
    filters.maxPrice,
    filters.minRooms,
    filters.maxRooms,
    filters.fromDate,
    filters.toDate,
  ].filter(Boolean).length;

  const applyDatePreset = (preset: '7d' | '30d' | '90d' | '12m' | 'ytd') => {
    const { fromDate, toDate } = getDatePreset(preset);
    onChange({ fromDate, toDate });
  };

  return (
    <div className="rounded-xl border bg-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">סינון</h3>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-[hsl(var(--primary-100))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--primary-900))]">
            {activeFilterCount} פעילים
          </span>
        )}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isLoading}
            className="mr-auto h-7 text-xs"
          >
            <X className="h-3 w-3" />
            נקה הכל
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        <FormField label="עיר" htmlFor="city">
          <Input
            id="city"
            placeholder="תל אביב"
            value={localCity}
            onChange={(e) => setLocalCity(e.target.value)}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="שכונה" htmlFor="neighborhood">
          <Input
            id="neighborhood"
            placeholder="נווה צדק"
            value={localNeighborhood}
            onChange={(e) => setLocalNeighborhood(e.target.value)}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="מקור" htmlFor="source-filter">
          <Select
            value={filters.source}
            onValueChange={(v) => onChange({ source: v as any })}
            disabled={isLoading}
          >
            <SelectTrigger id="source-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המקורות</SelectItem>
              <SelectItem value="tax_authority">רשות המיסים</SelectItem>
              <SelectItem value="madlan">מדלן</SelectItem>
              <SelectItem value="yad2">יד2</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="סוג עסקה" htmlFor="type-filter">
          <Select
            value={filters.listingType}
            onValueChange={(v) => onChange({ listingType: v as any })}
            disabled={isLoading}
          >
            <SelectTrigger id="type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="transaction">עסקאות</SelectItem>
              <SelectItem value="sale">מכירה</SelectItem>
              <SelectItem value="rent">השכרה</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="מחיר מ-" htmlFor="min-price">
            <Input
              id="min-price"
              type="number"
              step="100000"
              placeholder="2M"
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
              disabled={isLoading}
            />
          </FormField>
          <FormField label="עד" htmlFor="max-price">
            <Input
              id="max-price"
              type="number"
              step="100000"
              placeholder="8M"
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
              disabled={isLoading}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="חדרים מ-" htmlFor="min-rooms">
            <Input
              id="min-rooms"
              type="number"
              step="0.5"
              min="0"
              placeholder="3"
              value={localMinRooms}
              onChange={(e) => setLocalMinRooms(e.target.value)}
              disabled={isLoading}
            />
          </FormField>
          <FormField label="עד" htmlFor="max-rooms">
            <Input
              id="max-rooms"
              type="number"
              step="0.5"
              min="0"
              placeholder="5"
              value={localMaxRooms}
              onChange={(e) => setLocalMaxRooms(e.target.value)}
              disabled={isLoading}
            />
          </FormField>
        </div>

        <FormField label="מתאריך" htmlFor="from-date">
          <Input
            id="from-date"
            type="date"
            value={filters.fromDate ?? ''}
            onChange={(e) => onChange({ fromDate: e.target.value || undefined })}
            disabled={isLoading}
          />
        </FormField>

        <FormField label="עד תאריך" htmlFor="to-date">
          <Input
            id="to-date"
            type="date"
            value={filters.toDate ?? ''}
            onChange={(e) => onChange({ toDate: e.target.value || undefined })}
            disabled={isLoading}
          />
        </FormField>
      </div>

      {/* Date presets */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">טווחים מהירים:</span>
        <div className="flex flex-wrap gap-1">
          {(
            [
              { key: '7d', label: 'שבוע אחרון' },
              { key: '30d', label: '30 יום' },
              { key: '90d', label: '3 חודשים' },
              { key: '12m', label: 'שנה' },
              { key: 'ytd', label: 'מתחילת שנה' },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              onClick={() => applyDatePreset(p.key)}
              disabled={isLoading}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs transition-colors',
                'hover:bg-accent hover:border-[hsl(var(--border-strong))] disabled:opacity-50'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
