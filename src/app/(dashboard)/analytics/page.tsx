import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AnalyticsPageClient } from './analytics-client';

export const metadata = {
  title: 'ניתוח שוק — Nadlan Pro',
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name ?? profile?.email ?? 'Unknown';

  return <AnalyticsPageClient userName={userName} />;
}
