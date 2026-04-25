import React from 'react';
import Link from 'next/link';
import { Building2, ChevronLeft, Share2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectStatusBadge } from '@/components/projects/status-badge';
import type { ProjectStatus } from '@/types/domain';

interface ProjectHeaderProps {
  project: {
    name: string;
    city: string;
    address: string | null;
    developer_name: string | null;
    total_units: number | null;
    status: ProjectStatus;
    gush: string | null;
    helka: string | null;
    expected_completion_date: string | null;
  };
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const metaItems = [
    project.gush && `גוש ${project.gush}`,
    project.helka && `חלקה ${project.helka}`,
    project.expected_completion_date &&
      `סיום צפוי: ${new Date(project.expected_completion_date).toLocaleDateString('he-IL', {
        month: 'short',
        year: 'numeric',
      })}`,
  ].filter(Boolean);

  return (
    <>
      <div className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          פרויקטים
        </Link>
        <span>/</span>
        <span className="text-foreground">{project.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex gap-4 min-w-0">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary-50))]">
            <Building2 className="h-8 w-8 text-[hsl(var(--primary-600))]" strokeWidth={1.5} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>

            <p className="text-sm text-muted-foreground">
              {[
                project.address,
                project.city,
                project.developer_name && `יזם: ${project.developer_name}`,
                project.total_units && `${project.total_units} יחידות`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>

            {metaItems.length > 0 && (
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {metaItems.map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span>•</span>}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm">
            <Share2 className="h-3.5 w-3.5" />
            שתף
          </Button>
          <Button size="sm">
            <Pencil className="h-3.5 w-3.5" />
            ערוך
          </Button>
        </div>
      </div>
    </>
  );
}
