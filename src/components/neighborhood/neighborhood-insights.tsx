'use client';

import * as React from 'react';
import { MapPin, AlertCircle, Info } from 'lucide-react';
import { SocioeconomicCard } from './socioeconomic-card';
import { SchoolsBarChart } from './schools-bar-chart';
import { AgeDistributionChart } from './age-distribution-chart';
import { fetchNeighborhoodDataAction } from '@/app/actions/neighborhood';
import type { CityDataResult } from '@/lib/services/city-data';

interface Props {
  city: string;
  neighborhood?: string | null;
}

/**
 * Neighborhood insights section.
 *
 * Fetches once on mount (or when city/neighborhood changes) and distributes
 * to the three visualization cards. A single fetch powers three cards, each
 * with its own Skeleton while loading.
 */
export function NeighborhoodInsights({ city, neighborhood }: Props) {
  const [data, setData] = React.useState<CityDataResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Race-condition-safe fetching
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!city) return;

    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    fetchNeighborhoodDataAction(city, neighborhood ?? undefined).then((res) => {
      if (reqId !== requestIdRef.current) return;

      if (res.ok) {
        setData(res.data);
      } else {
        setError(res.error);
      }
      setIsLoading(false);
    });
  }, [city, neighborhood]);

  const isEstimated = data?.dataSource === 'estimated';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            ניתוח סביבתי
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {neighborhood ? `${neighborhood}, ${city}` : city} · מאגרי המידע הממשלתיים
          </p>
        </div>

        {!isLoading && isEstimated && (
          <div
            className="flex items-start gap-2 rounded-lg border bg-[hsl(var(--warning-bg))] px-3 py-2 text-xs max-w-sm"
            role="status"
          >
            <Info className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning-foreground))] mt-0.5" />
            <p className="text-[hsl(var(--warning-foreground))]">
              נתונים לא זמינים מהשרת הממשלתי. מוצגים אומדנים.
            </p>
          </div>
        )}
      </div>

      {error && !isLoading && (
        <div className="rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] px-3 py-2.5 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))] mt-0.5" />
          <div>
            <p className="font-medium text-[hsl(var(--destructive))]">שגיאה בטעינת נתונים סביבתיים</p>
            <p className="text-xs text-[hsl(var(--destructive))] opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <SocioeconomicCard
          data={data?.socioeconomic ?? null}
          isLoading={isLoading}
          isEstimated={isEstimated}
        />
        <AgeDistributionChart
          data={data?.ageDistribution ?? null}
          isLoading={isLoading}
          isEstimated={isEstimated}
        />
      </div>

      <SchoolsBarChart
        schools={data?.schools ?? []}
        isLoading={isLoading}
        isEstimated={isEstimated}
      />

      {data && data.warnings.length > 0 && !isLoading && (
        <details className="text-[11px] text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors">
            אזהרות טעינה ({data.warnings.length})
          </summary>
          <ul className="mt-1 pr-4 space-y-0.5">
            {data.warnings.map((w, i) => (
              <li key={i} className="list-disc">
                {w}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
