import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProjectHeader } from '@/components/projects/project-header';
import { ProjectDetailClient } from './project-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error || !project) {
    notFound();
  }

  // Get user name for exports audit trail
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: userProfile } = user
    ? await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
    : { data: null };
  const userName = userProfile?.full_name ?? userProfile?.email ?? 'Unknown';

  const [{ data: media }, { data: units }] = await Promise.all([
    supabase
      .from('project_media')
      .select('id, media_type, public_url, storage_path, file_name, mime_type, display_order')
      .eq('project_id', project.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('project_units')
      .select('id, unit_number, floor, rooms, area_sqm, price, price_per_sqm, status, direction, notes')
      .eq('project_id', project.id)
      .order('unit_number', { ascending: true }),
  ]);

  const unitsByStatus = {
    sold: units?.filter((u) => u.status === 'sold').length ?? 0,
    reserved: units?.filter((u) => u.status === 'reserved').length ?? 0,
    available: units?.filter((u) => u.status === 'available').length ?? 0,
    unavailable: units?.filter((u) => u.status === 'unavailable').length ?? 0,
  };

  // Group units by room count
  const unitsByRooms: Record<string, { count: number; avgPrice: number | null }> = {};
  (units ?? []).forEach((u) => {
    const key = u.rooms ? `${u.rooms}` : 'other';
    if (!unitsByRooms[key]) unitsByRooms[key] = { count: 0, avgPrice: null };
    unitsByRooms[key].count++;
  });

  // Calculate avg prices per room count
  Object.keys(unitsByRooms).forEach((key) => {
    const prices = (units ?? [])
      .filter((u) => (u.rooms ? `${u.rooms}` : 'other') === key && u.price)
      .map((u) => u.price as number);
    if (prices.length > 0) {
      unitsByRooms[key].avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    }
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <ProjectHeader project={project} />

      <ProjectDetailClient
        projectId={project.id}
        media={media ?? []}
        units={(units ?? []) as any}
        unitsByStatus={unitsByStatus}
        unitsByRooms={unitsByRooms}
        totalUnits={project.total_units ?? 0}
        city={project.city}
        neighborhood={project.neighborhood}
        projectSlug={slug}
        projectName={project.name}
        userName={userName}
      />
    </div>
  );
}
