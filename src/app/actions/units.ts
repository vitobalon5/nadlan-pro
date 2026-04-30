'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  createUnitSchema,
  updateUnitSchema,
  type CreateUnitInput,
  type UpdateUnitInput,
} from './units-types';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'INTERNAL' };

async function requireEditor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'אנא התחבר', code: 'UNAUTHORIZED' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) return { error: 'החשבון הושבת', code: 'FORBIDDEN' as const };
  if (profile.role !== 'admin' && profile.role !== 'editor') {
    return { error: 'אין הרשאה לפעולה זו', code: 'FORBIDDEN' as const };
  }
  return { user, profile, supabase };
}

// ============================================================================
// CRUD
// ============================================================================

export async function createUnitAction(
  input: CreateUnitInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  const parsed = createUnitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
      code: 'VALIDATION',
    };
  }

  const data = parsed.data;
  // Auto-calculate price_per_sqm if both provided
  const price_per_sqm =
    data.price && data.area_sqm ? Math.round(data.price / data.area_sqm) : null;

  const { data: unit, error } = await auth.supabase
    .from('project_units')
    .insert({ ...data, price_per_sqm })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'מספר יחידה זה כבר קיים בפרויקט', code: 'CONFLICT' };
    }
    if (error.code === '23514') {
      return { ok: false, error: 'נתונים לא תקינים', code: 'VALIDATION' };
    }
    return { ok: false, error: error.message, code: 'INTERNAL' };
  }

  revalidatePath(`/projects`);
  return { ok: true, data: unit };
}

export async function updateUnitAction(
  input: UpdateUnitInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  const parsed = updateUnitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'נתונים לא תקינים', code: 'VALIDATION' };
  }

  const { id, ...data } = parsed.data;
  const price_per_sqm =
    data.price && data.area_sqm ? Math.round(data.price / data.area_sqm) : undefined;

  // If marking as sold, auto-set sold_at timestamp and sold_price
  const statusUpdate =
    data.status === 'sold' ? { sold_at: new Date().toISOString(), sold_price: data.price } : {};

  const { error } = await auth.supabase
    .from('project_units')
    .update({
      ...data,
      ...(price_per_sqm !== undefined && { price_per_sqm }),
      ...statusUpdate,
    })
    .eq('id', id);

  if (error) {
    if (error.code === '23514') {
      return { ok: false, error: 'נתונים לא תקינים', code: 'VALIDATION' };
    }
    return { ok: false, error: error.message, code: 'INTERNAL' };
  }

  revalidatePath(`/projects`);
  return { ok: true, data: { id } };
}

export async function deleteUnitAction(unitId: string): Promise<ActionResult<{ deleted: boolean }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  if (!z.string().uuid().safeParse(unitId).success) {
    return { ok: false, error: 'Invalid unit id', code: 'VALIDATION' };
  }

  const { error } = await auth.supabase.from('project_units').delete().eq('id', unitId);
  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };

  revalidatePath(`/projects`);
  return { ok: true, data: { deleted: true } };
}

/**
 * Bulk create units - useful for "add 24 units numbered 1-24".
 * Runs in a single insert for atomicity.
 */
export async function bulkCreateUnitsAction(
  projectId: string,
  count: number,
  startNumber: number = 1
): Promise<ActionResult<{ inserted: number }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  if (count < 1 || count > 500) {
    return { ok: false, error: 'כמות חייבת להיות בין 1 ל-500', code: 'VALIDATION' };
  }

  const units = Array.from({ length: count }, (_, i) => ({
    project_id: projectId,
    unit_number: String(startNumber + i),
    status: 'available' as const,
  }));

  const { data, error } = await auth.supabase
    .from('project_units')
    .insert(units)
    .select('id');

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'חלק מהמספרים כבר קיימים בפרויקט', code: 'CONFLICT' };
    }
    return { ok: false, error: error.message, code: 'INTERNAL' };
  }

  revalidatePath(`/projects`);
  return { ok: true, data: { inserted: data?.length ?? 0 } };
}
