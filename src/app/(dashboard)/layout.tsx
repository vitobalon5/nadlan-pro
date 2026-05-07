import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If middleware passed but session expired between requests, fail gracefully
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single();

  // Fallback profile if not found - prevents redirect loop
  const safeProfile = profile ?? {
    full_name: user.email?.split('@')[0] ?? 'User',
    email: user.email ?? '',
    role: 'viewer' as const,
  };

  let projectCount = 0;
  try {
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);
    projectCount = count ?? 0;
  } catch {
    projectCount = 0;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={safeProfile} projectCount={projectCount} />
      <main className="flex-1 overflow-y-auto bg-background scrollbar-thin">{children}</main>
    </div>
  );
}
