import { createClient } from '@/lib/supabase/server';
import { ProjectsPageClient } from './projects-client';
import type { ProjectRowData } from '@/components/projects/project-row';
import type { ProjectStatus } from '@/types/domain';

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('projects')
    .select(
      `id, slug, name, city, status, total_units, price_per_sqm_avg,
       units:project_units(id, status)`
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (params.q) {
    query = query.or(
      `name.ilike.%${params.q}%,city.ilike.%${params.q}%,developer_name.ilike.%${params.q}%`
    );
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status as ProjectStatus);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] p-4 text-sm">
          <p className="font-medium text-[hsl(var(--destructive))]">שגיאה בטעינת הפרויקטים</p>
          <p className="text-xs mt-1 text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const projects: ProjectRowData[] = (data ?? []).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    city: p.city,
    status: p.status,
    total_units: p.total_units,
    price_per_sqm_avg: p.price_per_sqm_avg,
    sold_units: (p.units ?? []).filter((u: any) => u.status === 'sold').length,
  }));

  const hasFilters = Boolean(params.q) || (params.status !== undefined && params.status !== 'all');

  return <ProjectsPageClient projects={projects} hasFilters={hasFilters} />;
}
