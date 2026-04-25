import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/projects',
  '/analytics',
  '/scraping',
  '/users',
];
// Routes that are part of the auth flow. Logged-in users accessing /login
// will be redirected to /dashboard, but /set-password and /reset-password
// are reachable even when logged in (that's when the user is completing an
// invitation or resetting their password).
const AUTH_ROUTES = ['/login'];
const PUBLIC_AUTH_ROUTES = ['/forgot-password', '/set-password', '/reset-password', '/auth/callback'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: getUser() refreshes the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isProtectedRoute =
    !isPublicAuthRoute &&
    (PROTECTED_ROUTES.some((r) => pathname.startsWith(r)) || pathname === '/');

  // Not logged in + trying to access protected → redirect to /login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Only preserve redirect param if it's a safe internal path
    if (isInternalPath(pathname)) {
      url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }

  // Logged in but trying to access auth route → redirect to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Logged in + accessing protected route → verify is_active
  // This catches the case where an admin deactivates a user mid-session
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single();

    if (profile && profile.is_active === false) {
      // Sign them out and redirect
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('reason', 'deactivated');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

/** Only allow redirects to internal paths - prevents open-redirect attacks */
function isInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
