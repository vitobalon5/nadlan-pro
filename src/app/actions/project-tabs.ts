'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// קבלת כל הטאבים של פרויקט
export async function getProjectTabs(projectId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_tabs')
    .select('*')
    .eq('project_id', projectId)
    .order('position');
  if (error) return [];
  return data;
}

// יצירת טאב חדש
export async function createProjectTab(projectId: string, name: string) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('project_tabs')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;
  const { data, error } = await supabase
    .from('project_tabs')
    .insert({ project_id: projectId, name, position: nextPosition })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath(`/projects`);
  return { success: true, tab: data };
}

// מחיקת טאב
export async function deleteProjectTab(tabId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('project_tabs')
    .delete()
    .eq('id', tabId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// העלאת קובץ לטאב
export async function uploadTabFile(formData: FormData) {
  const supabase = createClient();
  const file = formData.get('file') as File;
  const tabId = formData.get('tabId') as string;
  const projectId = formData.get('projectId') as string;

  if (!file || !tabId || !projectId) return { success: false, error: 'חסרים פרטים' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'לא מחובר' };

  const ext = file.name.split('.').pop();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `${projectId}/${tabId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('project-tab-files')
    .upload(filePath, file);

  if (uploadError) return { success: false, error: uploadError.message };

  const { data, error: dbError } = await supabase
    .from('project_tab_files')
    .insert({
      tab_id: tabId,
      project_id: projectId,
      name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, file: data };
}

// קבלת קבצים של טאב
export async function getTabFiles(tabId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_tab_files')
    .select('*')
    .eq('tab_id', tabId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

// מחיקת קובץ מטאב
export async function deleteTabFile(fileId: string, filePath: string) {
  const supabase = createClient();
  await supabase.storage.from('project-tab-files').remove([filePath]);
  const { error } = await supabase
    .from('project_tab_files')
    .delete()
    .eq('id', fileId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// קבלת URL להורדה
export async function getTabFileDownloadUrl(filePath: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('project-tab-files')
    .createSignedUrl(filePath, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}
