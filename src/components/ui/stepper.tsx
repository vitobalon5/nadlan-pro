'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, currentStep, completedSteps, onStepClick }: Props) {
  return (
    <nav aria-label="התקדמות בטופס" className="mb-8">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isClickable = isCompleted || index < currentStep;

          return (
            <li key={step.id} className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  'group w-full text-right transition-colors',
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all',
                      isCurrent && 'bg-primary text-primary-foreground ring-4 ring-[hsl(var(--primary-100))]',
                      isCompleted && !isCurrent && 'bg-[hsl(var(--success))] text-white',
                      !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium truncate transition-colors',
                        isCurrent && 'text-foreground',
                        !isCurrent && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 rounded-full transition-colors',
                      isCompleted ? 'bg-[hsl(var(--success))]' : 'bg-muted'
                    )}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
