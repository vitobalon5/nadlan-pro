'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { formatILS } from '@/lib/utils';
import type { RoomsScatterPoint } from '@/app/actions/analytics-charts';

interface Props {
  data: RoomsScatterPoint[];
  isSampled: boolean;
  isLoading?: boolean;
}

export function RoomsScatterChart({ data, isSampled, isLoading }: Props) {
  const hasData = data.length >= 10;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium">חדרים מול מחיר למ"ר</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasData
                ? `${data.length} נקודות${isSampled ? ' (דגימה)' : ''} · פיזור לזיהוי קורלציה`
                : 'קשר בין מספר חדרים ומחיר למ"ר'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <EmptyChart message="לא מספיק נתונים. נדרשות לפחות 10 רשומות עם חדרים ומחיר למ&quot;ר." />
        ) : (
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="rooms"
                  name="חדרים"
                  domain={[0.5, 7]}
                  ticks={[1, 2, 3, 4, 5, 6]}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  label={{
                    value: 'חדרים',
                    position: 'insideBottom',
                    offset: -5,
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="pricePerSqm"
                  name="מחיר למ&quot;ר"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                  width={50}
                />
                <ZAxis range={[30, 30]} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  data={data}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.5}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.8}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as RoomsScatterPoint;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs" dir="rtl">
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">חדרים</span>
        <span className="font-medium">{d.rooms}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">מחיר למ"ר</span>
        <span className="font-medium tabular-nums">{formatILS(d.pricePerSqm)}</span>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-64 relative">
      <div className="absolute inset-4 grid grid-cols-6 grid-rows-4 gap-1 opacity-30">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="shimmer rounded-full"
            style={{
              width: '8px',
              height: '8px',
              alignSelf: ['start', 'center', 'end'][i % 3] as any,
            }}
          />
        ))}
      </div>
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
