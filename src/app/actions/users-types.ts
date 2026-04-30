/**
 * Types for user management actions.
 * Lives outside the 'use server' file (only async exports allowed there).
 */

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  phone: string | null;
  created_at: string;
}
