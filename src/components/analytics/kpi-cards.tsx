'use client';

import { TrendingUp, Home, Maximize2, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatILS, formatNumber } from '@/lib/utils';
import type { AnalyticsStats } from '@/app/actions/analytics-types';

interface Props {
  stats: AnalyticsStats;
  isLoading?: boolean;
}

export function AnalyticsKpiCards({ stats, isLoading }: Props) {
  const items = [
    {
      label: 'רשומות',
      value: formatNumber(stats.totalCount),
      icon: Home,
      color: 'text-[hsl(var(--primary-600))] bg-[hsl(var(--primary-50))]',
    },
    {
      label: 'מחיר ממוצע',
      value: stats.avgPrice ? formatILS(stats.avgPrice) : '—',
      icon: TrendingUp,
      color: 'text-[hsl(var(--info))] bg-[hsl(var(--info-bg))]',
    },
    {
      label: 'מחיר חציוני',
      value: stats.medianPrice ? formatILS(stats.medianPrice) : '—',
      icon: Building,
      color: 'text-[hsl(var(--success))] bg-[hsl(var(--success-bg))]',
    },
    {
      label: 'ממוצע למ"ר',
      value: stats.avgPricePerSqm ? formatILS(stats.avgPricePerSqm) : '—',
      icon: Maximize2,
      color: 'text-[hsl(var(--warning-foreground))] bg-[hsl(var(--warning-bg))]',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-xl font-semibold">
                {isLoading ? <span className="inline-block h-6 w-20 shimmer rounded" /> : item.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
