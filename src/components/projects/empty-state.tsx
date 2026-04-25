'use client';

import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onAddClick: () => void;
  hasFilters: boolean;
}

export function ProjectsEmptyState({ onAddClick, hasFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">לא נמצאו פרויקטים</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          לא נמצאו תוצאות שתואמות לסינון הנוכחי. נסה לשנות את החיפוש או את הסטטוס.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary-50))]">
        <Building2 className="h-6 w-6 text-[hsl(var(--primary-600))]" />
      </div>
      <h3 className="text-base font-medium mb-1.5">אין עדיין פרויקטים</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        התחל על ידי יצירת הפרויקט הראשון. תוכל להוסיף תמונות, הדמיות, יחידות דיור ופרטים נוספים.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4" />
        פרויקט ראשון
      </Button>
    </div>
  );
}
