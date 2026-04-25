'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle2, AlertCircle, ImageIcon, FileText, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_FILE_SIZE_BYTES,
  type MediaType,
} from '@/types/domain';

interface UploadFile {
  id: string;
  file: File;
  preview: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  mediaType: MediaType;
}

interface MediaUploaderProps {
  projectId: string;
  onUploadComplete?: () => void;
}

const ALL_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, ...ALLOWED_VIDEO_TYPES];

function inferMediaType(file: File): MediaType {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf') {
    if (/floor|plan|תוכנית|תכנית/i.test(file.name)) return 'floor_plan';
    return 'document';
  }
  if (/render|הדמיה/i.test(file.name)) return 'rendering';
  return 'image';
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return ImageIcon;
  if (file.type.startsWith('video/')) return Film;
  return FileText;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUploader({ projectId, onUploadComplete }: MediaUploaderProps) {
  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const supabase = React.useMemo(() => createClient(), []);

  const onDrop = React.useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending',
      progress: 0,
      mediaType: inferMediaType(file),
    }));

    const rejectedAsFiles: UploadFile[] = rejectedFiles.map((rej: any) => ({
      id: crypto.randomUUID(),
      file: rej.file,
      preview: null,
      status: 'error',
      progress: 0,
      error: rej.errors?.[0]?.message ?? 'קובץ לא תקין',
      mediaType: 'image',
    }));

    setFiles((prev) => [...prev, ...newFiles, ...rejectedAsFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ALL_TYPES.reduce<Record<string, string[]>>((acc, t) => ({ ...acc, [t]: [] }), {}),
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
  });

  const uploadFile = React.useCallback(
    async (uploadFile: UploadFile) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))
      );

      try {
        const ext = uploadFile.file.name.split('.').pop() ?? 'bin';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const storagePath = `${projectId}/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-media')
          .upload(storagePath, uploadFile.file, {
            cacheControl: '3600',
            upsert: false,
            contentType: uploadFile.file.type,
          });

        if (uploadError) throw uploadError;

        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 70 } : f))
        );

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-media').getPublicUrl(storagePath);

        const { error: dbError } = await supabase.from('project_media').insert({
          project_id: projectId,
          media_type: uploadFile.mediaType,
          storage_path: storagePath,
          public_url: publicUrl,
          file_name: uploadFile.file.name,
          file_size_bytes: uploadFile.file.size,
          mime_type: uploadFile.file.type,
        });

        if (dbError) throw dbError;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
          )
        );
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: error.message || 'שגיאה בהעלאה' }
              : f
          )
        );
      }
    },
    [projectId, supabase]
  );

  // Auto-upload pending files
  React.useEffect(() => {
    const pending = files.filter((f) => f.status === 'pending');
    pending.forEach((f) => uploadFile(f));
  }, [files, uploadFile]);

  // Notify on successful uploads
  React.useEffect(() => {
    const allDone =
      files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error');
    if (allDone && onUploadComplete) {
      onUploadComplete();
    }
  }, [files, onUploadComplete]);

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all cursor-pointer',
          isDragActive && !isDragReject && 'border-primary bg-[hsl(var(--primary-50))]',
          isDragReject && 'border-destructive bg-[hsl(var(--destructive-bg))]',
          !isDragActive && 'border-border hover:border-primary/50 hover:bg-accent/30'
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full',
            isDragActive ? 'bg-primary text-primary-foreground' : 'bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-600))]'
          )}
        >
          <Upload className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium mb-1">
          {isDragActive
            ? 'שחרר את הקבצים כאן'
            : 'גרור קבצים לכאן, או לחץ לבחירה'}
        </p>
        <p className="text-xs text-muted-foreground">
          תמונות, הדמיות, תכניות דיור · עד 50MB לקובץ
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          {['JPG', 'PNG', 'WebP', 'PDF', 'MP4'].map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => {
            const Icon = getFileIcon(f.file);
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {f.preview ? (
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatSize(f.file.size)}</span>
                    {f.status === 'uploading' && <span>· מעלה... {f.progress}%</span>}
                    {f.status === 'error' && (
                      <span className="text-[hsl(var(--destructive))]">· {f.error}</span>
                    )}
                  </div>
                  {f.status === 'uploading' && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {f.status === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  )}
                  {f.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  )}
                  {(f.status === 'pending' || f.status === 'error') && (
                    <button
                      onClick={() => removeFile(f.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      aria-label="הסר"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
