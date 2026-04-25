import Link from 'next/link';
import { Building2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Building2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium mb-1">הפרויקט לא נמצא</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        ייתכן שהפרויקט נמחק או שאין לך הרשאות לצפות בו.
      </p>
      <Button asChild>
        <Link href="/projects">
          <ChevronLeft className="h-4 w-4" />
          חזרה לפרויקטים
        </Link>
      </Button>
    </div>
  );
}
