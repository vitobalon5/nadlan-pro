'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirectTo') as string | null;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error:
        error.message === 'Invalid login credentials'
          ? 'אימייל או סיסמה שגויים'
          : 'שגיאה בהתחברות. נסה שוב.',
    };
  }

  // Server-side redirect - cookies are already set by Supabase SSR
  const safeRedirect = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
  redirect(safeRedirect);
}