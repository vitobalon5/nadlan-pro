'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  OfficeDocument,
  UploadDocumentResult,
  DeleteDocumentResult,
} from './documents-types';

const BUCKET_NAME = 'office-documents';

/**
 * Get all office documents, ordered by newest first
 */
export async function getDocuments(): Promise<OfficeDocument[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('office_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getDocuments] Error:', error);
    return [];
  }

  return (data || []) as OfficeDocument[];
}

/**
 * Upload a new document
 * Accepts a FormData object containing a 'file' field
 */
export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  try {
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return { success: false, error: 'לא נבחר קובץ' };
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'נדרשת התחברות' };
    }

    // Get user's display name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const uploaderName = profile?.full_name || user.email || 'משתמש';

    // Generate unique filename to prevent collisions
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_\u0590-\u05FF]/g, '_');
    const filePath = `${timestamp}-${randomStr}-${sanitizedName}`;

    // Upload file to Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploadDocument] Storage error:', uploadError);
      return { success: false, error: 'שגיאה בהעלאת הקובץ: ' + uploadError.message };
    }

    // Insert metadata into database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: docData, error: dbError } = await (supabase as any)
      .from('office_documents')
      .insert({
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: user.id,
        uploaded_by_name: uploaderName,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[uploadDocument] DB error:', dbError);
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      return { success: false, error: 'שגיאה בשמירת המידע: ' + dbError.message };
    }

    revalidatePath('/documents');

    return {
      success: true,
      document: docData as OfficeDocument,
    };
  } catch (err) {
    console.error('[uploadDocument] Unexpected error:', err);
    return { success: false, error: 'שגיאה לא צפויה בהעלאה' };
  }
}

/**
 * Delete a document (both file and database record)
 */
export async function deleteDocument(documentId: string): Promise<DeleteDocumentResult> {
  try {
    const supabase = await createClient();

    // First, get the file_path so we know what to delete from storage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: doc, error: fetchError } = await (supabase as any)
      .from('office_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: 'המסמך לא נמצא' };
    }

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([doc.file_path]);

    if (storageError) {
      console.error('[deleteDocument] Storage error:', storageError);
    }

    // Delete from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any)
      .from('office_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('[deleteDocument] DB error:', dbError);
      return { success: false, error: 'שגיאה במחיקת המסמך' };
    }

    revalidatePath('/documents');

    return { success: true };
  } catch (err) {
    console.error('[deleteDocument] Unexpected error:', err);
    return { success: false, error: 'שגיאה לא צפויה במחיקה' };
  }
}

/**
 * Get a signed download URL for a document
 * URL expires after 1 hour for security
 */
export async function getDocumentDownloadUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600);

  if (error || !data) {
    console.error('[getDocumentDownloadUrl] Error:', error);
    return null;
  }

  return data.signedUrl;
}
