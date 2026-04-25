'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createProjectAction } from '@/app/actions/projects';
import { createProjectSchema, type CreateProjectInput } from '@/types/domain';
import { fullProjectSchema } from '@/types/project-wizard-schema';
import { slugify } from '@/lib/utils';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      slug: '',
      city: '',
      project_type: 'residential',
      status: 'planning',
      tags: [],
    },
  });

  const name = watch('name');

  // Auto-generate slug from name
  React.useEffect(() => {
    if (name) setValue('slug', slugify(name));
  }, [name, setValue]);

  const onSubmit = async (data: CreateProjectInput) => {
    setSubmitError(null);

    // Pass through the full schema for Server Action (fills in empty optionals)
    const result = await createProjectAction({
      ...data,
      description: data.description ?? '',
      developer_name: data.developer_name ?? '',
      developer_contact: data.developer_contact ?? '',
      neighborhood: data.neighborhood ?? '',
      address: data.address ?? '',
      gush: data.gush ?? '',
      helka: data.helka ?? '',
      latitude: data.latitude ?? '',
      longitude: data.longitude ?? '',
      total_units: data.total_units ?? '',
      floors: '',
      price_min: data.price_min ?? '',
      price_max: data.price_max ?? '',
      price_per_sqm_avg: data.price_per_sqm_avg ?? '',
      construction_start_date: data.construction_start_date ?? '',
      expected_completion_date: data.expected_completion_date ?? '',
    } as any);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    reset();
    onOpenChange(false);
    router.push(`/projects/${result.data.slug}`);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>פרויקט חדש</DialogTitle>
          <DialogDescription>
            צור פרויקט חדש במערכת. תוכל להוסיף מדיה, יחידות דיור ופרטים נוספים אחר כך.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] px-3 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))] mt-0.5" />
              <span className="text-[hsl(var(--destructive))]">{submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">שם הפרויקט *</Label>
              <Input id="name" placeholder="מגדלי הכרמל" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-[hsl(var(--destructive))]">{errors.name.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="slug">מזהה URL (slug) *</Label>
              <Input
                id="slug"
                placeholder="migdalei-hacarmel"
                {...register('slug')}
                dir="ltr"
                className="text-left font-mono text-xs"
              />
              {errors.slug && (
                <p className="text-xs text-[hsl(var(--destructive))]">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">עיר *</Label>
              <Input id="city" placeholder="תל אביב" {...register('city')} />
              {errors.city && (
                <p className="text-xs text-[hsl(var(--destructive))]">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="neighborhood">שכונה</Label>
              <Input id="neighborhood" placeholder="נווה צדק" {...register('neighborhood')} />
            </div>

            <div className="space-y-1.5">
              <Label>סוג פרויקט</Label>
              <Select
                defaultValue="residential"
                onValueChange={(v) => setValue('project_type', v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">מגורים</SelectItem>
                  <SelectItem value="commercial">מסחרי</SelectItem>
                  <SelectItem value="mixed_use">מעורב</SelectItem>
                  <SelectItem value="office">משרדים</SelectItem>
                  <SelectItem value="retail">קמעונאי</SelectItem>
                  <SelectItem value="industrial">תעשייתי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>סטטוס</Label>
              <Select
                defaultValue="planning"
                onValueChange={(v) => setValue('status', v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">תכנון</SelectItem>
                  <SelectItem value="pre_sale">טרום-מכירה</SelectItem>
                  <SelectItem value="under_construction">בבנייה</SelectItem>
                  <SelectItem value="completed">הושלם</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="developer_name">יזם</Label>
              <Input id="developer_name" placeholder="אזורים בע&quot;מ" {...register('developer_name')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="total_units">מספר יחידות</Label>
              <Input
                id="total_units"
                type="number"
                min="1"
                placeholder="48"
                {...register('total_units', { valueAsNumber: true })}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="תיאור קצר של הפרויקט..."
                {...register('description')}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  יוצר...
                </>
              ) : (
                'צור פרויקט'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
