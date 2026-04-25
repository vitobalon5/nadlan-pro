'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  LayoutGrid,
  Building2,
  TrendingUp,
  Database,
  Users,
  Plus,
  FileText,
  Moon,
  Sun,
  Loader2,
  CornerDownLeft,
  Command as CommandIcon,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  searchProjectsForCommandAction,
  type CommandProjectResult,
} from '@/app/actions/command-search';
import { useTheme } from '@/components/theme-provider';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Command palette (Cmd+K).
 *
 * Structure:
 *  - Top: search input (auto-focused)
 *  - Body: groups of commands + project search results
 *  - Footer: keyboard shortcuts hint
 *
 * Uses cmdk library (same one Linear uses) for keyboard nav + fuzzy filter.
 * Framer Motion for entrance.
 */
export function CommandBar({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = React.useState('');
  const [projects, setProjects] = React.useState<CommandProjectResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Debounced project search
  React.useEffect(() => {
    if (!open) return;

    // Race-condition-safe
    let cancelled = false;
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchProjectsForCommandAction(query).then((res) => {
        if (cancelled) return;
        if (res.ok) setProjects(res.data);
        setIsSearching(false);
      });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  // Clear query when closing
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => setQuery(''), 200); // after exit animation
    }
  }, [open]);

  const runCommand = (fn: () => void) => {
    onOpenChange(false);
    // Small delay so the close animation has time to start
    setTimeout(fn, 100);
  };

  const navItems = [
    { label: 'לוח בקרה', path: '/dashboard', icon: LayoutGrid },
    { label: 'פרויקטים', path: '/projects', icon: Building2 },
    { label: 'ניתוח שוק', path: '/analytics', icon: TrendingUp },
    { label: 'איסוף נתונים', path: '/scraping', icon: Database },
    { label: 'משתמשים', path: '/users', icon: Users },
  ];

  const actionItems = [
    {
      label: 'פרויקט חדש',
      hint: 'צור פרויקט חדש',
      icon: Plus,
      action: () => router.push('/projects?new=1'),
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[20%] z-50 mx-auto max-w-xl px-4"
            role="dialog"
            aria-label="חיפוש מהיר"
          >
            <Command
              className="overflow-hidden rounded-xl border bg-popover shadow-2xl"
              shouldFilter={false} // we do our own server-side filtering for projects
              loop
            >
              {/* Search input */}
              <div className="flex items-center gap-2 border-b px-3.5 py-3">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="חפש פרויקטים או נווט..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                <kbd className="pointer-events-none hidden rounded border border-border-strong bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  ESC
                </kbd>
              </div>

              {/* Body */}
              <Command.List className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin">
                <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                  לא נמצאו תוצאות
                </Command.Empty>

                {/* Projects - shown when there are results */}
                {projects.length > 0 && (
                  <Command.Group
                    heading="פרויקטים"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {projects.map((p) => (
                      <CommandItem
                        key={p.id}
                        onSelect={() => runCommand(() => router.push(`/projects/${p.slug}`))}
                        icon={Building2}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{p.name}</span>
                            <StatusDot status={p.status} />
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            <span className="truncate">
                              {[p.neighborhood, p.city].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </Command.Group>
                )}

                {/* Navigation - always shown */}
                <Command.Group
                  heading="נווט"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:mt-2"
                >
                  {navItems.map((item) => (
                    <CommandItem
                      key={item.path}
                      onSelect={() => runCommand(() => router.push(item.path))}
                      icon={item.icon}
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                </Command.Group>

                {/* Actions */}
                <Command.Group
                  heading="פעולות"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:mt-2"
                >
                  {actionItems.map((item) => (
                    <CommandItem
                      key={item.label}
                      onSelect={() => runCommand(item.action)}
                      icon={item.icon}
                    >
                      {item.label}
                    </CommandItem>
                  ))}
                  <CommandItem
                    onSelect={() =>
                      runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))
                    }
                    icon={theme === 'dark' ? Sun : Moon}
                  >
                    עבור ל-{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
                  </CommandItem>
                </Command.Group>
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="rounded border border-border-strong bg-background px-1 py-px">
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </kbd>
                    לבחור
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="rounded border border-border-strong bg-background px-1 py-px font-mono text-[10px]">
                      ↑↓
                    </kbd>
                    לנווט
                  </span>
                </div>
                <span className="inline-flex items-center gap-1">
                  <CommandIcon className="h-2.5 w-2.5" />K
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Command item - row with icon and hover/selection styling
// ---------------------------------------------------------------------------

function CommandItem({
  children,
  onSelect,
  icon: Icon,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon?: React.ElementType;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-foreground transition-colors',
        'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
        'aria-selected:bg-accent aria-selected:text-accent-foreground'
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">{children}</div>
    </Command.Item>
  );
}

// ---------------------------------------------------------------------------
// Status dot for projects
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    planning: 'bg-[hsl(var(--muted-foreground))]',
    approved: 'bg-[hsl(var(--info))]',
    marketing: 'bg-[hsl(var(--warning))]',
    construction: 'bg-[hsl(var(--primary))]',
    completed: 'bg-[hsl(var(--success))]',
    cancelled: 'bg-[hsl(var(--destructive))]',
  };
  return (
    <span className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0', colors[status] ?? 'bg-muted')} />
  );
}
