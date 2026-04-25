'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FullProjectForm } from '@/types/project-wizard-schema';

export function StepBasicsForm() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FullProjectForm>();

  const projectType = watch('project_type');
  const status = watch('status');

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h2 className="text-base font-medium mb-1">פרטי הפרויקט</h2>
        <p className="text-xs text-muted-foreground">
          המידע הבסיסי שיופיע בראש עמוד הפרויקט
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="שם הפרויקט"
          htmlFor="name"
          required
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <Input id="name" placeholder="מגדלי הכרמל" {...register('name')} />
        </FormField>

        <FormField
          label="מזהה URL"
          htmlFor="slug"
          required
          error={errors.slug?.message}
          hint="ייווצר אוטומטית משם הפרויקט · אפשר לערוך"
          className="sm:col-span-2"
        >
          <Input
            id="slug"
            placeholder="migdalei-hacarmel"
            {...register('slug')}
            dir="ltr"
            className="text-left font-mono text-xs"
          />
        </FormField>

        <FormField label="סוג פרויקט" htmlFor="project_type">
          <Select
            value={projectType}
            onValueChange={(v) => setValue('project_type', v as any)}
          >
            <SelectTrigger id="project_type">
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
        </FormField>

        <FormField label="סטטוס" htmlFor="status">
          <Select value={status} onValueChange={(v) => setValue('status', v as any)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">תכנון</SelectItem>
              <SelectItem value="pre_sale">טרום-מכירה</SelectItem>
              <SelectItem value="under_construction">בבנייה</SelectItem>
              <SelectItem value="completed">הושלם</SelectItem>
              <SelectItem value="sold_out">אוזל</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label='שם היזם'
          htmlFor="developer_name"
          error={errors.developer_name?.message}
        >
          <Input
            id="developer_name"
            placeholder='אזורים בע"מ'
            {...register('developer_name')}
          />
        </FormField>

        <FormField
          label="פרטי יצירת קשר"
          htmlFor="developer_contact"
          error={errors.developer_contact?.message}
          hint="טלפון או אימייל של איש קשר"
        >
          <Input
            id="developer_contact"
            placeholder="03-1234567 או sales@azurim.co.il"
            {...register('developer_contact')}
          />
        </FormField>

        <FormField
          label="תיאור"
          htmlFor="description"
          error={errors.description?.message}
          hint="תיאור קצר שיופיע בעמוד הפרויקט"
          className="sm:col-span-2"
        >
          <Textarea
            id="description"
            rows={4}
            placeholder="פרויקט יוקרה במרכז תל אביב עם 48 יחידות..."
            {...register('description')}
          />
        </FormField>
      </div>
    </div>
  );
}
