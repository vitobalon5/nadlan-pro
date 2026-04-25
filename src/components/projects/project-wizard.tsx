'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  MapPin,
  DollarSign,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { createClient } from '@/lib/supabase/client';
import { createProjectAction, createMediaRecordAction } from '@/app/actions/projects';
import {
  stepBasicsSchema,
  stepLocationSchema,
  stepPricingSchema,
  fullProjectSchema,
  type FullProjectForm,
} from '@/types/project-wizard-schema';
import { slugify } from '@/lib/utils';
import { StepBasicsForm } from './wizard-steps/step-basics';
import { StepLocationForm } from './wizard-steps/step-location';
import { StepPricingForm } from './wizard-steps/step-pricing';
import { StepMediaForm } from './wizard-steps/step-media';
import type { PendingMediaFile } from './pending-media-dropzone';

const STEPS = [
  { id: 'basics', label: 'פרטי הפרויקט', description: 'שם, סוג וסטטוס', icon: Building2 },
  { id: 'location', label: 'מיקום', description: 'כתובת וקואורדינטות', icon: MapPin },
  { id: 'pricing', label: 'תמחור ולו"ז', description: 'מחירים ותאריכים', icon: DollarSign },
  { id: 'media', label: 'מדיה', description: 'תמונות והדמיות', icon: ImageIcon },
];

const STEP_SCHEMAS = [stepBasicsSchema, stepLocationSchema, stepPricingSchema, null];

const STEP_FIELDS: Array<Array<keyof FullProjectForm>> = [
  ['name', 'slug', 'description', 'project_type', 'status', 'developer_name', 'developer_contact'],
  ['city', 'neighborhood', 'address', 'gush', 'helka', 'latitude', 'longitude'],
  ['total_units', 'floors', 'price_min', 'price_max', 'price_per_sqm_avg', 'construction_start_date', 'expected_completion_date'],
  [],
];

type SubmitStatus =
  | { state: 'idle' }
  | { state: 'creating' }
  | { state: 'uploading'; current: number; total: number; currentFileName: string }
  | { state: 'success'; slug: string }
  | { state: 'error'; message: string };

