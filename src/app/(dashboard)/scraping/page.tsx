import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listProviders, listProviderSummaries } from '@/lib/scrapers/registry';
import { ScrapingPageClient } from './scraping-client';

export default async function ScrapingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const canTrigger = profile?.role === 'admin' || profile?.role === 'editor';

  // Get providers with health status - check each one's healthCheck()
  const providerInstances = listProviders();
  const summaries = listProviderSummaries();
  const providers = await Promise.all(
    summaries.map(async (s, i) => {
      const provider = providerInstances[i];
      let healthy = true;
      try {
        if (provider.healthCheck) {
          healthy = await Promise.race([
            provider.healthCheck(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
          ]);
        }
      } catch {
        healthy = false;
      }
      return { ...s, healthy };
    })
  );

  const { data: recentJobs } = await supabase
    .from('scraping_jobs')
    .select('id, source, status, items_found, items_new, items_failed, started_at, completed_at, error_message')
    .order('created_at', { ascending: false })
    .limit(15);

  return (
    <ScrapingPageClient
      providers={providers}
      recentJobs={recentJobs ?? []}
      canTrigger={canTrigger}
    />
  );
}
