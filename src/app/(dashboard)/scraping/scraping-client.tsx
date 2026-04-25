'use client';

import * as React from 'react';
import {
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Zap,
  Chrome,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { triggerScrapeAction, listRecentJobsAction } from '@/app/actions/scraping';
import type { ProviderCapabilities } from '@/lib/scrapers/provider';
import type { DataSource } from '@/lib/scrapers/types';

interface ProviderSummary {
  source: DataSource;
  displayName: string;
  capabilities: ProviderCapabilities;
  healthy?: boolean;
}

interface Job {
  id: string;
  source: string;
  status: string;
  items_found: number | null;
  items_new: number | null;
  items_failed: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface Props {
  providers: ProviderSummary[];
  recentJobs: Job[];
  canTrigger: boolean;
}

const RUNTIME_ICONS = {
  http: Globe,
  apify: Zap,
  browser: Chrome,
} as const;

const RUNTIME_LABELS = {
  http: 'HTTP API',
  apify: 'Apify',
  browser: 'Puppeteer',
} as const;

export function ScrapingPageClient({ providers, recentJobs: initialJobs, canTrigger }: Props) {
  const [selectedSource, setSelectedSource] = React.useState<DataSource>(providers[0]?.source ?? 'tax_authority');
  const [isRunning, setIsRunning] = React.useState(false);
  const [jobs, setJobs] = React.useState(initialJobs);
  const [lastResult, setLastResult] = React.useState<
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
    | null
  >(null);

  const selectedProvider = providers.find((p) => p.source === selectedSource);

  // Form state — single controlled object
  const [formState, setFormState] = React.useState({
    city: 'תל אביב',
    neighborhood: '',
    minRooms: '',
    maxRooms: '',
    minPrice: '',
    maxPrice: '',
    listingType: 'sale' as 'sale' | 'rent' | 'transaction',
    page: 1,
  });

  // Reset form when provider changes
  React.useEffect(() => {
    setLastResult(null);
  }, [selectedSource]);

  // Poll jobs while a scrape is running
  React.useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      const result = await listRecentJobsAction(15);
      if (result.ok) setJobs(result.data);
    }, 2000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleTrigger = async () => {
    if (!selectedProvider) return;

    setIsRunning(true);
    setLastResult(null);

    // Build query respecting provider capabilities
    const query: Record<string, unknown> = {
      page: formState.page,
      limit: 50,
    };
    const caps = selectedProvider.capabilities;

    if (caps.filters.city && formState.city) query.city = formState.city;
    if (caps.filters.neighborhood && formState.neighborhood) query.neighborhood = formState.neighborhood;
    if (caps.filters.rooms && formState.minRooms) query.minRooms = Number(formState.minRooms);
    if (caps.filters.rooms && formState.maxRooms) query.maxRooms = Number(formState.maxRooms);
    if (caps.filters.priceRange && formState.minPrice) query.minPrice = Number(formState.minPrice);
    if (caps.filters.priceRange && formState.maxPrice) query.maxPrice = Number(formState.maxPrice);
    if (caps.filters.listingType) query.listingType = formState.listingType;

    try {
      const result = await triggerScrapeAction({ source: selectedSource, query: query as any });

      if (result.ok) {
        if (result.data.status === 'completed') {
          setLastResult({
            type: 'success',
            message: `הסתיים · ${result.data.itemsFound} נמצאו · ${result.data.itemsNew} חדשים · ${result.data.itemsUpdated} עודכנו`,
          });
        } else {
          setLastResult({
            type: 'error',
            message: result.data.error ?? 'הסריקה נכשלה',
          });
        }
      } else {
        setLastResult({ type: 'error', message: result.error });
      }

      // Refresh jobs list
      const refreshed = await listRecentJobsAction(15);
      if (refreshed.ok) setJobs(refreshed.data);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="איסוף נתונים"
        description="הפעלה ידנית של scrapers וניטור עבודות פעילות"
      />

      {!canTrigger && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border bg-[hsl(var(--warning-bg))] px-3 py-2.5 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-[hsl(var(--warning-foreground))] mt-0.5" />
          <div>
            <p className="font-medium text-[hsl(var(--warning-foreground))]">גישה לצפייה בלבד</p>
            <p className="text-xs mt-0.5 text-[hsl(var(--warning-foreground))] opacity-90">
              אין לך הרשאות להפעלת jobs חדשים. תוכל לצפות בהיסטוריה בלבד.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Trigger form */}
        <Card>
          <CardContent className="pt-5">
            <div className="mb-4">
              <h2 className="text-base font-medium mb-1">הפעלה חדשה</h2>
              <p className="text-xs text-muted-foreground">בחר מקור וסנן לפי הצורך</p>
            </div>

            <div className="space-y-4">
              <FormField label="מקור נתונים" htmlFor="source">
                <Select
                  value={selectedSource}
                  onValueChange={(v) => setSelectedSource(v as DataSource)}
                  disabled={isRunning}
                >
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.source} value={p.source}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {selectedProvider && (
                <div className="flex flex-wrap gap-2">
                  <ProviderBadge provider={selectedProvider} />
                  {selectedProvider.capabilities.supportedListingTypes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {t === 'sale' ? 'מכירה' : t === 'rent' ? 'השכרה' : 'עסקאות'}
                    </span>
                  ))}
                  {selectedProvider.healthy === false && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--warning))] bg-[hsl(var(--warning-bg))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--warning-foreground))]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--warning))]" />
                      לא מוגדר
                    </span>
                  )}
                  {selectedProvider.healthy === true && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--success))] bg-[hsl(var(--success-bg))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--success-foreground))]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                      פעיל
                    </span>
                  )}
                </div>
              )}

              {selectedProvider?.healthy === false && (
                <div className="flex items-start gap-2 rounded-lg border border-[hsl(var(--warning))] bg-[hsl(var(--warning-bg))] px-3 py-2.5 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--warning-foreground))] mt-0.5" />
                  <div className="text-[hsl(var(--warning-foreground))]">
                    {selectedProvider.source === 'madlan' && (
                      <>
                        חסרים משתני סביבה: <code className="font-mono">APIFY_API_TOKEN</code> ו-
                        <code className="font-mono">APIFY_MADLAN_ACTOR_ID</code>. ראה README.
                      </>
                    )}
                    {selectedProvider.source === 'yad2' && (
                      <>
                        דורש התקנת Puppeteer: <code className="font-mono">npm install puppeteer</code>. ראה README.
                      </>
                    )}
                    {selectedProvider.source !== 'madlan' && selectedProvider.source !== 'yad2' && (
                      <>ה-provider אינו זמין כרגע. בדוק את ה-env vars.</>
                    )}
                  </div>
                </div>
              )}

              {selectedProvider?.capabilities.filters.city && (
                <FormField
                  label="עיר"
                  htmlFor="city"
                  required={selectedProvider.capabilities.requiresCity}
                >
                  <Input
                    id="city"
                    value={formState.city}
                    onChange={(e) => setFormState((s) => ({ ...s, city: e.target.value }))}
                    placeholder="תל אביב"
                    disabled={isRunning}
                  />
                </FormField>
              )}

              {selectedProvider?.capabilities.filters.neighborhood && (
                <FormField label="שכונה" htmlFor="neighborhood">
                  <Input
                    id="neighborhood"
                    value={formState.neighborhood}
                    onChange={(e) => setFormState((s) => ({ ...s, neighborhood: e.target.value }))}
                    placeholder="נווה צדק"
                    disabled={isRunning}
                  />
                </FormField>
              )}

              {selectedProvider?.capabilities.filters.listingType && (
                <FormField label="סוג" htmlFor="listing-type">
                  <Select
                    value={formState.listingType}
                    onValueChange={(v) => setFormState((s) => ({ ...s, listingType: v as any }))}
                    disabled={isRunning}
                  >
                    <SelectTrigger id="listing-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProvider.capabilities.supportedListingTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === 'sale' ? 'מכירה' : t === 'rent' ? 'השכרה' : 'עסקאות'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              {selectedProvider?.capabilities.filters.rooms && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="מחדרים" htmlFor="min-rooms">
                    <Input
                      id="min-rooms"
                      type="number"
                      step="0.5"
                      value={formState.minRooms}
                      onChange={(e) => setFormState((s) => ({ ...s, minRooms: e.target.value }))}
                      placeholder="3"
                      disabled={isRunning}
                    />
                  </FormField>
                  <FormField label="עד חדרים" htmlFor="max-rooms">
                    <Input
                      id="max-rooms"
                      type="number"
                      step="0.5"
                      value={formState.maxRooms}
                      onChange={(e) => setFormState((s) => ({ ...s, maxRooms: e.target.value }))}
                      placeholder="5"
                      disabled={isRunning}
                    />
                  </FormField>
                </div>
              )}

              {selectedProvider?.capabilities.filters.priceRange && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="ממחיר" htmlFor="min-price">
                    <Input
                      id="min-price"
                      type="number"
                      step="100000"
                      value={formState.minPrice}
                      onChange={(e) => setFormState((s) => ({ ...s, minPrice: e.target.value }))}
                      placeholder="2000000"
                      disabled={isRunning}
                    />
                  </FormField>
                  <FormField label="עד מחיר" htmlFor="max-price">
                    <Input
                      id="max-price"
                      type="number"
                      step="100000"
                      value={formState.maxPrice}
                      onChange={(e) => setFormState((s) => ({ ...s, maxPrice: e.target.value }))}
                      placeholder="8000000"
                      disabled={isRunning}
                    />
                  </FormField>
                </div>
              )}

              {lastResult && (
                <div
                  className={cn(
                    'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
                    lastResult.type === 'success' &&
                      'border-[hsl(var(--success))] bg-[hsl(var(--success-bg))] text-[hsl(var(--success-foreground))]',
                    lastResult.type === 'error' &&
                      'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] text-[hsl(var(--destructive))]'
                  )}
                >
                  {lastResult.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span className="text-xs">{lastResult.message}</span>
                </div>
              )}

              <Button
                onClick={handleTrigger}
                disabled={!canTrigger || isRunning || selectedProvider?.healthy === false}
                className="w-full"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    רץ כעת...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    הפעל Scraping
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Jobs history */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h2 className="text-sm font-medium">היסטוריית עבודות</h2>
              <span className="text-xs text-muted-foreground">{jobs.length} אחרונות</span>
            </div>

            {jobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                עדיין לא הופעלו עבודות scraping
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: ProviderSummary }) {
  const Icon = RUNTIME_ICONS[provider.capabilities.runtime];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-[hsl(var(--primary-50))] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--primary-900))]">
      <Icon className="h-2.5 w-2.5" />
      {RUNTIME_LABELS[provider.capabilities.runtime]}
    </span>
  );
}

