import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already protects this, but belt-and-suspenders
  if (!user) redirect('/login');

  // Fetch profile to check write permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const canCreate = profile.role === 'admin' || profile.role === 'editor';

  // Fetch KPIs for dashboard summary
  const [{ count: totalProjects }, { count: activeProjects }, { data: recentProjects }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .in('status', ['pre_sale', 'under_construction']),
      supabase
        .from('projects')
        .select('id, slug, name, city, status, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

  return (
    <DashboardClient
      userName={profile.full_name ?? profile.email}
      canCreate={canCreate}
      kpis={{
        totalProjects: totalProjects ?? 0,
        activeProjects: activeProjects ?? 0,
      }}
      recentProjects={recentProjects ?? []}
    />
  );
}
