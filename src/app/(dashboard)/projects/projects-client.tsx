'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { ProjectsToolbar } from '@/components/projects/projects-toolbar';
import { ProjectRow, type ProjectRowData } from '@/components/projects/project-row';
import { ProjectsEmptyState } from '@/components/projects/empty-state';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';

interface Props {
  projects: ProjectRowData[];
  hasFilters: boolean;
}

export function ProjectsPageClient({ projects, hasFilters }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const sold = projects.reduce((sum, p) => sum + p.sold_units, 0);
  const total = projects.reduce((sum, p) => sum + (p.total_units ?? 0), 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="פרויקטים"
        description={
          projects.length > 0
            ? `${projects.length} פרויקטים · ${sold} מתוך ${total} יחידות נמכרו`
            : 'ניהול כל הפרויקטים של החברה'
        }
      />

      <ProjectsToolbar onNewClick={() => setDialogOpen(true)} />

      {projects.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <ProjectsEmptyState
            onAddClick={() => setDialogOpen(true)}
            hasFilters={hasFilters}
          />
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_110px] gap-3 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span>פרויקט</span>
            <span>מיקום</span>
            <span>סטטוס</span>
            <span>מכירות</span>
            <span className="text-left">מחיר ממוצע</span>
          </div>
          <div>
            {projects.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
