'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { fullProjectSchema, cleanFormData } from '@/types/project-wizard-schema';

/**
 * Server Actions for project CRUD.
 *
 * Why Server Actions instead of client-side Supabase calls:
 *   1. Pre-flight auth + role check (never hits DB with invalid role)
 *   2. Structured error responses (not raw PostgrestError)
 *   3. Audit-friendly: all writes go through one layer
 *   4. revalidatePath works - server cache stays in sync
 */

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'INTERNAL' };

async function requireEditor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'אנא התחבר', code: 'UNAUTHORIZED' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: 'פרופיל לא נמצא', code: 'UNAUTHORIZED' as const };
  if (!profile.is_active) return { error: 'החשבון הושבת', code: 'FORBIDDEN' as const };
  if (profile.role !== 'admin' && profile.role !== 'editor') {
    return { error: 'אין הרשאה לפעולה זו', code: 'FORBIDDEN' as const };
  }

  return { user, profile, supabase };
}

// ============================================================================
// CREATE PROJECT
// ============================================================================

export async function createProjectAction(
  input: z.infer<typeof fullProjectSchema>
): Promise<ActionResult<{ id: string; slug: string }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  const parsed = fullProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      code: 'VALIDATION',
    };
  }

  const cleanedData = cleanFormData(parsed.data);

  const { data, error } = await auth.supabase
    .from('projects')
    .insert({
      ...(cleanedData as any),
      created_by: auth.user.id,
      updated_by: auth.user.id,
    })
    .select('id, slug')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'קיים כבר פרויקט עם שם או מזהה זה', code: 'CONFLICT' };
    }
    if (error.code === '23514') {
      return { ok: false, error: 'נתונים לא תקינים (check constraint)', code: 'VALIDATION' };
    }
    return { ok: false, error: error.message, code: 'INTERNAL' };
  }

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return { ok: true, data };
}

// ============================================================================
// CREATE MEDIA RECORD (called by wizard AFTER storage upload completes)
// ============================================================================

const createMediaRecordSchema = z.object({
  project_id: z.string().uuid(),
  media_type: z.enum(['image', 'rendering', 'floor_plan', 'site_plan', 'document', 'video']),
  storage_path: z.string().min(1),
  public_url: z.string().url(),
  file_name: z.string().min(1),
  file_size_bytes: z.number().int().positive(),
  mime_type: z.string().min(1),
  display_order: z.number().int().min(0).default(0),
  is_cover: z.boolean().default(false),
});

export async function createMediaRecordAction(
  input: z.infer<typeof createMediaRecordSchema>
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  const parsed = createMediaRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid media input', code: 'VALIDATION' };
  }

  // Sanitize file_name - strip any HTML/script chars that might've slipped through
  const safeName = parsed.data.file_name.replace(/[<>"'`]/g, '').slice(0, 255);

  const { data, error } = await auth.supabase
    .from('project_media')
    .insert({
      ...parsed.data,
      file_name: safeName,
      uploaded_by: auth.user.id,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Conflict on unique cover index - another cover was set simultaneously
      return { ok: false, error: 'יש כבר תמונה ראשית לפרויקט זה', code: 'CONFLICT' };
    }
    return { ok: false, error: error.message, code: 'INTERNAL' };
  }

  // Update project cover_image_url if this was marked as cover
  if (parsed.data.is_cover) {
    await auth.supabase
      .from('projects')
      .update({ cover_image_url: parsed.data.public_url })
      .eq('id', parsed.data.project_id);
  }

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { ok: true, data };
}

// ============================================================================
// DELETE MEDIA (storage + DB, atomic-ish)
// ============================================================================

export async function deleteMediaAction(
  mediaId: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  if (!z.string().uuid().safeParse(mediaId).success) {
    return { ok: false, error: 'Invalid media ID', code: 'VALIDATION' };
  }

  // Fetch the media record to get storage_path
  const { data: media, error: fetchError } = await auth.supabase
    .from('project_media')
    .select('id, storage_path, project_id, is_cover')
    .eq('id', mediaId)
    .single();

  if (fetchError || !media) {
    return { ok: false, error: 'מדיה לא נמצאה', code: 'VALIDATION' };
  }

  // Delete storage first (if this fails, we keep the DB record - orphan prevention)
  const { error: storageError } = await auth.supabase.storage
    .from('project-media')
    .remove([media.storage_path]);

  if (storageError) {
    return { ok: false, error: `שגיאה במחיקת הקובץ: ${storageError.message}`, code: 'INTERNAL' };
  }

  // Then delete DB record
  const { error: dbError } = await auth.supabase.from('project_media').delete().eq('id', mediaId);

  if (dbError) {
    return { ok: false, error: dbError.message, code: 'INTERNAL' };
  }

  // If it was the cover, clear project.cover_image_url
  if (media.is_cover) {
    await auth.supabase
      .from('projects')
      .update({ cover_image_url: null })
      .eq('id', media.project_id);
  }

  revalidatePath(`/projects`);
  return { ok: true, data: { deleted: true } };
}

// ============================================================================
// SET COVER IMAGE
// ============================================================================

export async function setCoverImageAction(
  mediaId: string
): Promise<ActionResult<{ success: boolean }>> {
  const auth = await requireEditor();
  if ('error' in auth) return { ok: false, error: auth.error, code: auth.code };

  // Get the media and its project
  const { data: media } = await auth.supabase
    .from('project_media')
    .select('id, project_id, public_url')
    .eq('id', mediaId)
    .single();

  if (!media) return { ok: false, error: 'מדיה לא נמצאה', code: 'VALIDATION' };

  // Unset existing cover (atomic via unique index, do it first)
  await auth.supabase
    .from('project_media')
    .update({ is_cover: false })
    .eq('project_id', media.project_id)
    .eq('is_cover', true);

  // Set the new cover
  const { error } = await auth.supabase
    .from('project_media')
    .update({ is_cover: true })
    .eq('id', mediaId);

  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };

  // Update project.cover_image_url
  await auth.supabase
    .from('projects')
    .update({ cover_image_url: media.public_url })
    .eq('id', media.project_id);

  revalidatePath(`/projects`);
  return { ok: true, data: { success: true } };
}

// ============================================================================
// SOFT DELETE PROJECT (admin only)
// ============================================================================

export async function softDeleteProjectAction(
  projectId: string
): Promise<ActionResult<{ deleted: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'אנא התחבר', code: 'UNAUTHORIZED' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'admin') {
    return { ok: false, error: 'רק אדמין יכול למחוק פרויקטים', code: 'FORBIDDEN' };
  }

  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', projectId);

  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return { ok: true, data: { deleted: true } };
}
