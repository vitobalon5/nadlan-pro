'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { UserRow } from './users-types';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'INTERNAL' };

type AuthError = {
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN';
};
type AuthSuccess = {
  user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user']>;
  profile: { role: 'admin' | 'editor' | 'viewer'; is_active: boolean };
  supabase: Awaited<ReturnType<typeof createClient>>;
};

function isAuthError(r: AuthError | AuthSuccess): r is AuthError {
  return 'error' in r;
}

async function requireAdmin(): Promise<AuthError | AuthSuccess> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'אנא התחבר', code: 'UNAUTHORIZED' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) return { error: 'החשבון הושבת', code: 'FORBIDDEN' };
  if (profile.role !== 'admin') {
    return { error: 'פעולה זו זמינה לאדמינים בלבד', code: 'FORBIDDEN' };
  }
  return { user, profile, supabase };
}

// ============================================================================
// LIST USERS
// ============================================================================

export async function listUsersAction(): Promise<ActionResult<UserRow[]>> {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return { ok: false, error: auth.error, code: auth.code };

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, phone, created_at')
    .order('created_at', { ascending: false });

  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };
  return { ok: true, data: (data ?? []) as UserRow[] };
}

// ============================================================================
// INVITE USER (creates auth account + profile)
// ============================================================================

const inviteSchema = z.object({
  email: z.string().email('אימייל לא תקין'),
  full_name: z.string().min(2, 'שם מלא חובה').max(200),
  role: z.enum(['admin', 'editor', 'viewer']),
  phone: z.string().optional(),
});

export async function inviteUserAction(
  input: z.infer<typeof inviteSchema>
): Promise<ActionResult<{ userId: string; emailSent: boolean }>> {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return { ok: false, error: auth.error, code: auth.code };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
      code: 'VALIDATION',
    };
  }

  // Use admin client for auth operations (service_role bypasses RLS)
  const admin = createAdminClient();

  // Send magic-link invitation email. User sets their own password via email.
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.full_name },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite&next=/set-password`,
    }
  );

  if (inviteError) {
    if (inviteError.message.includes('already registered')) {
      return { ok: false, error: 'משתמש עם אימייל זה כבר קיים במערכת', code: 'CONFLICT' };
    }
    return { ok: false, error: inviteError.message, code: 'INTERNAL' };
  }

  const userId = inviteData.user?.id;
  if (!userId) {
    return { ok: false, error: 'נכשלה יצירת משתמש', code: 'INTERNAL' };
  }

  // The profile was auto-created by the on_auth_user_created trigger.
  // Update it with the role and other fields.
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      phone: parsed.data.phone ?? null,
      is_active: true,
    })
    .eq('id', userId);

  if (profileError) {
    return { ok: false, error: profileError.message, code: 'INTERNAL' };
  }

  revalidatePath('/users');
  return { ok: true, data: { userId, emailSent: true } };
}

// ============================================================================
// UPDATE USER (change role, activate/deactivate)
// ============================================================================

const updateUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  is_active: z.boolean().optional(),
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().optional().nullable(),
});

export async function updateUserAction(
  input: z.infer<typeof updateUserSchema>
): Promise<ActionResult<{ success: boolean }>> {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return { ok: false, error: auth.error, code: auth.code };

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'נתונים לא תקינים', code: 'VALIDATION' };
  }

  // Prevent admin from demoting/deactivating themselves (would lock them out)
  if (parsed.data.id === auth.user.id) {
    if (parsed.data.role && parsed.data.role !== 'admin') {
      return { ok: false, error: 'אי אפשר לשנות את התפקיד של עצמך', code: 'FORBIDDEN' };
    }
    if (parsed.data.is_active === false) {
      return { ok: false, error: 'אי אפשר להשבית את החשבון של עצמך', code: 'FORBIDDEN' };
    }
  }

  const { id, ...updates } = parsed.data;

  // Use admin client to bypass the role-change trigger (we ARE admin, validated above)
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update(updates).eq('id', id);

  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };

  revalidatePath('/users');
  return { ok: true, data: { success: true } };
}

// ============================================================================
// DELETE USER (removes auth + cascades profile)
// ============================================================================

export async function deleteUserAction(userId: string): Promise<ActionResult<{ deleted: boolean }>> {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return { ok: false, error: auth.error, code: auth.code };

  if (!z.string().uuid().safeParse(userId).success) {
    return { ok: false, error: 'Invalid user id', code: 'VALIDATION' };
  }

  if (userId === auth.user.id) {
    return { ok: false, error: 'אי אפשר למחוק את החשבון של עצמך', code: 'FORBIDDEN' };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };

  revalidatePath('/users');
  return { ok: true, data: { deleted: true } };
}

// ============================================================================
// SEND PASSWORD RESET
// ============================================================================

export async function sendPasswordResetAction(
  userId: string
): Promise<ActionResult<{ sent: boolean }>> {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return { ok: false, error: auth.error, code: auth.code };

  const admin = createAdminClient();

  // Get the user's email
  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (!profile) return { ok: false, error: 'משתמש לא נמצא', code: 'VALIDATION' };

  const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery&next=/reset-password`,
  });

  if (error) return { ok: false, error: error.message, code: 'INTERNAL' };
  return { ok: true, data: { sent: true } };
}
