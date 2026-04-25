'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';

/**
 * Forgot-password page. User enters their email, Supabase sends a recovery link.
 *
 * Security note: We always show the "if the account exists" message regardless
 * of whether the email is actually registered. This prevents email enumeration
 * (an attacker can't use this form to learn which emails are registered).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`,
    });

    // Even if there's an error, don't reveal whether the email exists.
    // Only show network/unexpected errors.
    if (resetError && !resetError.message.includes('rate')) {
      // Still show generic success to prevent enumeration
      console.error(resetError);
    }

    if (resetError?.message?.includes('rate')) {
      setError('יותר מדי בקשות. נסה שוב בעוד כמה דקות.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
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
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--success-bg))]">
              <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">בדוק את המייל שלך</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              אם קיים חשבון המשויך ל-<span className="font-medium text-foreground">{email}</span>,
              שלחנו קישור לאיפוס הסיסמה.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              הקישור יהיה בתוקף למשך שעה. אם לא מצאת את המייל, בדוק בתיקיית הספאם.
            </p>

            <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <ArrowRight className="h-4 w-4" />
              חזרה להתחברות
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 Nadlan Pro · כל הזכויות שמורות
        </p>
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
          <h1 className="text-2xl font-semibold tracking-tight">שכחת סיסמה?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            הזן את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                שולח...
              </>
            ) : (
              'שלח קישור לאיפוס'
            )}
          </Button>

          <div className="text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowRight className="h-4 w-4" />
              חזרה להתחברות
            </Link>
          </div>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        © 2026 Nadlan Pro · כל הזכויות שמורות
      </p>
    </div>
  );
}
