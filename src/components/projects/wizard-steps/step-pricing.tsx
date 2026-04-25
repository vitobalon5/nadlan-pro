'use client';

import { useFormContext } from 'react-hook-form';
import { Calendar, Building, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { formatILS } from '@/lib/utils';
import type { FullProjectForm } from '@/types/project-wizard-schema';

export function StepPricingForm() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<FullProjectForm>();

  // Live computed values for summary
  const priceMin = watch('price_min');
  const priceMax = watch('price_max');
  const pricePerSqm = watch('price_per_sqm_avg');
  const totalUnits = watch('total_units');

  const showPriceSummary =
    typeof priceMin === 'number' ||
    typeof priceMax === 'number' ||
    typeof pricePerSqm === 'number';

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h2 className="text-base font-medium mb-1">תמחור ולוחות זמנים</h2>
        <p className="text-xs text-muted-foreground">
          כל השדות אופציונליים · תוכל להוסיף ולעדכן אחר כך
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">מאפייני המבנה</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="מספר יחידות"
            htmlFor="total_units"
            error={errors.total_units?.message as string | undefined}
          >
            <Input
              id="total_units"
              type="number"
              min="1"
              placeholder="48"
              {...register('total_units')}
            />
          </FormField>

          <FormField
            label="מספר קומות"
            htmlFor="floors"
            error={errors.floors?.message as string | undefined}
          >
            <Input id="floors" type="number" min="1" placeholder="12" {...register('floors')} />
          </FormField>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">תמחור (₪)</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="מחיר מינימלי"
            htmlFor="price_min"
            error={errors.price_min?.message as string | undefined}
            hint="המחיר של הדירה הזולה ביותר"
          >
            <Input
              id="price_min"
              type="number"
              min="0"
              step="10000"
              placeholder="2500000"
              {...register('price_min')}
            />
          </FormField>

          <FormField
            label="מחיר מקסימלי"
            htmlFor="price_max"
            error={errors.price_max?.message as string | undefined}
            hint="המחיר של הדירה היקרה ביותר"
          >
            <Input
              id="price_max"
              type="number"
              min="0"
              step="10000"
              placeholder="12000000"
              {...register('price_max')}
            />
          </FormField>

          <FormField
            label='מחיר ממוצע למ"ר'
            htmlFor="price_per_sqm_avg"
            error={errors.price_per_sqm_avg?.message as string | undefined}
            hint="משמש לחישובי השוואת שוק"
            className="sm:col-span-2"
          >
            <Input
              id="price_per_sqm_avg"
              type="number"
              min="0"
              step="100"
              placeholder="54000"
              {...register('price_per_sqm_avg')}
            />
          </FormField>
        </div>

        {showPriceSummary && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
            {typeof priceMin === 'number' && typeof priceMax === 'number' && (
              <p>
                טווח מחירים: <span className="font-medium text-foreground">{formatILS(priceMin)}</span> – <span className="font-medium text-foreground">{formatILS(priceMax)}</span>
              </p>
            )}
            {typeof pricePerSqm === 'number' && typeof totalUnits === 'number' && (
              <p>
                מחיר ממוצע למ"ר: <span className="font-medium text-foreground">{formatILS(pricePerSqm)}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">לוח זמנים</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="תחילת בנייה"
            htmlFor="construction_start_date"
            error={errors.construction_start_date?.message}
          >
            <Input
              id="construction_start_date"
              type="date"
              {...register('construction_start_date')}
            />
          </FormField>

          <FormField
            label="סיום צפוי"
            htmlFor="expected_completion_date"
            error={errors.expected_completion_date?.message}
          >
            <Input
              id="expected_completion_date"
              type="date"
              {...register('expected_completion_date')}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}
