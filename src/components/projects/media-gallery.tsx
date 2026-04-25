'use client';

import * as React from 'react';
import Image from 'next/image';
import { FileText, Film, ImageIcon, Trash2 } from 'lucide-react';
import { deleteMediaAction } from '@/app/actions/projects';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  media_type: string;
  public_url: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
}

interface Props {
  projectId: string;
  initialMedia: MediaItem[];
  onDelete?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  image: 'תמונה',
  rendering: 'הדמיה',
  floor_plan: 'תכנית דירה',
  site_plan: 'תכנית אתר',
  document: 'מסמך',
  video: 'וידאו',
};

export function MediaGallery({ projectId, initialMedia, onDelete }: Props) {
  const [media, setMedia] = React.useState(initialMedia);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = async (item: MediaItem) => {
    if (!confirm('למחוק את הקובץ?')) return;

    setDeletingId(item.id);
    const result = await deleteMediaAction(item.id);
    setDeletingId(null);

    if (!result.ok) {
      alert(`שגיאה במחיקה: ${result.error}`);
      return;
    }

    setMedia((prev) => prev.filter((m) => m.id !== item.id));
    onDelete?.();
  };

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed rounded-xl">
        <ImageIcon className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">עדיין לא הועלו קבצים</p>
        <p className="text-xs mt-1">העלה תמונות, הדמיות או תכניות דירה למעלה</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {media.map((item) => {
        const isImage = item.mime_type?.startsWith('image/');
        const Icon = item.mime_type?.startsWith('video/') ? Film : FileText;

        return (
          <div
            key={item.id}
            className="group relative aspect-square rounded-lg border bg-card overflow-hidden"
          >
            {isImage && item.public_url ? (
              <Image
                src={item.public_url}
                alt={item.file_name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/40">
                <Icon className="h-8 w-8 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground px-2 truncate max-w-full">
                  {item.file_name}
                </span>
              </div>
            )}

            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
                'opacity-0 group-hover:opacity-100 transition-opacity'
              )}
            >
              <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
                <span className="inline-flex items-center rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                  {TYPE_LABELS[item.media_type] ?? item.media_type}
                </span>
                <button
                  onClick={() => handleDelete(item)}
                  className="rounded-md bg-black/70 p-1.5 text-white backdrop-blur hover:bg-[hsl(var(--destructive))]"
                  aria-label="מחק"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
