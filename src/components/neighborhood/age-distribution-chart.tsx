'use client';

import { Users } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';
import type { AgeDistribution } from '@/lib/services/city-data';

interface Props {
  data: AgeDistribution | null;
  isLoading?: boolean;
  isEstimated?: boolean;
}

const AGE_GROUPS: { key: keyof Omit<AgeDistribution, 'total'>; label: string; color: string }[] = [
  { key: 'youth', label: '0–17', color: 'hsl(var(--info))' },
  { key: 'youngAdults', label: '18–34', color: 'hsl(var(--primary))' },
  { key: 'middleAged', label: '35–54', color: 'hsl(var(--success))' },
  { key: 'seniors', label: '55–74', color: 'hsl(var(--warning))' },
  { key: 'elderly', label: '75+', color: 'hsl(var(--muted-foreground))' },
];

export function AgeDistributionChart({ data, isLoading, isEstimated }: Props) {
  const chartData = data
    ? AGE_GROUPS.map((g) => ({
        name: g.label,
        value: data[g.key],
        color: g.color,
        percentage: Math.round((data[g.key] / data.total) * 100),
      }))
    : [];

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary-50))]">
              <Users className="h-3.5 w-3.5 text-[hsl(var(--primary-600))]" />
            </div>
            <h3 className="text-sm font-medium">התפלגות גילאים</h3>
          </div>
          {isEstimated && !isLoading && (
            <span className="text-[10px] text-muted-foreground">אומדן</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-4 items-center">
            <Skeleton className="h-40 w-40 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        ) : !data ? (
          <EmptyState message="נתוני אוכלוסייה לא זמינים" />
        ) : (
          <>
            <div className="flex gap-4 items-center">
              <div className="relative h-40 w-40 shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<AgeTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center label showing total population */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-semibold tabular-nums">
                    {formatNumber(data.total)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">תושבים</span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5">
                {chartData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 shrink-0">
                      <span className="font-medium tabular-nums">{entry.percentage}%</span>
                      <span className="text-muted-foreground text-[10px] tabular-nums">
                        ({formatNumber(entry.value)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t">
              מקור: הלמ"ס · מפקד אוכלוסין
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AgeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs" dir="rtl">
      <p className="font-medium mb-1">גילאי {d.name}</p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{formatNumber(d.value)}</span> תושבים · {d.percentage}%
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
