'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { loginAction } from './actions';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(() => {
    const reason = searchParams.get('reason');
    if (reason === 'deactivated') return 'Account deactivated. Contact admin.';
    if (reason === 'invalid_link') return 'Link expired. Request a new one.';
    return null;
  });
  const [loading, setLoading] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');

    setRedirecting(true);
    if (type === 'recovery') {
      window.location.replace('/reset-password' + hash);
    } else if (type === 'invite' || type === 'signup') {
      window.location.replace('/set-password?welcome=1' + hash);
    } else {
      window.history.replaceState(null, '', '/');
      window.location.replace('/dashboard');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    const redirectTo = searchParams.get('redirect');
    if (redirectTo) formData.append('redirectTo', redirectTo);

    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
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
            The platform saved us 15 hours of work per week managing projects and gave us market insights we never had before.
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-medium text-white backdrop-blur">
              RC
            </div>
            <div>
              <p className="text-sm font-medium text-white">Ronen Cohen</p>
              <p className="text-xs text-white/60">CEO, Azorim Ltd.</p>
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
            <h1 className="text-2xl font-semibold tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to continue
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
              <Label htmlFor="email">Email</Label>
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
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                  tabIndex={-1}
                >
                  Forgot password
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
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Access for company employees only. Contact admin for permissions.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          2026 Nadlan Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
}
