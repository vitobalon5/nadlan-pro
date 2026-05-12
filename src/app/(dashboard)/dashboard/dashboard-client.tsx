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

// Elegant StockHouse Watermark - subtle, behind all content
function StockHouseWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="text-foreground/[0.04] font-bold tracking-tighter whitespace-nowrap"
        style={{
          fontSize: 'clamp(8rem, 18vw, 20rem)',
          transform: 'rotate(-12deg)',
          letterSpacing: '-0.05em',
        }}
      >
        StockHouse
      </div>
    </div>
  );
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
      <StockHouseWatermark />
      <div className="relative z-10 p-8 max-w-[1400px] mx-auto">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(v
                
