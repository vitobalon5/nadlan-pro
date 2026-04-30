'use client';

import * as React from 'react';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAnalyticsForExportAction } from '@/app/actions/analytics';
import {
  MAX_EXPORT_ROWS,
  type AnalyticsFilters,
  type AnalyticsStats,
} from '@/app/actions/analytics-types';
import { buildWorkbook, downloadWorkbook, buildExportFilename } from '@/lib/export/excel';

interface Props {
  filters: AnalyticsFilters;
  stats: AnalyticsStats;
  userName: string;
  totalRows: number;
  disabled?: boolean;
}

type ExportState =
  | { status: 'idle' }
  | { status: 'fetching' }
  | { status: 'building' }
  | { status: 'success'; exportedCount: number; filename: string }
  | { status: 'error'; message: string };

export function ExportExcelButton({ filters, stats, userName, totalRows, disabled }: Props) {
  const [state, setState] = React.useState<ExportState>({ status: 'idle' });
  const [showLimitWarning, setShowLimitWarning] = React.useState(false);

  const exceedsLimit = totalRows > MAX_EXPORT_ROWS;

  const handleExport = async () => {
    // Show warning on first attempt when limit would be hit
    if (exceedsLimit && !showLimitWarning) {
      setShowLimitWarning(true);
      setTimeout(() => setShowLimitWarning(false), 5000);
      return;
    }

    try {
      setState({ status: 'fetching' });

      const result = await fetchAnalyticsForExportAction(filters);
      if (!result.ok) {
        setState({ status: 'error', message: result.error });
        setTimeout(() => setState({ status: 'idle' }), 3000);
        return;
      }

      setState({ status: 'building' });

      // Yield to the browser so the "building" state renders before the synchronous work
      await new Promise((r) => setTimeout(r, 0));

      const now = new Date();
      const workbook = buildWorkbook(result.data, {
        filters,
        stats,
        generatedAt: now,
        generatedBy: userName,
      });

      const filename = buildExportFilename(filters, now);
      downloadWorkbook(workbook, filename);

      setState({
        status: 'success',
        exportedCount: result.data.length,
        filename,
      });

      setTimeout(() => setState({ status: 'idle' }), 4000);
    } catch (error: any) {
      setState({
        status: 'error',
        message: error?.message ?? 'שגיאה בייצוא',
      });
      setTimeout(() => setState({ status: 'idle' }), 3000);
    }
  };

  const isWorking = state.status === 'fetching' || state.status === 'building';

  return (
    <div className="relative">
      <Button
        variant={state.status === 'success' ? 'default' : 'outline'}
        onClick={handleExport}
        disabled={disabled || isWorking || totalRows === 0}
      >
        {state.status === 'idle' && (
          <>
            <Download className="h-4 w-4" />
            ייצוא לאקסל
          </>
        )}
        {state.status === 'fetching' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            טוען נתונים...
          </>
        )}
        {state.status === 'building' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            בונה קובץ...
          </>
        )}
        {state.status === 'success' && (
          <>
            <CheckCircle2 className="h-4 w-4" />
            הורד ({state.exportedCount} שורות)
          </>
        )}
        {state.status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4" />
            שגיאה
          </>
        )}
      </Button>

      {/* Limit warning tooltip */}
      {showLimitWarning && (
        <div className="absolute top-full mt-2 left-0 z-50 w-72 rounded-lg border bg-[hsl(var(--warning-bg))] border-[hsl(var(--warning))] p-3 text-xs shadow-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--warning-foreground))] mt-0.5" />
            <div className="text-[hsl(var(--warning-foreground))]">
              <p className="font-medium mb-1">הרבה נתונים ({totalRows.toLocaleString('he-IL')} שורות)</p>
              <p className="opacity-90">
                הייצוא יכיל רק את {MAX_EXPORT_ROWS.toLocaleString('he-IL')} הראשונים לפי המיון
                הנוכחי. צמצם את הסינון לייצוא מלא.
              </p>
              <button
                onClick={handleExport}
                className="mt-2 font-medium underline underline-offset-2 hover:opacity-80"
              >
                ייצא בכל זאת
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error tooltip */}
      {state.status === 'error' && (
        <div className="absolute top-full mt-2 left-0 z-50 w-64 rounded-lg border bg-[hsl(var(--destructive-bg))] border-[hsl(var(--destructive))] p-2.5 text-xs shadow-lg">
          <p className="text-[hsl(var(--destructive))]">{state.message}</p>
        </div>
      )}
    </div>
  );
}
