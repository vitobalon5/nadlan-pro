'use client';

import * as React from 'react';
import {
  Sparkles,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  FileText,
  Trash2,
  Info,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  gatherReportInputAction,
  saveReportAction,
  listReportsAction,
  deleteReportAction,
} from '@/app/actions/reports';

interface Props {
  projectSlug: string;
  projectId: string;
}

type GenerationState =
  | { phase: 'idle' }
  | { phase: 'gathering' }
  | { phase: 'streaming'; startedAt: number }
  | { phase: 'done'; startedAt: number; durationMs: number }
  | { phase: 'error'; message: string };

type SaveState =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved' }
  | { state: 'error'; message: string };

interface ReportSummary {
  id: string;
  title: string;
  status: string;
  created_at: string;
  model_name: string | null;
}

export function AiReportPanel({ projectSlug, projectId }: Props) {
  const [generation, setGeneration] = React.useState<GenerationState>({ phase: 'idle' });
  const [content, setContent] = React.useState<string>('');
  const [aiOriginal, setAiOriginal] = React.useState<string>('');
  const [title, setTitle] = React.useState<string>('');
  const [inputSnapshot, setInputSnapshot] = React.useState<unknown>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveState>({ state: 'idle' });
  const [savedReports, setSavedReports] = React.useState<ReportSummary[]>([]);
  const [warnings, setWarnings] = React.useState<string[]>([]);

  const abortRef = React.useRef<AbortController | null>(null);

  // Load saved reports on mount
  React.useEffect(() => {
    listReportsAction(projectId).then((res) => {
      if (res.ok) setSavedReports(res.data);
    });
  }, [projectId]);

  const handleGenerate = async () => {
    // If already streaming, abort first
    abortRef.current?.abort();

    setGeneration({ phase: 'gathering' });
    setContent('');
    setAiOriginal('');
    setSaveStatus({ state: 'idle' });
    setWarnings([]);

    // Step 1: gather input data (server-side, fast)
    const gatherResult = await gatherReportInputAction(projectSlug);
    if (!gatherResult.ok) {
      setGeneration({ phase: 'error', message: gatherResult.error });
      return;
    }

    setInputSnapshot(gatherResult.data.input);
    setWarnings(gatherResult.data.warnings);
    setTitle(`דוח שוק — ${gatherResult.data.projectName}`);

    // Step 2: stream the generation
    const startedAt = Date.now();
    setGeneration({ phase: 'streaming', startedAt });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/reports/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputData: gatherResult.data.input }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Stream failed' }));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!line.startsWith('data:')) continue;

          try {
            const event = JSON.parse(line.slice(5).trim());
            if (event.type === 'chunk' && event.text) {
              accumulated += event.text;
              setContent(accumulated);
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (e) {
            // skip malformed
          }
        }
      }

      setAiOriginal(accumulated);
      setGeneration({
        phase: 'done',
        startedAt,
        durationMs: Date.now() - startedAt,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setGeneration({ phase: 'idle' });
        return;
      }
      setGeneration({ phase: 'error', message: error.message ?? 'שגיאה' });
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setGeneration({ phase: 'idle' });
  };

  const handleSave = async (status: 'draft' | 'published' = 'draft') => {
    if (!content.trim()) return;

    setSaveStatus({ state: 'saving' });

    const result = await saveReportAction({
      project_id: projectId,
      title: title.trim() || 'דוח ללא שם',
      content_html: content,
      ai_original_text: aiOriginal,
      input_snapshot: inputSnapshot,
      model_name: 'gemini-2.0-flash-exp',
      status,
    });

    if (!result.ok) {
      setSaveStatus({ state: 'error', message: result.error });
      setTimeout(() => setSaveStatus({ state: 'idle' }), 4000);
      return;
    }

    setSaveStatus({ state: 'saved' });
    // Refresh list
    const listResult = await listReportsAction(projectId);
    if (listResult.ok) setSavedReports(listResult.data);

    setTimeout(() => setSaveStatus({ state: 'idle' }), 3000);
  };

  const handleRevertToAi = () => {
    if (!aiOriginal) return;
    if (!confirm('לשחזר את הגרסה המקורית של ה-AI? השינויים שביצעת יימחקו.')) return;
    setContent(aiOriginal);
  };

  const handleDeleteSaved = async (reportId: string) => {
    if (!confirm('למחוק את הדוח?')) return;
    const result = await deleteReportAction(reportId);
    if (result.ok) {
      setSavedReports((prev) => prev.filter((r) => r.id !== reportId));
    }
  };

  const isStreaming = generation.phase === 'streaming';
  const isGathering = generation.phase === 'gathering';
  const isWorking = isStreaming || isGathering;
  const hasContent = content.length > 0;

  return (
    <div className="space-y-6">
      {/* Generate panel */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-medium flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-[hsl(var(--primary-600))]" />
                דוח שוק AI
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                יצירת דוח מקצועי אוטומטי בעזרת Gemini. מאגד נתוני דמוגרפיה, שוק ומתחרים
                ומפיק ניתוח כדאיות + המלצות תמחור. ניתן לעריכה אחרי היצירה.
              </p>
            </div>

            <div className="flex gap-2">
              {isWorking && (
                <Button onClick={handleStop} variant="outline" size="sm">
                  <X className="h-3.5 w-3.5" />
                  עצור
                </Button>
              )}
              <Button onClick={handleGenerate} disabled={isWorking} size="sm">
                {isGathering ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    אוסף נתונים...
                  </>
                ) : isStreaming ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    מייצר דוח...
                  </>
                ) : hasContent ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    צור מחדש
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    צור דוח שוק עם AI
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Status messages */}
          {generation.phase === 'error' && (
            <div className="mt-3 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] p-3 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))] mt-0.5" />
              <div>
                <p className="font-medium text-[hsl(var(--destructive))]">שגיאה ביצירת הדוח</p>
                <p className="text-xs text-[hsl(var(--destructive))] opacity-80 mt-0.5">
                  {generation.message}
                </p>
                {generation.message.includes('GEMINI_API_KEY') && (
                  <p className="text-xs text-muted-foreground mt-2">
                    נדרש להגדיר <code className="font-mono">GEMINI_API_KEY</code> ב-env.
                    קבל מפתח חינמי ב-
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Google AI Studio
                    </a>
                    .
                  </p>
                )}
              </div>
            </div>
          )}

          {generation.phase === 'done' && warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-[hsl(var(--warning))] bg-[hsl(var(--warning-bg))] p-3 text-xs flex items-start gap-2">
              <Info className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning-foreground))] mt-0.5" />
              <div className="text-[hsl(var(--warning-foreground))]">
                הדוח נוצר עם נתונים חלקיים: {warnings.join(', ')}. הדיוק עלול להיות מוגבל —
                הוסף נתונים (scraping, פרויקט מלא) לשיפור.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor - shown while streaming and after */}
      {(isStreaming || hasContent) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="כותרת הדוח"
              className="text-sm font-medium max-w-md"
              disabled={isWorking}
            />

            <div className="flex items-center gap-2">
              {generation.phase === 'done' && (
                <span className="text-[11px] text-muted-foreground">
                  נוצר ב-{Math.round(generation.durationMs / 100) / 10}s
                </span>
              )}

              {aiOriginal && content !== aiOriginal && (
                <Button
                  onClick={handleRevertToAi}
                  variant="outline"
                  size="sm"
                  disabled={isWorking}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  שחזר גרסה מקורית
                </Button>
              )}

              <Button
                onClick={() => handleSave('draft')}
                disabled={isWorking || !hasContent || saveStatus.state === 'saving'}
                variant={saveStatus.state === 'saved' ? 'default' : 'outline'}
                size="sm"
              >
                {saveStatus.state === 'saving' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    שומר...
                  </>
                ) : saveStatus.state === 'saved' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    נשמר
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    שמור טיוטה
                  </>
                )}
              </Button>
            </div>
          </div>

          {saveStatus.state === 'error' && (
            <div className="rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] p-2.5 text-xs text-[hsl(var(--destructive))]">
              שגיאה בשמירה: {saveStatus.message}
            </div>
          )}

          <RichTextEditor
            value={content}
            onChange={setContent}
            readOnly={isWorking}
            className={cn(isStreaming && 'is-streaming-container')}
            minHeight={500}
          />
        </div>
      )}

      {/* Saved reports */}
      {savedReports.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-medium">דוחות שנשמרו ({savedReports.length})</h3>
            </div>
            <div className="divide-y">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{report.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(report.created_at).toLocaleString('he-IL', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {report.model_name && ` · ${report.model_name}`}
                    </p>
                  </div>
                  <Badge variant={report.status === 'published' ? 'success' : 'secondary'}>
                    {report.status === 'published' ? 'פורסם' : 'טיוטה'}
                  </Badge>
                  <button
                    onClick={() => handleDeleteSaved(report.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--destructive-bg))] hover:text-[hsl(var(--destructive))]"
                    aria-label="מחק"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
