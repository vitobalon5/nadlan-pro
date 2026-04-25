import { cn } from '@/lib/utils';

/**
 * Skeleton loader using the shimmer utility from globals.css.
 * Uses --muted (auto dark-mode adapted) so it looks natural in both themes.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shimmer rounded-md', className)} {...props} />;
}
