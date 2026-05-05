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
    if (reason === 'deactivated') return 'החשבון שלך הושבת. פנה למנהל המערכת.';
    if (reason === 'invalid_link') return 'הקישור לא תקף או פג תוקף. נסה לבקש קישור חדש.';
    return null;
  });
  const [loading, setLoading] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);

  // Detect implicit-flow tokens in URL fragment (#access_token=...&type=recovery)
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
    // If no error, the server action calls redirect() which throws - we never reach here
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
            "הפלטפורמה הזו חסכה לנו 15 שעות עבודה בשבוע בניה
