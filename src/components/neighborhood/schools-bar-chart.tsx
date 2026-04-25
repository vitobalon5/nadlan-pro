'use client';

import { GraduationCap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SchoolData } from '@/lib/services/city-data';

interface Props {
  schools: SchoolData[];
  isLoading?: boolean;
  isEstimated?: boolean;
}

const LEVEL_LABELS: Record<SchoolData['level'], string> = {
  elementary: 'יסודי',
  middle: 'חט"ב',
  high: 'תיכון',
  other: 'אחר',
};

export function SchoolsBarChart({ schools, isLoading, isEstimated }: Props) {
  // Sort by rating descending, take top 8 for readable chart
  const topSchools = [...schools].sort((a, b) => b.ratingOutOf10 - a.ratingOutOf10).slice(0, 8);
  const chartData = topSchools.map((s) => ({
    ...s,
    // Truncate long names for axis labels
    shortName: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name,
  }));

  const avgRating =
    schools.length > 0
      ? schools.reduce((sum, s) => sum + s.ratingOutOf10, 0) / schools.length
      : 0;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary-50))]">
              <GraduationCap className="h-3.5 w-3.5 text-[hsl(var(--primary-600))]" />
            </div>
            <h3 className="text-sm font-medium">דירוג בתי ספר</h3>
          </div>
          <div className="flex items-center gap-2">
            {schools.length > 0 && !isLoading && (
              <span className="text-xs text-muted-foreground">
                ממוצע {avgRating.toFixed(1)}/10
              </span>
            )}
            {isEstimated && !isLoading && (
              <span className="text-[10px] text-muted-foreground">אומדן</span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 h-72 flex flex-col justify-center px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 flex-1" style={{ maxWidth: `${40 + (i % 4) * 15}%` }} />
              </div>
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState message="לא נמצאו בתי ספר באזור" />
        ) : (
          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  interval={0}
                />
                <Tooltip content={<SchoolTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="ratingOutOf10" radius={[0, 4, 4, 0]} barSize={18}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={getBarColor(entry.ratingOutOf10)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {!isLoading && schools.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[hsl(var(--success))]" />
              <span>8-10</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[hsl(var(--info))]" />
              <span>6-7</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[hsl(var(--warning))]" />
              <span>4-5</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[hsl(var(--destructive))]" />
              <span>1-3</span>
            </div>
            <span className="mr-auto">מקור: משרד החינוך</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SchoolTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SchoolData & { shortName: string };
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs" dir="rtl">
      <p className="font-medium mb-1">{d.name}</p>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">שלב</span>
          <span>{LEVEL_LABELS[d.level]}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">דירוג</span>
          <span className="font-medium">{d.ratingOutOf10}/10</span>
        </div>
        {d.studentCount != null && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">תלמידים</span>
            <span>{d.studentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getBarColor(rating: number): string {
  if (rating >= 8) return 'hsl(var(--success))';
  if (rating >= 6) return 'hsl(var(--info))';
  if (rating >= 4) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-72 flex items-center justify-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
