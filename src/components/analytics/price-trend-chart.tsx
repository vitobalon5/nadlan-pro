'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { formatILS } from '@/lib/utils';
import type { PriceTrendPoint } from '@/app/actions/analytics-charts';

interface Props {
  data: PriceTrendPoint[];
  isLoading?: boolean;
}

export function PriceTrendChart({ data, isLoading }: Props) {
  const hasData = data.length >= 2;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium">מגמת מחירים</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasData
                ? `ממוצע וחציון לפי חודש · ${data.length} חודשים`
                : 'ממוצע וחציון מחירים לאורך זמן'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <EmptyChart message="לא מספיק נתונים לגרף מגמה. נדרשים לפחות 2 חודשים." />
        ) : (
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatYAxisTick}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border-strong))' }} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => (
                    <span className="text-muted-foreground">
                      {value === 'avgPrice' ? 'ממוצע' : 'חציון'}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="avgPrice"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="medianPrice"
                  stroke="hsl(var(--info))"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2, fill: 'hsl(var(--info))' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatYAxisTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs" dir="rtl">
      <p className="font-medium mb-1.5">{label}</p>
      {payload.map((item: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">
              {item.dataKey === 'avgPrice' ? 'ממוצע' : 'חציון'}
            </span>
          </div>
          <span className="font-medium tabular-nums">{formatILS(item.value)}</span>
        </div>
      ))}
      {payload[0]?.payload?.count != null && (
        <div className="border-t mt-1.5 pt-1.5 text-muted-foreground">
          {payload[0].payload.count} עסקאות
        </div>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-64 flex items-end gap-1 px-4 pb-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 shimmer rounded-t"
          style={{ height: `${30 + Math.sin(i) * 20 + 20}%` }}
        />
      ))}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-64 flex items-center justify-center">
      <p className="text-xs text-muted-foreground text-center max-w-xs">{message}</p>
    </div>
  );
}
