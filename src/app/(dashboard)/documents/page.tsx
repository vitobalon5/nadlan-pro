import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDocuments } from '@/app/actions/documents';
import { DocumentsClient } from './documents-client';

export const metadata = {
  title: 'מסמכי משרד | נדלן פרו',
};

export default async function DocumentsPage() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Load all documents
  const documents = await getDocuments();

  return <DocumentsClient initialDocuments={documents} />;
}

