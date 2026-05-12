import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/sidebar';

// StockHouse Watermark - appears behind all dashboard pages
function StockHouseWatermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="text-foreground/[0.08] font-bold tracking-tighter whitespace-nowrap"
        style={{
          fontSize: 'clamp(8rem, 18vw, 20rem)',
          transform: 'rotate(-12deg)',
          letterSpacing: '-0.05em',
        }}
      >
        StockHouse
      </div>
    </div>
  );
}

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
      <main className="relative flex-1 overflow-y-auto bg-background scrollbar-thin">
        <StockHouseWatermark />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
