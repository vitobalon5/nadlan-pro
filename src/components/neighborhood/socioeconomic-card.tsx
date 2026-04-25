'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SocioeconomicData } from '@/lib/services/city-data';

interface Props {
  data: SocioeconomicData | null;
  isLoading?: boolean;
  isEstimated?: boolean;
}

export function SocioeconomicCard({ data, isLoading, isEstimated }: Props) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary-50))]">
              <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--primary-600))]" />
            </div>
            <h3 className="text-sm font-medium">מדד חברתי-כלכלי</h3>
          </div>
          {isEstimated && !isLoading && (
            <span className="text-[10px] text-muted-foreground">אומדן</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-2 w-full" />
              ))}
            </div>
          </div>
        ) : !data ? (
          <EmptyState message="נתון לא זמין" />
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{data.cluster}</span>
                <span className="text-sm text-muted-foreground">/ 10</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {clusterDescription(data.cluster)} · אחוזון {data.percentile}
              </p>
            </div>

            {/* 10-dot visualization */}
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => {
                const isActive = i < data.cluster;
                return (
                  <div
                    key={i}
                    className={cn(
                      'h-2 flex-1 rounded-full transition-colors',
                      isActive ? getClusterColor(data.cluster) : 'bg-muted'
                    )}
                  />
                );
              })}
            </div>

            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>1 נמוך</span>
              <span>10 גבוה</span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t">
              מקור: הלמ"ס {data.year}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function clusterDescription(cluster: number): string {
  if (cluster >= 9) return 'רמה גבוהה מאוד';
  if (cluster >= 7) return 'רמה גבוהה';
  if (cluster >= 5) return 'רמה בינונית';
  if (cluster >= 3) return 'רמה נמוכה';
  return 'רמה נמוכה מאוד';
}

function getClusterColor(cluster: number): string {
  if (cluster >= 8) return 'bg-[hsl(var(--success))]';
  if (cluster >= 5) return 'bg-[hsl(var(--info))]';
  if (cluster >= 3) return 'bg-[hsl(var(--warning))]';
  return 'bg-[hsl(var(--destructive))]';
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-28 flex items-center justify-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
