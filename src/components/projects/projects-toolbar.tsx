'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectStatus } from '@/types/domain';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'הכל' },
  { value: 'planning', label: 'תכנון' },
  { value: 'pre_sale', label: 'טרום-מכירה' },
  { value: 'under_construction', label: 'בבנייה' },
  { value: 'completed', label: 'הושלם' },
];

export function ProjectsToolbar({ onNewClick }: { onNewClick: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') ?? 'all';
  const currentSearch = searchParams.get('q') ?? '';

  const [search, setSearch] = React.useState(currentSearch);

  // Debounced search
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (search === currentSearch) return;
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set('q', search);
      else params.delete('q');
      router.push(`/projects?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [search, currentSearch, router, searchParams]);

  const setStatus = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') params.delete('status');
    else params.set('status', status);
    router.push(`/projects?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם, עיר או יזם..."
          className="pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-1 rounded-lg border p-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={
              'rounded-md px-3 py-1 text-xs transition-colors ' +
              (currentStatus === f.value
                ? 'bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-900))] font-medium'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <Button onClick={onNewClick} className="mr-auto">
        <Plus className="h-4 w-4" />
        פרויקט חדש
      </Button>
    </div>
  );
}
