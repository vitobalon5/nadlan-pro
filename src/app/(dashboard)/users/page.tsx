import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UsersPageClient } from './users-client';

export const metadata = { title: 'משתמשים — Nadlan Pro' };

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'admin') {
    // Not admin - show a "no access" page instead of redirecting
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-xl border bg-[hsl(var(--warning-bg))] p-6 text-center">
          <h2 className="text-lg font-medium mb-1">גישה מוגבלת</h2>
          <p className="text-sm text-muted-foreground">
            דף ניהול המשתמשים זמין לאדמינים בלבד.
          </p>
        </div>
      </div>
    );
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, phone, created_at')
    .order('created_at', { ascending: false });

  return <UsersPageClient initialUsers={(users ?? []) as any} currentUserId={user.id} />;
}
