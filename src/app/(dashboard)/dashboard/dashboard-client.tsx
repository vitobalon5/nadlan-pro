'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Plus,
  Building2,
  TrendingUp,
  ArrowLeft,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/ui/motion';
import { PageHeader } from '@/components/page-header';
import { ProjectStatusBadge } from '@/components/projects/status-badge';
import { ProjectWizard } from '@/components/projects/project-wizard';
import { StockHouseLogo } from '@/components/branding/stockhouse-logo';
import { StockHouseWatermark } from '@/components/branding/stockhouse-watermark';
import type { ProjectStatus } from '@/types/domain';

interface RecentProject {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: ProjectStatus;
  created_at: string;
}

interface Props {
  userName: string;
  canCreate: boolean;
  kpis: {
    totalProjects: number;
    activeProjects: number;
  };
  recentProjects: RecentProject[];
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  return date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DashboardClient({ userName, canCreate, kpis, recentProjects }: Props) {
  const [showWizard, setShowWizard] = React.useState(false);

  const firstName = userName.split(' ')[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב';

  if (showWizard) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">פרויקט חדש</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              מלא את הפרטים ב-4 שלבים פשוטים · תוכל לערוך הכל לאחר היצירה
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('לבטל את יצירת הפרויקט? המידע שהוזן יאבד.')) {
                setShowWizard(false);
              }
            }}
          >
            <X className="h-4 w-4" />
            ביטול
          </Button>
        </div>

        <ProjectWizard />
      </div>
    );
  }

  return (
    <>
      {/* Layer 1: Buildings watermark - fixed background, behind everything */}
      <StockHouseWatermark />

      {/* Layer 2: Main content - sits above the watermark */}
      <div className="relative z-10 p-8 max-w-[1400px] mx-auto">
        {/* StockHouse Logo - large branded header */}
        <div className="mb-4 flex justify-center">
          <StockHouseLogo className="max-w-sm" />
        </div>

        <PageHeader title={`${greeting}, ${firstName}`} description="סקירה כללית של המערכת">
          {canCreate ? (
            <Button onClick={() => setShowWizard(true)} size="lg">
              <Plus className="h-4 w-4" />
              פרויקט חדש
            </Button>
          ) : null}
        </PageHeader>

        {!canCreate && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border bg-[hsl(var(--warning-bg))] px-3 py-2.5 text-sm">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[hsl(var(--warning-foreground))] mt-0.5" />
            <div>
              <p className="font-medium text-[hsl(var(--warning-foreground))]">
                גישה לקריאה בלבד
              </p>
              <p className="text-xs mt-0.5 text-[hsl(var(--warning-foreground))] opacity-90">
                אין לך הרשאות ליצירת פרויקטים חדשים. פנה למנהל המערכת לשדרוג ההרשאות.
              </p>
            </div>
          </div>
        )}

        <StaggerContainer className="grid gap-4 md:grid-cols-2 mb-6">
          <StaggerItem>
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary-50))]">
                    <Building2 className="h-5 w-5 text-[hsl(var(--primary-600))]" />
                  </div>
                  <Link
                    href="/projects"
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    לכל הפרויקטים
                    <ArrowLeft className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-2xl font-semibold">{kpis.totalProjects}</p>
                <p className="text-xs text-muted-foreground mt-0.5">סה"כ פרויקטים במערכת</p>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--success-50))]">
                    <TrendingUp className="h-5 w-5 text-[hsl(var(--success-600))]" />
                  </div>
                </div>
                <p className="text-2xl font-semibold">{kpis.activeProjects}</p>
                <p className="text-xs text-muted-foreground mt-0.5">פרויקטים פעילים</p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {recentProjects.length > 0 && (
          <FadeIn delay={0.1}>
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-5 py-3 border-b">
                  <h2 className="text-sm font-medium">פרויקטים אחרונים</h2>
                  <Link
                    href="/projects"
                    className="text-xs text-primary hover:underline"
                  >
                    צפה בכולם
                  </Link>
                </div>

                <div className="divide-y">
                  {recentProjects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.slug}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary-50))]">
                        <Building2 className="h-4 w-4 text-[hsl(var(--primary-600))]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.city} · נוצר {formatRelativeDate(p.created_at)}
                        </p>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {recentProjects.length === 0 && canCreate && (
          <FadeIn delay={0.1}>
            <Card>
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary-50))]">
                  <Building2 className="h-6 w-6 text-[hsl(var(--primary-600))]" />
                </div>
                <h3 className="text-base font-medium mb-1.5">עוד אין פרויקטים במערכת</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                  התחל על ידי יצירת הפרויקט הראשון. כל התהליך לוקח פחות מ-5 דקות.
                </p>
                <Button onClick={() => setShowWizard(true)} size="lg">
                  <Plus className="h-4 w-4" />
                  צור פרויקט ראשון
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </>
  );
}
