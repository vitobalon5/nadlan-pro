'use client';

import * as React from 'react';
import { Plus, Trash2, Upload, Download, File, FolderOpen, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  getProjectTabs,
  createProjectTab,
  deleteProjectTab,
  uploadTabFile,
  getTabFiles,
  deleteTabFile,
  getTabFileDownloadUrl,
} from '@/app/actions/project-tabs';

interface ProjectTab {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface TabFile {
  id: string;
  tab_id: string;
  project_id: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  created_at: string;
}

interface Props {
  projectId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CustomTabsManager({ projectId }: Props) {
  const [tabs, setTabs] = React.useState<ProjectTab[]>([]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<TabFile[]>([]);
  const [newTabName, setNewTabName] = React.useState('');
  const [isAddingTab, setIsAddingTab] = React.useState(false);
  const [isCreatingTab, setIsCreatingTab] = React.useState(false);
  const [tabError, setTabError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    getProjectTabs(projectId).then((data) => {
      const typedTabs = data as ProjectTab[];
      setTabs(typedTabs);
      if (typedTabs.length > 0) {
        setActiveTabId(typedTabs[0].id);
      }
    });
  }, [projectId]);

  React.useEffect(() => {
    if (!activeTabId) {
      setFiles([]);
      return;
    }
    setIsLoadingFiles(true);
    getTabFiles(activeTabId).then((data) => {
      setFiles(data as TabFile[]);
      setIsLoadingFiles(false);
    });
  }, [activeTabId]);

  const handleCreateTab = async () => {
    if (!newTabName.trim()) return;
    setIsCreatingTab(true);
    setTabError(null);
    try {
      const result = await createProjectTab(projectId, newTabName.trim());
      if (result.success) {
        if (result.tab) {
          const newTab = result.tab as ProjectTab;
          setTabs((prev) => [...prev, newTab]);
          setActiveTabId(newTab.id);
        }
        setNewTabName('');
        setIsAddingTab(false);
      } else {
        setTabError(result.error ?? 'שגיאה ביצירת הטאב');
      }
    } catch (err) {
      console.error('createProjectTab failed:', err);
      setTabError('שגיאה ביצירת הטאב');
    } finally {
      setIsCreatingTab(false);
    }
  };

  const handleDeleteTab = async (tabId: string) => {
    const result = await deleteProjectTab(tabId);
    if (result.success) {
      const remaining = tabs.filter((t) => t.id !== tabId);
      setTabs(remaining);
      if (activeTabId === tabId) {
        setActiveTabId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !activeTabId) return;
    setIsUploading(true);
    for (const file of Array.from(e.target.files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tabId', activeTabId);
      formData.append('projectId', projectId);
      const result = await uploadTabFile(formData);
      if (result.success && result.file) {
        setFiles((prev) => [result.file as TabFile, ...prev]);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    const result = await deleteTabFile(fileId, filePath);
    if (result.success) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const url = await getTabFileDownloadUrl(filePath);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <div key={tab.id} className="flex items-center gap-0.5">
            <button
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-r-none rounded-l-md text-sm font-medium transition-colors border',
                activeTabId === tab.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {tab.name}
            </button>
            <button
              onClick={() => handleDeleteTab(tab.id)}
              className={cn(
                'p-1.5 rounded-l-none rounded-r-md border border-r border-l-0 transition-colors',
                activeTabId === tab.id
                  ? 'bg-primary/80 text-primary-foreground border-primary hover:bg-destructive hover:border-destructive'
                  : 'bg-muted text-muted-foreground border-border hover:text-destructive hover:bg-destructive/10'
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {isAddingTab ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                value={newTabName}
                onChange={(e) => { setNewTabName(e.target.value); setTabError(null); }}
                placeholder="שם הטאב"
                className="h-8 w-36 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTab();
                  if (e.key === 'Escape') {
                    setIsAddingTab(false);
                    setNewTabName('');
                    setTabError(null);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateTab}
                disabled={isCreatingTab || !newTabName.trim()}
              >
                {isCreatingTab ? '...' : 'הוסף'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingTab(false);
                  setNewTabName('');
                  setTabError(null);
                }}
              >
                ביטול
              </Button>
            </div>
            {tabError && (
              <p className="text-xs text-destructive">{tabError}</p>
            )}
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsAddingTab(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            טאב חדש
          </Button>
        )}
      </div>

      {activeTab ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{activeTab.name}</CardTitle>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploading ? 'מעלה...' : 'העלאת קבצים'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingFiles ? (
              <p className="text-sm text-muted-foreground py-4 text-center">טוען...</p>
            ) : files.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FolderOpen className="h-9 w-9 mx-auto mb-2 opacity-30" />
                <p className="text-sm">אין קבצים בטאב זה</p>
                <p className="text-xs mt-1 opacity-70">לחץ על &quot;העלאת קבצים&quot; להוספה</p>
              </div>
            ) : (
              <div className="divide-y">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 py-2.5">
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} ·{' '}
                        {new Date(file.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="הורדה"
                        onClick={() => handleDownload(file.file_path, file.name)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="מחיקה"
                        onClick={() => handleDeleteFile(file.id, file.file_path)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-9 w-9 mx-auto mb-2 opacity-30" />
            <p className="text-sm">צור טאב ראשון כדי להתחיל</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