function JobRow({ job }: { job: Job }) {
  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      variant: 'success' as const,
      color: 'text-[hsl(var(--success))]',
      label: 'הושלם',
    },
    running: { icon: Loader2, variant: 'info' as const, color: 'text-[hsl(var(--info))]', label: 'רץ' },
    pending: { icon: Clock, variant: 'secondary' as const, color: 'text-muted-foreground', label: 'ממתין' },
    failed: {
      icon: XCircle,
      variant: 'destructive' as const,
      color: 'text-[hsl(var(--destructive))]',
      label: 'נכשל',
    },
  }[job.status] ?? {
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
    label: job.status,
  };

  const Icon = statusConfig.icon;
  const startedAt = job.started_at ? new Date(job.started_at) : null;
  const completedAt = job.completed_at ? new Date(job.completed_at) : null;
  const durationSec =
    startedAt && completedAt ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000) : null;

  return (
    <div className="flex items-start gap-3 px-5 py-3 hover:bg-accent/30 transition-colors">
      <div className={cn('shrink-0 mt-0.5', statusConfig.color)}>
        <Icon className={cn('h-4 w-4', job.status === 'running' && 'animate-spin')} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium">{job.source}</p>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {startedAt && <span>{startedAt.toLocaleTimeString('he-IL')}</span>}
          {durationSec !== null && <span>· {durationSec}s</span>}
          {job.status === 'completed' && (
            <>
              <span>· {job.items_found ?? 0} נמצאו</span>
              {(job.items_new ?? 0) > 0 && (
                <span className="text-[hsl(var(--success))]">· {job.items_new} חדשים</span>
              )}
              {(job.items_failed ?? 0) > 0 && (
                <span className="text-[hsl(var(--destructive))]">· {job.items_failed} שגיאות</span>
              )}
            </>
          )}
        </div>
        {job.error_message && (
          <p className="mt-1 text-xs text-[hsl(var(--destructive))] truncate">{job.error_message}</p>
        )}
      </div>
    </div>
  );
}
