import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from './dashboard-client';

type ProjectStatus =
  | 'planning'
  | 'pre_sale'
  | 'under_construction'
  | 'completed'
  | 'sold_out'
  | 'archived';

type RecentProject = {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: ProjectStatus;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardClient
        userName="User"
        canCreate={false}
        kpis={{ totalProjects: 0, activeProjects: 0 }}
        recentProjects={[]}
      />
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  const safeProfile = profile ?? {
    role: 'viewer' as const,
    full_name: user.email?.split('@')[0] ?? 'User',
    email: user.email ?? '',
  };

  const canCreate = safeProfile.role === 'admin' || safeProfile.role === 'editor';

  let totalProjects = 0;
  let activeProjects = 0;
  let recentProjects: RecentProject[] = [];

  try {
    const [totalResult, activeResult, recentResult] = await Promise.all([
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

    totalProjects = totalResult.count ?? 0;
    activeProjects = activeResult.count ?? 0;
    recentProjects = (recentResult.data ?? []) as RecentProject[];
  } catch {
    // Keep defaults
  }

  return (
    <DashboardClient
      userName={safeProfile.full_name ?? safeProfile.email}
      canCreate={canCreate}
      kpis={{
        totalProjects,
        activeProjects,
      }}
      recentProjects={recentProjects}
    />
  );
}
