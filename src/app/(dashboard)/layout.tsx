import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={profile} projectCount={count ?? 0} />
      <main className="flex-1 overflow-y-auto bg-background scrollbar-thin">{children}</main>
    </div>
  );
}
