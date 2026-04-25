import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles the auth callback from Supabase email links.
 *
 * Supabase sends email links in two formats:
 *
 * 1. PKCE flow (newer, preferred):
 *    /auth/callback?code=xxx&type=recovery  (or type=invite, type=signup)
 *    We exchange the code for a session, then redirect to the appropriate page.
 *
 * 2. Implicit flow (legacy, URL fragment):
 *    /login#access_token=xxx&refresh_token=xxx&type=recovery
 *    The fragment is not sent to the server - we rely on client-side handling
 *    in the login page to detect this and route to /reset-password.
 *
 * This route only handles format #1.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // 'recovery' | 'invite' | 'signup' | 'magiclink'
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    // No code - redirect to login with error
    return NextResponse.redirect(`${origin}/login?reason=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?reason=invalid_link`);
  }

  // Route based on the type of email link:
  // - recovery → /reset-password (user forgot password)
  // - invite → /set-password (admin invited them, they need to set first password)
  // - signup → /set-password (email confirmation + password setup)
  // - magiclink / default → dashboard
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`);
  }
  if (type === 'invite' || type === 'signup') {
    return NextResponse.redirect(`${origin}/set-password?welcome=1`);
  }

  // Magic link or unknown type → go to requested page or dashboard
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return NextResponse.redirect(`${origin}${safeNext}`);
}
