'use client';

import * as React from 'react';
import {
  UserPlus,
  Loader2,
  KeyRound,
  Trash2,
  Check,
  AlertCircle,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import {
  inviteUserAction,
  updateUserAction,
  deleteUserAction,
  sendPasswordResetAction,
} from '@/app/actions/users';
import type { UserRow } from '@/app/actions/users-types';

interface Props {
  initialUsers: UserRow[];
  currentUserId: string;
}

const ROLE_LABELS: Record<UserRow['role'], { label: string; variant: 'info' | 'success' | 'secondary' }> = {
  admin: { label: 'אדמין', variant: 'success' },
  editor: { label: 'עורך', variant: 'info' },
  viewer: { label: 'צופה', variant: 'secondary' },
};

export function UsersPageClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = React.useState(initialUsers);
  const [showInvite, setShowInvite] = React.useState(false);
  const [toast, setToast] = React.useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRoleChange = async (userId: string, role: UserRow['role']) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    const result = await updateUserAction({ id: userId, role });
    if (!result.ok) {
      showToast('error', result.error);
      // Revert
      setUsers(initialUsers);
    } else {
      showToast('success', 'התפקיד עודכן');
    }
  };

  const handleActiveToggle = async (userId: string, is_active: boolean) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active } : u)));
    const result = await updateUserAction({ id: userId, is_active });
    if (!result.ok) {
      showToast('error', result.error);
      setUsers(initialUsers);
    } else {
      showToast('success', is_active ? 'המשתמש הופעל' : 'המשתמש הושבת');
    }
  };

  const handlePasswordReset = async (userId: string) => {
    const result = await sendPasswordResetAction(userId);
    if (!result.ok) {
      showToast('error', result.error);
    } else {
      showToast('success', 'נשלח אימייל לאיפוס סיסמה');
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`למחוק את ${user.full_name ?? user.email} לצמיתות? לא ניתן לשחזר.`)) return;
    const result = await deleteUserAction(user.id);
    if (!result.ok) {
      showToast('error', result.error);
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    showToast('success', 'המשתמש נמחק');
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    inactive: users.filter((u) => !u.is_active).length,
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <PageHeader
        title="ניהול משתמשים"
        description={`${stats.total} משתמשים · ${stats.admins} אדמינים${stats.inactive ? ` · ${stats.inactive} מושבתים` : ''}`}
      >
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="h-4 w-4" />
          הזמן משתמש
        </Button>
      </PageHeader>

      {toast && (
        <div
          className={cn(
            'mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
            toast.type === 'success' &&
              'border-[hsl(var(--success))] bg-[hsl(var(--success-bg))] text-[hsl(var(--success-foreground))]',
            toast.type === 'error' &&
              'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive-bg))] text-[hsl(var(--destructive))]'
          )}
        >
          {toast.type === 'success' ? (
            <Check className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-right font-medium">משתמש</th>
                  <th className="px-4 py-2.5 text-right font-medium w-32">תפקיד</th>
                  <th className="px-4 py-2.5 text-center font-medium w-24">פעיל</th>
                  <th className="px-4 py-2.5 text-right font-medium w-32">הצטרף</th>
                  <th className="px-4 py-2.5 text-right font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        'border-b last:border-b-0 hover:bg-accent/30 transition-colors',
                        !user.is_active && 'opacity-50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                              user.is_active
                                ? 'bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-900))]'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {getInitials(user.full_name ?? user.email)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{user.full_name ?? '—'}</p>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  אתה
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleChange(user.id, v as UserRow['role'])}
                          disabled={isSelf}
                        >
                          <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-xs hover:bg-accent disabled:opacity-100 disabled:cursor-default">
                            <SelectValue>
                              <Badge variant={ROLE_LABELS[user.role].variant}>
                                {ROLE_LABELS[user.role].label}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">צופה</SelectItem>
                            <SelectItem value="editor">עורך</SelectItem>
                            <SelectItem value="admin">אדמין</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleActiveToggle(user.id, !user.is_active)}
                          disabled={isSelf}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            user.is_active ? 'bg-[hsl(var(--success))]' : 'bg-muted',
                            isSelf && 'opacity-50 cursor-not-allowed'
                          )}
                          aria-label={user.is_active ? 'השבת משתמש' : 'הפעל משתמש'}
                        >
                          <span
                            className={cn(
                              'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                              user.is_active ? 'translate-x-[2px]' : 'translate-x-[18px]'
                            )}
                          />
                        </button>
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                        {new Date(user.created_at).toLocaleDateString('he-IL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handlePasswordReset(user.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title="שלח איפוס סיסמה"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--destructive-bg))] hover:text-[hsl(var(--destructive))] transition-colors"
                              title="מחק"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InviteUserDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        onSuccess={(newUser) => {
          setUsers((prev) => [newUser, ...prev]);
          showToast('success', 'הזמנה נשלחה באימייל');
        }}
        onError={(msg) => showToast('error', msg)}
      />
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Invite dialog
// ---------------------------------------------------------------------------

function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: UserRow) => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [role, setRole] = React.useState<UserRow['role']>('viewer');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setEmail('');
    setFullName('');
    setRole('viewer');
    setPhone('');
  };

  const handleSubmit = async () => {
    setSaving(true);
    const result = await inviteUserAction({
      email: email.trim(),
      full_name: fullName.trim(),
      role,
      phone: phone.trim() || undefined,
    });
    setSaving(false);

    if (!result.ok) {
      onError(result.error);
      return;
    }

    onSuccess({
      id: result.data.userId,
      email: email.trim(),
      full_name: fullName.trim(),
      role,
      is_active: true,
      phone: phone.trim() || null,
      created_at: new Date().toISOString(),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הזמן משתמש חדש</DialogTitle>
          <DialogDescription>
            ישלח אימייל עם קישור להגדרת סיסמה. המשתמש יקבל גישה מיד.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="שם מלא" htmlFor="invite-name" required>
            <Input
              id="invite-name"
              placeholder="דניאל כהן"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
            />
          </FormField>

          <FormField label="אימייל" htmlFor="invite-email" required>
            <Input
              id="invite-email"
              type="email"
              placeholder="daniel@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              dir="ltr"
              className="text-right"
            />
          </FormField>

          <FormField label="טלפון (אופציונלי)" htmlFor="invite-phone">
            <Input
              id="invite-phone"
              type="tel"
              placeholder="050-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              dir="ltr"
              className="text-right"
            />
          </FormField>

          <FormField
            label="תפקיד"
            htmlFor="invite-role"
            hint={
              role === 'admin'
                ? 'גישה מלאה · יכול לנהל משתמשים ולמחוק נתונים'
                : role === 'editor'
                  ? 'יכול ליצור ולערוך פרויקטים ולהפעיל scraping'
                  : 'קריאה בלבד'
            }
          >
            <Select value={role} onValueChange={(v) => setRole(v as UserRow['role'])} disabled={saving}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">צופה</SelectItem>
                <SelectItem value="editor">עורך</SelectItem>
                <SelectItem value="admin">אדמין</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <DialogFooter className="gap-2">
          <Button
            onClick={handleSubmit}
            disabled={saving || !email.trim() || !fullName.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                שלח הזמנה
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
