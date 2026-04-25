import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'border-transparent bg-[hsl(var(--success-bg))] text-[hsl(var(--success-foreground))]',
        warning: 'border-transparent bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-foreground))]',
        info: 'border-transparent bg-[hsl(var(--info-bg))] text-[hsl(var(--info-foreground))]',
        destructive: 'border-transparent bg-[hsl(var(--destructive-bg))] text-[hsl(var(--destructive))]',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
