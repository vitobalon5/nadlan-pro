'use client';

import { useFormContext } from 'react-hook-form';
import { MapPin, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import type { FullProjectForm } from '@/types/project-wizard-schema';

export function StepLocationForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FullProjectForm>();

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h2 className="text-base font-medium mb-1">מיקום</h2>
        <p className="text-xs text-muted-foreground">
          היכן נמצא הפרויקט גאוגרפית ורישומית
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="עיר"
          htmlFor="city"
          required
          error={errors.city?.message}
        >
          <Input id="city" placeholder="תל אביב" {...register('city')} />
        </FormField>

        <FormField
          label="שכונה"
          htmlFor="neighborhood"
          error={errors.neighborhood?.message}
        >
          <Input id="neighborhood" placeholder="נווה צדק" {...register('neighborhood')} />
        </FormField>

        <FormField
          label="כתובת מלאה"
          htmlFor="address"
          error={errors.address?.message}
          hint="רחוב ומספר - יופיע ליד שם הפרויקט"
          className="sm:col-span-2"
        >
          <Input
            id="address"
            placeholder="רחוב הכרמל 15"
            {...register('address')}
          />
        </FormField>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">מידע רישומי (אופציונלי)</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="גוש" htmlFor="gush" error={errors.gush?.message}>
            <Input id="gush" placeholder="6213" {...register('gush')} dir="ltr" className="text-left" />
          </FormField>

          <FormField label="חלקה" htmlFor="helka" error={errors.helka?.message}>
            <Input id="helka" placeholder="45" {...register('helka')} dir="ltr" className="text-left" />
          </FormField>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">קואורדינטות (אופציונלי)</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="קו רוחב"
            htmlFor="latitude"
            error={errors.latitude?.message as string | undefined}
            hint="בין -90 ל-90"
          >
            <Input
              id="latitude"
              type="number"
              step="0.0000001"
              placeholder="32.0668"
              {...register('latitude')}
              dir="ltr"
              className="text-left"
            />
          </FormField>

          <FormField
            label="קו אורך"
            htmlFor="longitude"
            error={errors.longitude?.message as string | undefined}
            hint="בין -180 ל-180"
          >
            <Input
              id="longitude"
              type="number"
              step="0.0000001"
              placeholder="34.7738"
              {...register('longitude')}
              dir="ltr"
              className="text-left"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}
