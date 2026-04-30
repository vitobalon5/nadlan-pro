/**
 * Types for command search action.
 * Lives outside the 'use server' file (only async exports allowed there).
 */

export interface CommandProjectResult {
  id: string;
  name: string;
  slug: string;
  city: string;
  neighborhood: string | null;
  status: string;
  cover_image_url: string | null;
}
