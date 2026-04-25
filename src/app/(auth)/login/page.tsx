'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(() => {
    const reason = searchParams.get('reason');
    if (reason === 'deactivated') return 'החשבון שלך הושבת. פנה למנהל המערכת.';
    if (reason === 'invalid_link') return 'הקישור לא תקף או פג תוקף. נסה לבקש קישור חדש.';
    return null;
  });
  const [loading, setLoading] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);

  // Detect implicit-flow tokens in URL fragment (#access_token=...&type=recovery)
  // and route to the appropriate page. This happens when Supabase sends an email
  // with the legacy URL format instead of the PKCE query-param format.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');

    // supabase-js (createBrowserClient) has `detectSessionInUrl: true` by default,
    // which means it automatically picks up these tokens and creates a session.
    // We just need to decide where to send the user.
    setRedirecting(true);
    if (type === 'recovery') {
      // Keep the hash — the reset-password page will consume it
      window.location.replace('/reset-password' + hash);
    } else if (type === 'invite' || type === 'signup') {
      window.location.replace('/set-password?welcome=1' + hash);
    } else {
      // magiclink or default → dashboard (supabase-js already stored the session)
      window.history.replaceState(null, '', '/');
      window.location.replace('/dashboard');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'אימייל או סיסמה שגויים'
          : 'שגיאה בהתחברות. נסה שוב.'
      );
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get('redirect');
    router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard');
    router.refresh();
  };

  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">מעביר אותך...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[hsl(var(--primary-900))] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden
        />

        <div className="relative flex items-center gap-2.5 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-base font-medium">Nadlan Pro</span>
        </div>

        <div className="relative">
          <blockquote className="text-xl font-light leading-relaxed text-white/90">
            "הפלטפורמה הזו חסכה לנו 15 שעות עבודה בשבוע בניהול הפרויקטים
            ונתנה לנו תובנות שוק שלא היו לנו קודם."
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-medium text-white backdrop-blur">
              רכ
            </div>
            <div>
              <p className="text-sm font-medium text-white">רונן כהן</p>
              <p className="text-xs text-white/60">מנכ"ל, אזורים בע"מ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <div className="absolute top-6 left-6">
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium">Nadlan Pro</span>
        </div>

        <div className="my-auto mx-auto w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">ברוכים השבים</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              התחבר לחשבון שלך כדי להמשיך
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] px-3 py-2.5 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))] mt-0.5" />
                <span className="text-[hsl(var(--destructive))]">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                dir="ltr"
                className="text-right"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">סיסמה</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                  tabIndex={-1}
                >
                  שכחתי סיסמה
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                dir="ltr"
                className="text-right"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  מתחבר...
                </>
              ) : (
                'התחבר'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            גישה לעובדי החברה בלבד. צור קשר עם מנהל המערכת לקבלת הרשאות.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 Nadlan Pro · כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}
