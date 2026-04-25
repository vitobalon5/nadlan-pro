'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';

/**
 * Reset-password page.
 *
 * Reached when:
 * - User clicks the password-recovery email link → /auth/callback?type=recovery → here
 * - Implicit flow: tokens arrive in URL hash directly at /reset-password#access_token=...
 *
 * User sets a new password, then is redirected to the dashboard.
 */
export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionReady, setSessionReady] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setSessionReady(true);
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        setSessionReady(false);
      }
    }

    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('הסיסמה חייבת להיות באורך 8 תווים לפחות');
      return;
    }
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'שגיאה באיפוס הסיסמה');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  if (sessionReady === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessionReady === false) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--destructive-bg))]">
            <AlertCircle className="h-6 w-6 text-[hsl(var(--destructive))]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">הקישור לא תקף</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              הקישור לאיפוס סיסמה פג תוקף או כבר נוצל. נסה לבקש קישור חדש.
            </p>
          </div>
          <div className="space-y-2">
            <Button onClick={() => router.push('/forgot-password')} className="w-full">
              בקש קישור חדש
            </Button>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="w-full"
            >
              חזרה להתחברות
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 sm:px-12">
      <div className="absolute top-6 left-6">
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-medium">Nadlan Pro</span>
      </div>

      <div className="my-auto mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary-50))]">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">איפוס סיסמה</h1>
          <p className="mt-2 text-sm text-muted-foreground">הגדר סיסמה חדשה לחשבון שלך</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] px-3 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))] mt-0.5" />
              <span className="text-[hsl(var(--destructive))]">{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="password">סיסמה חדשה</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
              dir="ltr"
              className="text-right"
              minLength={8}
              placeholder="לפחות 8 תווים"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">אימות סיסמה</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
              dir="ltr"
              className="text-right"
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                שומר...
              </>
            ) : (
              'שמור סיסמה חדשה'
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        © 2026 Nadlan Pro · כל הזכויות שמורות
      </p>
    </div>
  );
}
