'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { formatILS } from '@/lib/utils';
import type { PriceDistributionBucket } from '@/app/actions/analytics-charts';

interface Props {
  data: PriceDistributionBucket[];
  isLoading?: boolean;
}

export function PriceDistributionChart({ data, isLoading }: Props) {
  const hasData = data.length >= 3;

  // Highlight the modal (most common) bucket
  const maxCount = hasData ? Math.max(...data.map((d) => d.count)) : 0;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium">התפלגות מחירים</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasData
                ? `כמה עסקאות בכל טווח · ${data.reduce((s, d) => s + d.count, 0)} עסקאות`
                : 'פיזור העסקאות על פני טווחי מחיר'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <EmptyChart message="לא מספיק נתונים להצגת התפלגות." />
        ) : (
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.count === maxCount
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--primary) / 0.4)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PriceDistributionBucket;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs" dir="rtl">
      <p className="font-medium mb-1">
        {formatILS(d.from)} – {formatILS(d.to)}
      </p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{d.count}</span> עסקאות
      </p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-64 flex items-end gap-1 px-4 pb-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 shimmer rounded-t"
          style={{ height: `${Math.abs(Math.cos(i * 0.8)) * 70 + 20}%` }}
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
