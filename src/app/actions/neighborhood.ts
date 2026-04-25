'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchCityData, type CityDataResult } from '@/lib/services/city-data';

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchNeighborhoodDataAction(
  city: string,
  neighborhood?: string
): Promise<ActionResult<CityDataResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר' };

  if (!city || city.trim().length === 0) {
    return { ok: false, error: 'נדרשת עיר' };
  }

  try {
    const data = await fetchCityData(city.trim(), neighborhood?.trim() || undefined);
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'שגיאה בטעינת נתונים' };
  }
}
