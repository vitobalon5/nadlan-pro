/**
 * Types for Office Documents feature
 * Used by both server actions and client components
 */

export interface OfficeDocument {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentResult {
  success: boolean;
  document?: OfficeDocument;
  error?: string;
}

export interface DeleteDocumentResult {
  success: boolean;
  error?: string;
}

/**
 * Format file size in human-readable form (KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get a friendly Hebrew label for a file type based on MIME type
 */
export function getFileTypeLabel(mimeType: string | null): string {
  if (!mimeType) return 'קובץ';

  if (mimeType.startsWith('image/')) return 'תמונה';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('video/')) return 'וידאו';
  if (mimeType.startsWith('audio/')) return 'אודיו';
  if (
    mimeType.includes('word') ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'Word';
  }
  if (
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'Excel';
  }
  if (
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation')
  ) {
    return 'PowerPoint';
  }
  if (mimeType.startsWith('text/')) return 'טקסט';

  return 'קובץ';
}
