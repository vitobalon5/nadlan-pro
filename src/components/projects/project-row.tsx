import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { ProjectStatusBadge } from './status-badge';
import { formatILS } from '@/lib/utils';
import type { ProjectStatus } from '@/types/domain';

export interface ProjectRowData {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: ProjectStatus;
  total_units: number | null;
  sold_units: number;
  price_per_sqm_avg: number | null;
}

export function ProjectRow({ project }: { project: ProjectRowData }) {
  const totalUnits = project.total_units ?? 0;
  const percentSold = totalUnits > 0 ? Math.round((project.sold_units / totalUnits) * 100) : 0;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_110px] items-center gap-3 border-b px-4 py-3 text-sm transition-colors hover:bg-accent/50 last:border-b-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary-50))]">
          <Building2 className="h-4 w-4 text-[hsl(var(--primary-600))]" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{project.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {totalUnits > 0 ? `${totalUnits} יחידות` : '—'}
          </p>
        </div>
      </div>

      <span className="text-muted-foreground truncate">{project.city}</span>

      <div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>
            {project.sold_units}/{totalUnits || '—'}
          </span>
          <span className="text-muted-foreground">{totalUnits > 0 ? `${percentSold}%` : '—'}</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[hsl(var(--success))] transition-all"
            style={{ width: `${percentSold}%` }}
          />
        </div>
      </div>

      <span className="text-left font-medium">
        {project.price_per_sqm_avg ? formatILS(project.price_per_sqm_avg) : '—'}
      </span>
    </Link>
  );
}
