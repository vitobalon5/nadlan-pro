'use server';

import { createClient } from '@/lib/supabase/server';
import type { CommandProjectResult } from './command-search-types';

/**
 * Command bar search — returns projects matching the query for Cmd+K nav.
 *
 * Uses ILIKE for fuzzy matching on name and city. Small result limit (20)
 * because the UI is only designed to show a few at a time.
 *
 * Authentication: any active user. The command bar doesn't mutate anything -
 * it's pure navigation, so viewers get access too.
 */

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function searchProjectsForCommandAction(
  query: string
): Promise<ActionResult<CommandProjectResult[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };

  const q = query.trim();

  let queryBuilder = supabase
    .from('projects')
    .select('id, name, slug, city, neighborhood, status, cover_image_url')
    .is('deleted_at', null);

  if (q.length > 0) {
    // Search in name + city + neighborhood
    queryBuilder = queryBuilder.or(
      `name.ilike.%${q}%,city.ilike.%${q}%,neighborhood.ilike.%${q}%`
    );
  }

  const { data, error } = await queryBuilder
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as CommandProjectResult[] };
}
