'use client';

import * as React from 'react';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  File,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
} from '@/app/actions/documents';
import {
  formatFileSize,
  getFileTypeLabel,
  type OfficeDocument,
} from '@/app/actions/documents-types';

interface Props {
  initialDocuments: OfficeDocument[];
}

type FeedbackMessage = {
  type: 'success' | 'error';
  text: string;
};

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileText;
  return File;
}

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'הרגע';
  if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  return date.toLocaleDateString('he-IL', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DocumentsClient({ initialDocuments }: Props) {
  const [documents, setDocuments] = React.useState<OfficeDocument[]>(initialDocuments);
  const [isUploading, setIsUploading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<FeedbackMessage | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-dismiss feedback after 4 seconds
  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  async function handleUpload(file: File) {
    setIsUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadDocument(formData);

    if (result.success && result.document) {
      setDocuments((prev) => [result.document!, ...prev]);
      setFeedback({ type: 'success', text: `המסמך "${file.name}" הועלה בהצלחה` });
    } else {
      setFeedback({ type: 'error', text: result.error || 'שגיאה בהעלאה' });
    }

    setIsUploading(false);

    // Reset the file input so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }

  async function handleDownload(doc: OfficeDocument) {
    const url = await getDocumentDownloadUrl(doc.file_path);
    if (url) {
      // Open in new tab to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setFeedback({ type: 'error', text: 'שגיאה ביצירת קישור להורדה' });
    }
  }

  async function handleDelete(doc: OfficeDocument) {
    const confirmed = confirm(`האם למחוק את "${doc.name}"? פעולה זו אינה הפיכה.`);
    if (!confirmed) return;

    const result = await deleteDocument(doc.id);

    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setFeedback({ type: 'success', text: `המסמך "${doc.name}" נמחק` });
    } else {
      setFeedback({ type: 'error', text: result.error || 'שגיאה במחיקה' });
    }
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title="מסמכי משרד" description="ניהול מסמכים כלליים של המשרד - תבניות, חוזים, נהלים ועוד">
        <Button
          onClick={() => fileInputRef.current?.click()}
          size="lg"
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? 'מעלה...' : 'העלאת מסמך'}
        </Button>
      </PageHeader>

      {/* Hidden file input for upload button */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Feedback message */}
      {feedback && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
            feedback.type === 'success'
              ? 'bg-[hsl(var(--success-50))] border-[hsl(var(--success-200))]'
              : 'bg-[hsl(var(--destructive)/0.1)] border-[hsl(var(--destructive)/0.3)]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--success-600))] mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))] mt-0.5" />
          )}
          <p className={feedback.type === 'success' ? 'text-[hsl(var(--success-700))]' : 'text-[hsl(var(--destructive))]'}>
            {feedback.text}
          </p>
        </div>
      )}

      {/* Drag and drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-6 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-[hsl(var(--primary-50))]'
            : 'border-border bg-muted/30'
        }`}
      >
        <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium mb-1">
          {isDragging ? 'שחרר כאן את הקובץ' : 'גרור ושחרר קובץ לכאן'}
        </p>
        <p className="text-xs text-muted-foreground">
          או לחץ על הכפתור למעלה לבחירת קובץ
        </p>
      </div>

      {/* Documents list */}
      {documents.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h2 className="text-sm font-medium">
                כל המסמכים ({documents.length})
              </h2>
            </div>

            <div className="divide-y">
              {documents.map((doc) => {
                const Icon = getFileIcon(doc.mime_type);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary-50))]">
                      <Icon className="h-5 w-5 text-[hsl(var(--primary-600))]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getFileTypeLabel(doc.mime_type)} · {formatFileSize(doc.file_size)} ·{' '}
                        {doc.uploaded_by_name || 'משתמש'} · {formatRelativeDate(doc.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        title="הורדה"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        title="מחיקה"
                        className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary-50))]">
              <FileText className="h-6 w-6 text-[hsl(var(--primary-600))]" />
            </div>
            <h3 className="text-base font-medium mb-1.5">עוד אין מסמכים במערכת</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              העלה את המסמך הראשון - חוזה, תבנית, נוהל או כל קובץ אחר שצריך לשמור.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="lg"
              disabled={isUploading}
            >
              <Upload className="h-4 w-4" />
              העלאת מסמך ראשון
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
