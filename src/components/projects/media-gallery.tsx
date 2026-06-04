'use client';

import * as React from 'react';
import Image from 'next/image';
import { FileText, Film, ImageIcon, Trash2, Download, Share2, X, MessageCircle, Mail, Link as LinkIcon, Check } from 'lucide-react';
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
  onClose?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  image: 'תמונה',
  rendering: 'הדמיה',
  floor_plan: 'תכנית דירה',
  site_plan: 'תכנית אתר',
  document: 'מסמך',
  video: 'וידאו',
};

export function MediaGallery({ projectId, initialMedia, onDelete, onClose }: Props) {
  const [media, setMedia] = React.useState(initialMedia);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [previewItem, setPreviewItem] = React.useState<MediaItem | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleDelete = async (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDownload = async (item: MediaItem) => {
    if (!item.public_url) return;
    try {
      const response = await fetch(item.public_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(item.public_url, '_blank');
    }
  };

  const handleShareWhatsApp = (item: MediaItem) => {
    if (!item.public_url) return;
    const text = `${item.file_name}\n${item.public_url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = (item: MediaItem) => {
    if (!item.public_url) return;
    const subject = encodeURIComponent(item.file_name);
    const body = encodeURIComponent(`${item.file_name}\n\n${item.public_url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyLink = async (item: MediaItem) => {
    if (!item.public_url) return;
    try {
      await navigator.clipboard.writeText(item.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('לא הצלחנו להעתיק את הלינק');
    }
  };

  const closePreview = () => {
    setPreviewItem(null);
    setShareOpen(false);
    setCopied(false);
    onClose?.();
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
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {media.map((item) => {
          const isImage = item.mime_type?.startsWith('image/');
          const Icon = item.mime_type?.startsWith('video/') ? Film : FileText;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setPreviewItem(item)}
              className="group relative aspect-square rounded-lg border bg-card overflow-hidden text-right cursor-pointer hover:ring-2 hover:ring-primary transition-all"
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
                    type="button"
                    onClick={(e) => handleDelete(item, e)}
                    disabled={deletingId === item.id}
                    className="rounded-md bg-black/70 p-1.5 text-white backdrop-blur hover:bg-[hsl(var(--destructive))] disabled:opacity-50"
                    aria-label="מחק"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col"
          onClick={closePreview}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 bg-background border-b"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePreview}
              className="rounded-md p-2 hover:bg-muted"
              aria-label="סגור"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex-1 mx-4 text-center">
              <p className="text-sm font-medium truncate">{previewItem.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {TYPE_LABELS[previewItem.media_type] ?? previewItem.media_type}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(previewItem)}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm bg-muted hover:bg-muted/80"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">הורדה</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShareOpen(!shareOpen)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">שיתוף</span>
                </button>

                {shareOpen && (
                  <div className="absolute top-full mt-2 left-0 w-48 bg-popover border rounded-lg shadow-lg overflow-hidden z-10">
                    <button
                      type="button"
                      onClick={() => {
                        handleShareWhatsApp(previewItem);
                        setShareOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted text-right"
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleShareEmail(previewItem);
                        setShareOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted text-right"
                    >
                      <Mail className="h-4 w-4 text-blue-600" />
                      מייל
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(previewItem)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted text-right"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          הועתק!
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4" />
                          העתק לינק
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {previewItem.public_url && (
              <>
                {previewItem.mime_type?.startsWith('image/') ? (
                  <img
                    src={previewItem.public_url}
                    alt={previewItem.file_name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                ) : previewItem.mime_type === 'application/pdf' ? (
                  <iframe
                    src={previewItem.public_url}
                    title={previewItem.file_name}
                    className="w-full h-full min-h-[80vh] rounded-lg bg-white"
                  />
                ) : previewItem.mime_type?.startsWith('video/') ? (
                  <video
                    src={previewItem.public_url}
                    controls
                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                  >
                    הדפדפן לא תומך בנגן וידאו
                  </video>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-white">
                    <FileText className="h-24 w-24 opacity-40" />
                    <p className="text-lg">לא ניתן להציג תצוגה מקדימה לקובץ זה</p>
                    <button
                      type="button"
                      onClick={() => handleDownload(previewItem)}
                      className="inline-flex items-center gap-2 rounded-md px-4 py-2 bg-primary text-primary-foreground hover:opacity-90"
                    >
                      <Download className="h-4 w-4" />
                      הורדה
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
