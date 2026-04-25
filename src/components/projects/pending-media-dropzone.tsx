'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ImageIcon, FileText, Film, Star, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_FILE_SIZE_BYTES,
  type MediaType,
} from '@/types/domain';

export interface PendingMediaFile {
  id: string;
  file: File;
  preview: string | null;
  mediaType: MediaType;
  isCover: boolean;
  error?: string;
}

interface Props {
  files: PendingMediaFile[];
  onChange: (files: PendingMediaFile[]) => void;
  maxFiles?: number;
}

const ALL_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, ...ALLOWED_VIDEO_TYPES];

function inferMediaType(file: File): MediaType {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf') {
    if (/floor|plan|תכנית|תוכנית|דירה/i.test(file.name)) return 'floor_plan';
    return 'document';
  }
  if (/render|הדמיה/i.test(file.name)) return 'rendering';
  return 'image';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PendingMediaDropzone({ files, onChange, maxFiles = 20 }: Props) {
  const onDrop = React.useCallback(
    (accepted: File[], rejected: any[]) => {
      const remaining = maxFiles - files.length;
      const toAdd = accepted.slice(0, remaining);

      const newFiles: PendingMediaFile[] = toAdd.map((file, i) => ({
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        mediaType: inferMediaType(file),
        // Make first uploaded image the cover
        isCover: files.length === 0 && i === 0,
      }));

      const rejectedFiles: PendingMediaFile[] = rejected.map((rej: any) => ({
        id: crypto.randomUUID(),
        file: rej.file,
        preview: null,
        mediaType: 'image',
        isCover: false,
        error: rej.errors?.[0]?.code === 'file-too-large'
          ? 'קובץ גדול מ-50MB'
          : rej.errors?.[0]?.code === 'file-invalid-type'
            ? 'סוג קובץ לא נתמך'
            : 'קובץ לא תקין',
      }));

      onChange([...files, ...newFiles, ...rejectedFiles]);
    },
    [files, onChange, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ALL_TYPES.reduce<Record<string, string[]>>((acc, t) => ({ ...acc, [t]: [] }), {}),
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
    disabled: files.length >= maxFiles,
  });

  const removeFile = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    const remaining = files.filter((f) => f.id !== id);

    // If we removed the cover, make the first image the new cover
    if (target?.isCover && remaining.length > 0) {
      const firstImage = remaining.find((f) => f.preview);
      if (firstImage) {
        onChange(remaining.map((f) => ({ ...f, isCover: f.id === firstImage.id })));
        return;
      }
    }
    onChange(remaining);
  };

  const setCover = (id: string) => {
    onChange(files.map((f) => ({ ...f, isCover: f.id === id })));
  };

  // ---------- Drag & drop reorder ----------
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 6px distance before drag starts - prevents accidental drags on click
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder only among valid files - preserve errorFiles at end
    const oldIndex = validFiles.findIndex((f) => f.id === active.id);
    const newIndex = validFiles.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedValid = arrayMove(validFiles, oldIndex, newIndex);
    onChange([...reorderedValid, ...errorFiles]);
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validFiles = files.filter((f) => !f.error);
  const errorFiles = files.filter((f) => f.error);

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all',
          isDragActive && !isDragReject && 'border-primary bg-[hsl(var(--primary-50))]',
          isDragReject && 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))]',
          !isDragActive && files.length < maxFiles && 'border-border hover:border-primary/50 hover:bg-accent/30 cursor-pointer',
          files.length >= maxFiles && 'border-border bg-muted/30 cursor-not-allowed opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            'mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            isDragActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-600))]'
          )}
        >
          <Upload className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium mb-0.5">
          {files.length >= maxFiles
            ? `הגעת למקסימום ${maxFiles} קבצים`
            : isDragActive
              ? 'שחרר את הקבצים כאן'
              : 'גרור קבצים לכאן, או לחץ לבחירה'}
        </p>
        <p className="text-xs text-muted-foreground">
          תמונות, הדמיות ומסמכים · עד 50MB לקובץ
        </p>
      </div>

      {/* Valid files grid */}
      {validFiles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              {validFiles.length} קבצים מוכנים להעלאה
            </p>
            <p className="text-xs text-muted-foreground">
              גרור לשינוי סדר · ⭐ לקביעת תמונה ראשית
            </p>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={validFiles.map((f) => f.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {validFiles.map((f) => (
                  <SortableTile
                    key={f.id}
                    file={f}
                    onRemove={() => removeFile(f.id)}
                    onSetCover={() => setCover(f.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Error files */}
      {errorFiles.length > 0 && (
        <div className="space-y-1.5">
          {errorFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[hsl(var(--destructive))]">{f.file.name}</p>
                <p className="text-[hsl(var(--destructive))] opacity-80">{f.error}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="shrink-0 rounded p-1 hover:bg-background/50"
                aria-label="הסר"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableTile — individual file tile with drag-handle support
// ---------------------------------------------------------------------------

interface SortableTileProps {
  file: PendingMediaFile;
  onRemove: () => void;
  onSetCover: () => void;
}

function SortableTile({ file: f, onRemove, onSetCover }: SortableTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: f.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const Icon = f.file.type.startsWith('video/')
    ? Film
    : f.file.type.startsWith('image/')
      ? ImageIcon
      : FileText;
  const isImage = f.preview !== null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative aspect-square rounded-lg border bg-card overflow-hidden transition-shadow',
        f.isCover && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
        isDragging && 'shadow-2xl ring-2 ring-primary/50'
      )}
    >
      {isImage ? (
        <img src={f.preview!} alt={f.file.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/40 p-2">
          <Icon className="h-6 w-6 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground text-center line-clamp-2">
            {f.file.name}
          </span>
        </div>
      )}

      {/* Cover badge */}
      {f.isCover && (
        <div className="absolute top-1 right-1 inline-flex items-center gap-0.5 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
          <Star className="h-2.5 w-2.5 fill-current" />
          ראשית
        </div>
      )}

      {/* Drag handle - visible on hover, top-right corner */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 rounded-md bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing backdrop-blur hover:bg-black/80"
        aria-label="גרור לשינוי סדר"
        title="גרור לשינוי סדר"
      >
        <GripVertical className="h-3 w-3" />
      </button>

      {/* Hover overlay for actions */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute bottom-1 left-1 flex gap-1 pointer-events-auto">
          {isImage && !f.isCover && (
            <button
              type="button"
              onClick={onSetCover}
              className="rounded-md bg-black/60 p-1 text-white backdrop-blur hover:bg-primary"
              title="הפוך לתמונה ראשית"
              aria-label="הפוך לתמונה ראשית"
            >
              <Star className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md bg-black/60 p-1 text-white backdrop-blur hover:bg-[hsl(var(--destructive))]"
            title="הסר"
            aria-label="הסר"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="absolute bottom-0 right-0 left-0 p-1.5 text-[9px] text-white pointer-events-none">
          <p className="truncate font-medium">{f.file.name}</p>
          <p className="text-white/70">{formatSize(f.file.size)}</p>
        </div>
      </div>
    </div>
  );
}
