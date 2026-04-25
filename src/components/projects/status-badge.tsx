import { Badge } from '@/components/ui/badge';
import type { ProjectStatus } from '@/types/domain';

const statusConfig: Record<
  ProjectStatus,
  { label: string; variant: 'info' | 'warning' | 'success' | 'secondary' | 'destructive' }
> = {
  planning: { label: 'תכנון', variant: 'secondary' },
  pre_sale: { label: 'טרום-מכירה', variant: 'warning' },
  under_construction: { label: 'בבנייה', variant: 'info' },
  completed: { label: 'הושלם', variant: 'success' },
  sold_out: { label: 'אוזל', variant: 'secondary' },
  archived: { label: 'ארכיון', variant: 'secondary' },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = statusConfig[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