export function ProjectWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);
  const [mediaFiles, setMediaFiles] = React.useState<PendingMediaFile[]>([]);
  const [submitStatus, setSubmitStatus] = React.useState<SubmitStatus>({ state: 'idle' });

  const methods = useForm<FullProjectForm>({
    resolver: zodResolver(fullProjectSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      project_type: 'residential',
      status: 'planning',
      developer_name: '',
      developer_contact: '',
      city: '',
      neighborhood: '',
      address: '',
      gush: '',
      helka: '',
      latitude: '',
      longitude: '',
      total_units: '',
      floors: '',
      price_min: '',
      price_max: '',
      price_per_sqm_avg: '',
      construction_start_date: '',
      expected_completion_date: '',
    },
  });

  const { handleSubmit, trigger, watch, setValue, formState } = methods;

  // Auto-generate slug from name on first step
  const nameValue = watch('name');
  const slugValue = watch('slug');
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);

  React.useEffect(() => {
    if (!slugManuallyEdited && nameValue) {
      setValue('slug', slugify(nameValue));
    }
  }, [nameValue, slugManuallyEdited, setValue]);

  // Track if user manually edited slug
  React.useEffect(() => {
    if (slugValue && nameValue && slugValue !== slugify(nameValue)) {
      setSlugManuallyEdited(true);
    }
  }, [slugValue, nameValue]);

  const goToStep = async (targetIndex: number) => {
    if (targetIndex < currentStep) {
      // Going backwards - always allowed
      setCurrentStep(targetIndex);
      return;
    }

    // Going forwards - validate current step
    const fieldsToValidate = STEP_FIELDS[currentStep];
    const isValid = await trigger(fieldsToValidate);

    if (!isValid) return;

    // Extra step-level validation (for cross-field rules)
    const schema = STEP_SCHEMAS[currentStep];
    if (schema) {
      const values = methods.getValues();
      const subset = Object.fromEntries(
        fieldsToValidate.map((key) => [key, values[key]])
      );
      const result = schema.safeParse(subset);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          methods.setError(issue.path[0] as any, { message: issue.message });
        });
        return;
      }
    }

    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }
    setCurrentStep(targetIndex);
  };

  const onNext = () => goToStep(currentStep + 1);
  const onPrev = () => goToStep(currentStep - 1);

  const onFinalSubmit = async (data: FullProjectForm) => {
    const supabase = createClient();

    try {
      setSubmitStatus({ state: 'creating' });

      // 1. Create project via Server Action (includes auth + role check)
      const createResult = await createProjectAction(data);
      if (!createResult.ok) {
        setSubmitStatus({ state: 'error', message: createResult.error });
        return;
      }
      const project = createResult.data;

      // 2. Upload media files sequentially.
      // Storage upload stays client-side (direct-to-S3 style) - faster than
      // routing bytes through our server. But the DB record is created via
      // Server Action (with sanitization).
      const validMedia = mediaFiles.filter((f) => !f.error);
      if (validMedia.length > 0) {
        for (let i = 0; i < validMedia.length; i++) {
          const mf = validMedia[i];
          setSubmitStatus({
            state: 'uploading',
            current: i + 1,
            total: validMedia.length,
            currentFileName: mf.file.name,
          });

          // Generate strictly unique path with project_id + uuid (collision-safe)
          const ext = (mf.file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
          const uuid = crypto.randomUUID();
          const storagePath = `${project.id}/${uuid}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('project-media')
            .upload(storagePath, mf.file, {
              cacheControl: '3600',
              upsert: false,
              contentType: mf.file.type,
            });

          if (uploadError) {
            console.error(`Failed to upload ${mf.file.name}:`, uploadError);
            continue; // skip this file, don't abort the whole submission
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('project-media').getPublicUrl(storagePath);

          // Create DB record via Server Action (sanitizes file_name, validates, handles cover logic)
          const mediaResult = await createMediaRecordAction({
            project_id: project.id,
            media_type: mf.mediaType,
            storage_path: storagePath,
            public_url: publicUrl,
            file_name: mf.file.name,
            file_size_bytes: mf.file.size,
            mime_type: mf.file.type,
            display_order: i,
            is_cover: mf.isCover,
          });

          if (!mediaResult.ok) {
            // Storage succeeded but DB failed - clean up storage to avoid orphan
            await supabase.storage.from('project-media').remove([storagePath]);
            console.error(`Failed to create media record for ${mf.file.name}:`, mediaResult.error);
          }
        }
      }

      setSubmitStatus({ state: 'success', slug: project.slug });

      setTimeout(() => {
        router.push(`/projects/${project.slug}`);
        router.refresh();
      }, 1200);
    } catch (error: any) {
      setSubmitStatus({
        state: 'error',
        message: error.message || 'שגיאה לא ידועה ביצירת הפרויקט',
      });
    }
  };

  // Success overlay
  if (submitStatus.state === 'success') {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--success-bg))]">
            <CheckCircle2 className="h-7 w-7 text-[hsl(var(--success))]" strokeWidth={2.5} />
          </div>
          <h3 className="text-lg font-semibold mb-1">הפרויקט נוצר בהצלחה!</h3>
          <p className="text-sm text-muted-foreground">מעביר אותך לעמוד הפרויקט...</p>
        </CardContent>
      </Card>
    );
  }

  const isSubmitting = submitStatus.state === 'creating' || submitStatus.state === 'uploading';

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onFinalSubmit)}>
        <Card>
          <CardContent className="pt-6">
            <Stepper
              steps={STEPS.map(({ id, label, description }) => ({ id, label, description }))}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={goToStep}
            />

            {submitStatus.state === 'error' && (
              <div className="mb-6 flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] px-3 py-2.5 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))] mt-0.5" />
                <div>
                  <p className="font-medium text-[hsl(var(--destructive))]">שגיאה ביצירת הפרויקט</p>
                  <p className="text-xs mt-0.5 text-[hsl(var(--destructive))] opacity-90">
                    {submitStatus.message}
                  </p>
                </div>
              </div>
            )}

            {submitStatus.state === 'uploading' && (
              <div className="mb-6 rounded-lg border bg-[hsl(var(--info-bg))] px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--info))]" />
                  <p className="font-medium text-[hsl(var(--info-foreground))]">
                    מעלה מדיה ({submitStatus.current}/{submitStatus.total})
                  </p>
                </div>
                <p className="text-xs text-[hsl(var(--info-foreground))] opacity-80 truncate">
                  {submitStatus.currentFileName}
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/50">
                  <div
                    className="h-full bg-[hsl(var(--info))] transition-all duration-300"
                    style={{
                      width: `${(submitStatus.current / submitStatus.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="min-h-[360px]">
              {currentStep === 0 && <StepBasicsForm />}
              {currentStep === 1 && <StepLocationForm />}
              {currentStep === 2 && <StepPricingForm />}
              {currentStep === 3 && (
                <StepMediaForm files={mediaFiles} onFilesChange={setMediaFiles} />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onPrev}
                disabled={currentStep === 0 || isSubmitting}
              >
                <ChevronRight className="h-4 w-4" />
                חזור
              </Button>

              <div className="text-xs text-muted-foreground">
                שלב {currentStep + 1} מתוך {STEPS.length}
              </div>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={onNext} disabled={isSubmitting}>
                  המשך
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {submitStatus.state === 'creating' ? 'יוצר פרויקט...' : 'מעלה קבצים...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      צור פרויקט
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form state debug (dev only - remove in production) */}
        {process.env.NODE_ENV === 'development' && formState.errors && Object.keys(formState.errors).length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {Object.keys(formState.errors).length} שגיאות בטופס
          </div>
        )}
      </form>
    </FormProvider>
  );
}
