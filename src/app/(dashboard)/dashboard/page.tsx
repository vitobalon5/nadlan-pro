import { createClient } from '@/lib/supabase/server';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user disappeared between middleware/layout and here, just render empty state
  // The layout already protects this route, so this is just a safety net
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

  // Fetch profile to check write permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  // Fallback if profile not found - prevents redirect loop
  const safeProfile = profile ?? {
    role: 'viewer' as const,
    full_name: user.email?.split('@')[0] ?? 'User',
    email: user.email ?? '',
  };

  const canCreate = safeProfile.role === 'admin' || safeProfile.role === 'editor';

  // Fetch KPIs for dashboard summary - with try/catch in case of RLS issues
  let totalProjects = 0;
  let activeProjects = 0;
  let recentProjects: Array<{
    id: string;
    slug: string;
    name: string;
    city: string;
    status: string;
    created_at: string;
  }> = [];

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
    recentProjects = recentResult.data ?? [];
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
