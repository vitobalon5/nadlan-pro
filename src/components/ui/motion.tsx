'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Motion primitives for consistent entrance animations across the app.
 *
 * Design principles:
 * - Subtle, not showy: 300ms duration, slight y-offset, no bounces
 * - Respects prefers-reduced-motion: users who opted out get instant render
 * - Staggered children available via StaggerContainer/StaggerItem
 *
 * Use these instead of plain divs for top-level page sections, cards,
 * and lists where you want elements to feel like they're "settling in"
 * rather than snapping into place.
 */

// ---------------------------------------------------------------------------
// FadeIn - single element entrance
// ---------------------------------------------------------------------------

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> {
  delay?: number;
  /** Pixel offset for the y-axis translate. Default 8. Use 0 for pure fade. */
  y?: number;
  /** Duration override in seconds. Default 0.3. */
  duration?: number;
}

export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(function FadeIn(
  { delay = 0, y = 8, duration = 0.3, className, children, ...rest },
  ref
) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] /* custom ease-out */ }}
      className={cn(className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// StaggerContainer + StaggerItem - animate list items with cascade
// ---------------------------------------------------------------------------

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
} & Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'variants'>) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : 'hidden'}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerDelay, delayChildren: 0.05 },
        },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<'div'>, 'variants'>) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PageTransition - wraps page content with soft entry
// ---------------------------------------------------------------------------

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
