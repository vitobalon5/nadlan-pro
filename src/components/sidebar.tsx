'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LayoutGrid, TrendingUp, Database, Users, LogOut, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useCommandBar } from './command-bar/command-bar-provider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  user: {
    full_name: string | null;
    email: string;
    role: string;
  };
  projectCount?: number;
}

const navItems = [
  { href: '/dashboard', label: 'סקירה כללית', icon: LayoutGrid },
  { href: '/projects', label: 'פרויקטים', icon: Building2, showCount: true },
  { href: '/analytics', label: 'ניתוח שוק', icon: TrendingUp },
  { href: '/scraping', label: 'איסוף נתונים', icon: Database },
  { href: '/users', label: 'משתמשים', icon: Users, adminOnly: true },
];

export function Sidebar({ user, projectCount }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { open: openCommandBar } = useCommandBar();

  const initials = (user.full_name || user.email)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="flex h-screen w-56 flex-col border-l bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-medium">Nadlan Pro</span>
        <div className="mr-auto">
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {/* Quick search trigger - opens Cmd+K palette */}
        <button
          onClick={openCommandBar}
          className="mb-2 flex w-full items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">חיפוש מהיר</span>
          <kbd className="mr-auto hidden items-center gap-0.5 rounded border border-border-strong bg-background px-1 py-px font-mono text-[9px] sm:inline-flex">
            ⌘K
          </kbd>
        </button>

        {navItems
          .filter((item) => !item.adminOnly || user.role === 'admin')
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-900))] font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.showCount && projectCount !== undefined && (
                  <span className="mr-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                    {projectCount}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2.5 rounded-md border px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user.full_name || user.email}</p>
            <p className="truncate text-[11px] text-muted-foreground capitalize">{user.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="התנתק"
            title="התנתק"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
