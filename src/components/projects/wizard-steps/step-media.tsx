'use client';

import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';
import { PendingMediaDropzone, type PendingMediaFile } from '../pending-media-dropzone';
import type { FullProjectForm } from '@/types/project-wizard-schema';

interface Props {
  files: PendingMediaFile[];
  onFilesChange: (files: PendingMediaFile[]) => void;
}

export function StepMediaForm({ files, onFilesChange }: Props) {
  const { getValues } = useFormContext<FullProjectForm>();

  // Summary of filled fields so user sees what they're about to submit
  const values = getValues();
  const summaryItems = [
    { label: 'שם', value: values.name },
    { label: 'עיר', value: values.city },
    { label: 'יזם', value: values.developer_name },
    { label: 'יחידות', value: values.total_units && `${values.total_units} יחידות` },
  ].filter((item) => item.value);

  const validCount = files.filter((f) => !f.error).length;

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h2 className="text-base font-medium mb-1">מדיה ותמונות</h2>
        <p className="text-xs text-muted-foreground">
          העלה תמונות, הדמיות ותכניות דירה · הקבצים יועלו לאחר שליחת הטופס
        </p>
      </div>

      <PendingMediaDropzone files={files} onChange={onFilesChange} />

      {/* Final summary before submit */}
      <div className="rounded-lg border bg-[hsl(var(--primary-50))] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-[hsl(var(--primary-600))]" />
          <p className="text-xs font-medium text-[hsl(var(--primary-900))]">
            סיכום לפני יצירה
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {summaryItems.map((item) => (
            <div key={item.label} className="text-[hsl(var(--primary-900))]">
              <span className="opacity-70">{item.label}:</span>{' '}
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
          <div className="text-[hsl(var(--primary-900))]">
            <span className="opacity-70">קבצים:</span>{' '}
            <span className="font-medium">
              {validCount === 0 ? 'ללא' : `${validCount} קבצים`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
