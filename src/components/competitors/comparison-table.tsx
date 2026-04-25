'use client';

import * as React from 'react';
import {
  ArrowUpRight,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Crown,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatILS, formatNumber } from '@/lib/utils';
import {
  fetchCompetitorsAction,
  type CompetitorComparisonResult,
  type CompetitorComparisonRow,
} from '@/app/actions/competitors';

interface Props {
  projectSlug: string;
}

const SOURCE_LABELS: Record<string, string> = {
  self: 'הפרויקט שלך',
  yad2: 'יד2',
  madlan: 'מדלן',
  onmap: 'Onmap',
  homeless: 'Homeless',
  other: 'מקור אחר',
};

const SOURCE_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'secondary'> = {
  self: 'success',
  yad2: 'warning',
  madlan: 'info',
  onmap: 'info',
  homeless: 'info',
  other: 'secondary',
};

export function CompetitorsComparisonTable({ projectSlug }: Props) {
  const [result, setResult] = React.useState<CompetitorComparisonResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);

  const runSearch = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    const res = await fetchCompetitorsAction(projectSlug);
    if (res.ok) {
      setResult(res.data);
    } else {
      setError(res.error);
    }
    setIsLoading(false);
  }, [projectSlug]);

  const competitorsOnly = result?.rows.filter((r) => !r.isSelf) ?? [];
  const selfRow = result?.rows.find((r) => r.isSelf);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--primary-600))]" />
            השוואת מתחרים
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {!hasSearched
              ? 'חיפוש דינמי של פרויקטים מתחרים באזור וחישוב פער המחיר למ"ר'
              : result
                ? `${competitorsOnly.length} מתחרים נמצאו · ${result.resultsFetched} תוצאות חיפוש · ${SOURCE_LABELS[result.provider] ?? result.provider}`
                : null}
          </p>
        </div>

        <Button onClick={runSearch} disabled={isLoading} size="sm">
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              מחפש...
            </>
          ) : hasSearched ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              חיפוש מחדש
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              מצא מתחרים
            </>
          )}
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] p-3 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))] mt-0.5" />
          <div>
            <p className="font-medium text-[hsl(var(--destructive))]">שגיאה בחיפוש מתחרים</p>
            <p className="text-xs text-[hsl(var(--destructive))] opacity-80 mt-0.5">{error}</p>
            {error.includes('API_KEY') && (
              <p className="text-xs text-muted-foreground mt-2">
                נדרש להגדיר <code className="font-mono">TAVILY_API_KEY</code> או{' '}
                <code className="font-mono">SERPER_API_KEY</code> ב-env. ראה README.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state - before search */}
      {!hasSearched && !isLoading && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary-50))]">
              <Sparkles className="h-5 w-5 text-[hsl(var(--primary-600))]" />
            </div>
            <h3 className="text-sm font-medium mb-1">מנוע סריקת מתחרים</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
              לחץ "מצא מתחרים" כדי לחפש פרויקטים דומים באזור בזמן אמת. המערכת תחלץ
              שמות משווקים, מחירי התחלה וקישורים, ותחשב את פער המחיר למ"ר.
            </p>
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>משתמש ב-Tavily Search API · דורש הגדרת מפתח</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              <SkeletonRow isSelf />
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !isLoading && (
        <>
          {/* Self-project summary bar (when we have data) */}
          {selfRow && selfRow.pricePerSqm && competitorsOnly.length > 0 && (
            <SummaryInsights rows={result.rows} selfPpsqm={selfRow.pricePerSqm} />
          )}

          {/* Main table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-right font-medium">פרויקט</th>
                      <th className="px-4 py-3 text-right font-medium w-36">משווק</th>
                      <th className="px-4 py-3 text-center font-medium w-16">חדרים</th>
                      <th className="px-4 py-3 text-left font-medium w-24">שטח</th>
                      <th className="px-4 py-3 text-left font-medium w-32">החל מ-</th>
                      <th className="px-4 py-3 text-left font-medium w-28">למ"ר</th>
                      <th className="px-4 py-3 text-center font-medium w-24">פער</th>
                      <th className="px-4 py-3 text-center font-medium w-24">מקור</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <ComparisonRow key={i} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>

              {competitorsOnly.length === 0 && (
                <div className="py-12 text-center border-t">
                  <p className="text-sm text-muted-foreground">
                    לא נמצאו מתחרים מתאימים באזור
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    נסה עם פרויקט בעיר/שכונה אחרת, או בדוק שה-API key מוגדר
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer meta */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              נוצר ב-
              {new Date(result.generatedAt).toLocaleString('he-IL', {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <span>שאילתה: "{result.searchQuery}"</span>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                אזהרות ({result.warnings.length})
              </summary>
              <ul className="mt-1 pr-4 space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i} className="list-disc">
                    {w}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function ComparisonRow({ row }: { row: CompetitorComparisonRow }) {
  return (
    <tr
      className={cn(
        'border-b last:border-b-0 transition-colors',
        row.isSelf
          ? 'bg-[hsl(var(--primary-50))]/70 hover:bg-[hsl(var(--primary-50))]'
          : 'hover:bg-accent/30'
      )}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          {row.isSelf && (
            <Crown className="h-3.5 w-3.5 text-[hsl(var(--primary-600))] shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className={cn('text-sm truncate', row.isSelf && 'font-semibold')}>{row.name}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{row.location}</p>
          </div>
        </div>
      </td>

      {/* Marketer */}
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground truncate">
          {row.marketer ?? '—'}
        </span>
      </td>

      {/* Rooms */}
      <td className="px-4 py-3 text-center text-xs text-muted-foreground">
        {row.rooms != null ? formatNumber(row.rooms) : '—'}
      </td>

      {/* Area */}
      <td className="px-4 py-3 text-left text-xs text-muted-foreground tabular-nums">
        {row.areaSqm != null ? `${row.areaSqm} מ"ר` : '—'}
      </td>

      {/* Starting price */}
      <td className="px-4 py-3 text-left font-medium tabular-nums">
        {row.startingPrice != null ? formatILS(row.startingPrice) : '—'}
      </td>

      {/* Price per sqm */}
      <td className="px-4 py-3 text-left tabular-nums">
        {row.pricePerSqm != null ? (
          <span className={cn(row.isSelf && 'font-medium')}>{formatILS(row.pricePerSqm)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Delta */}
      <td className="px-4 py-3 text-center">
        {row.isSelf ? (
          <span className="text-[11px] text-muted-foreground">בסיס</span>
        ) : row.pricePerSqmDelta == null ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <DeltaBadge delta={row.pricePerSqmDelta} />
        )}
      </td>

      {/* Source */}
      <td className="px-4 py-3 text-center">
        <Badge variant={SOURCE_VARIANTS[row.source] ?? 'secondary'}>
          {SOURCE_LABELS[row.source] ?? row.source}
        </Badge>
      </td>

      {/* Link */}
      <td className="px-2 py-3">
        {row.url && (
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="פתח במקור"
            title="פתח במקור"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Delta badge - shows +/-% with color and icon
// ---------------------------------------------------------------------------

function DeltaBadge({ delta }: { delta: number }) {
  // Semantics: from the user's perspective, a positive delta means the
  // competitor is MORE expensive per sqm, which is GOOD for the user (their
  // project is a relative bargain). Green. Negative = competitor cheaper = red.

  const isFlat = Math.abs(delta) < 1;
  const isCompetitorMoreExpensive = delta > 0;

  const config = isFlat
    ? { color: 'text-muted-foreground bg-muted', Icon: Minus, label: 'דומה' }
    : isCompetitorMoreExpensive
      ? {
          color: 'text-[hsl(var(--success))] bg-[hsl(var(--success-bg))]',
          Icon: TrendingUp,
          label: `+${delta.toFixed(1)}%`,
        }
      : {
          color: 'text-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))]',
          Icon: TrendingDown,
          label: `${delta.toFixed(1)}%`,
        };

  const Icon = config.Icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
        config.color
      )}
      title={
        isFlat
          ? 'מחיר דומה לפרויקט שלך'
          : isCompetitorMoreExpensive
            ? 'המתחרה יקר יותר - יתרון לפרויקט שלך'
            : 'המתחרה זול יותר - חיסרון תחרותי'
      }
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Summary insights bar - 3 KPIs at a glance
// ---------------------------------------------------------------------------

function SummaryInsights({
  rows,
  selfPpsqm,
}: {
  rows: CompetitorComparisonRow[];
  selfPpsqm: number;
}) {
  const competitors = rows.filter((r) => !r.isSelf && r.pricePerSqm != null);
  if (competitors.length === 0) return null;

  const avgCompetitorPpsqm =
    competitors.reduce((sum, r) => sum + (r.pricePerSqm ?? 0), 0) / competitors.length;
  const avgDelta = Math.round(((avgCompetitorPpsqm - selfPpsqm) / selfPpsqm) * 1000) / 10;

  const cheaperThanSelf = competitors.filter((r) => (r.pricePerSqm ?? 0) < selfPpsqm).length;
  const expensiveThanSelf = competitors.filter((r) => (r.pricePerSqm ?? 0) > selfPpsqm).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-[11px] text-muted-foreground">שוק (ממוצע מתחרים)</p>
          <p className="text-lg font-semibold tabular-nums mt-0.5">
            {formatILS(Math.round(avgCompetitorPpsqm))}
          </p>
          <p className="text-[10px] text-muted-foreground">למ"ר · מבוסס על {competitors.length} מתחרים</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-[11px] text-muted-foreground">הפרויקט שלך מול השוק</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p
              className={cn(
                'text-lg font-semibold tabular-nums',
                avgDelta > 1
                  ? 'text-[hsl(var(--success))]'
                  : avgDelta < -1
                    ? 'text-[hsl(var(--destructive))]'
                    : 'text-foreground'
              )}
            >
              {avgDelta > 0 ? '+' : ''}
              {avgDelta.toFixed(1)}%
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {avgDelta > 1
              ? 'שוק יקר יותר — הפרויקט שלך אטרקטיבי'
              : avgDelta < -1
                ? 'שוק זול יותר — עדיף לשקול התאמה'
                : 'תמחור מתאים לשוק'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-[11px] text-muted-foreground">מיצוב תחרותי</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-lg font-semibold tabular-nums">
              {expensiveThanSelf}
              <span className="text-sm text-muted-foreground mx-1">/</span>
              <span className="text-sm text-muted-foreground">{competitors.length}</span>
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {expensiveThanSelf} יקרים יותר · {cheaperThanSelf} זולים יותר
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton row for loading state
// ---------------------------------------------------------------------------

function SkeletonRow({ isSelf = false }: { isSelf?: boolean }) {
  return (
    <div className={cn('flex items-center gap-4 px-4 py-3', isSelf && 'bg-[hsl(var(--primary-50))]/40')}>
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-3 w-24 shrink-0" />
      <Skeleton className="h-3 w-16 shrink-0" />
      <Skeleton className="h-3 w-20 shrink-0" />
      <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
      <Skeleton className="h-5 w-12 shrink-0 rounded-full" />
    </div>
  );
}
