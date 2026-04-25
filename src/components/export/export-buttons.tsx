'use client';

import * as React from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { gatherExportDataAction } from '@/app/actions/export';
import {
  buildFullProjectWorkbook,
  downloadFullProjectWorkbook,
} from '@/lib/export/project-excel';

interface Props {
  projectSlug: string;
  projectName: string;
  userName: string;
}

type ExportState =
  | { state: 'idle' }
  | { state: 'gathering' }
  | { state: 'building' }
  | { state: 'done' }
  | { state: 'error'; message: string };

export function ExportButtons({ projectSlug, projectName, userName }: Props) {
  const [excelState, setExcelState] = React.useState<ExportState>({ state: 'idle' });
  const [pdfState, setPdfState] = React.useState<ExportState>({ state: 'idle' });

  const handleExcelExport = async () => {
    setExcelState({ state: 'gathering' });

    const result = await gatherExportDataAction(projectSlug);
    if (!result.ok) {
      setExcelState({ state: 'error', message: result.error });
      setTimeout(() => setExcelState({ state: 'idle' }), 4000);
      return;
    }

    setExcelState({ state: 'building' });
    // Let UI render the "building" state before blocking on synchronous work
    await new Promise((r) => setTimeout(r, 0));

    try {
      const wb = buildFullProjectWorkbook({
        ...(result.data as any),
        generatedAt: new Date(),
        generatedBy: userName,
      });

      const date = new Date().toISOString().slice(0, 10);
      const safeName = projectName.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\-_]/gu, '');
      downloadFullProjectWorkbook(wb, `survey-${safeName}-${date}.xlsx`);

      setExcelState({ state: 'done' });
      setTimeout(() => setExcelState({ state: 'idle' }), 3000);
    } catch (error: any) {
      setExcelState({ state: 'error', message: error.message ?? 'שגיאה בבנייה' });
      setTimeout(() => setExcelState({ state: 'idle' }), 4000);
    }
  };

  const handlePdfExport = async () => {
    setPdfState({ state: 'building' });

    try {
      // PDF generation happens server-side and streams back
      const response = await fetch(
        `/api/export/prospectus?slug=${encodeURIComponent(projectSlug)}`
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'PDF failed' }));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      // Stream response to a blob, then download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Extract filename from Content-Disposition or default
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
      const filename = match
        ? decodeURIComponent(match[1])
        : `prospectus-${projectSlug}.pdf`;

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 0);

      setPdfState({ state: 'done' });
      setTimeout(() => setPdfState({ state: 'idle' }), 3000);
    } catch (error: any) {
      setPdfState({ state: 'error', message: error.message ?? 'שגיאה ביצירת PDF' });
      setTimeout(() => setPdfState({ state: 'idle' }), 4000);
    }
  };

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-base font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              ייצוא
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              הורד את כל נתוני סקר השוק כקובץ אקסל לניתוח פנימי, או כפרוספקט PDF
              מעוצב ללקוחות.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ExportCard
            icon={FileSpreadsheet}
            title="ייצוא לאקסל"
            description="טאבים נפרדים: פרויקט, יחידות, מתחרים, דמוגרפיה, עסקאות, סיכום AI"
            state={excelState}
            onClick={handleExcelExport}
            primaryLabel="הורד אקסל"
          />

          <ExportCard
            icon={FileText}
            title="פרוספקט דיגיטלי"
            description="PDF מעוצב עם הדמיות, נתוני שכונה וניתוח AI — מוכן ללקוחות"
            state={pdfState}
            onClick={handlePdfExport}
            primaryLabel="הורד PDF"
            accent
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Export card - single action with states
// ---------------------------------------------------------------------------

function ExportCard({
  icon: Icon,
  title,
  description,
  state,
  onClick,
  primaryLabel,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  state: ExportState;
  onClick: () => void;
  primaryLabel: string;
  accent?: boolean;
}) {
  const isWorking = state.state === 'gathering' || state.state === 'building';

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        accent
          ? 'bg-[hsl(var(--primary-50))]/50 border-[hsl(var(--primary-200))]'
          : 'bg-card'
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            accent
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-600))]'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium">{title}</h3>
            {accent && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[hsl(var(--primary-100))] px-1.5 py-0.5 text-[9px] font-medium text-[hsl(var(--primary-900))]">
                <Sparkles className="h-2.5 w-2.5" />
                ללקוח
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {/* State messages */}
      {state.state === 'error' && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-[hsl(var(--destructive-bg))] border border-[hsl(var(--destructive))] px-2.5 py-1.5 text-xs text-[hsl(var(--destructive))]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      <Button
        onClick={onClick}
        disabled={isWorking}
        size="sm"
        variant={accent ? 'default' : 'outline'}
        className="w-full"
      >
        {state.state === 'gathering' && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            אוסף נתונים...
          </>
        )}
        {state.state === 'building' && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {accent ? 'מייצר PDF...' : 'בונה קובץ...'}
          </>
        )}
        {state.state === 'done' && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            הורד בהצלחה
          </>
        )}
        {(state.state === 'idle' || state.state === 'error') && (
          <>
            <Download className="h-3.5 w-3.5" />
            {primaryLabel}
          </>
        )}
      </Button>
    </div>
  );
}
