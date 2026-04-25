import { z } from 'zod';

// ============================================================================
// Enums (mirror the Postgres enums)
// ============================================================================
export const UserRole = z.enum(['admin', 'editor', 'viewer']);
export type UserRole = z.infer<typeof UserRole>;

export const ProjectStatus = z.enum([
  'planning',
  'pre_sale',
  'under_construction',
  'completed',
  'sold_out',
  'archived',
]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const ProjectType = z.enum([
  'residential',
  'commercial',
  'mixed_use',
  'office',
  'retail',
  'industrial',
]);
export type ProjectType = z.infer<typeof ProjectType>;

export const MediaType = z.enum([
  'image',
  'rendering',
  'floor_plan',
  'site_plan',
  'document',
  'video',
]);
export type MediaType = z.infer<typeof MediaType>;

export const DataSource = z.enum([
  'yad2',
  'madlan',
  'tax_authority',
  'manual',
  'other',
]);
export type DataSource = z.infer<typeof DataSource>;

// ============================================================================
// Validation schemas
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, numbers and dashes'),
  description: z.string().max(5000).optional(),
  project_type: ProjectType.default('residential'),
  status: ProjectStatus.default('planning'),
  address: z.string().max(300).optional(),
  city: z.string().min(1).max(100),
  neighborhood: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  gush: z.string().max(20).optional(),
  helka: z.string().max(20).optional(),
  developer_name: z.string().max(200).optional(),
  developer_contact: z.string().max(200).optional(),
  price_min: z.number().positive().optional(),
  price_max: z.number().positive().optional(),
  price_per_sqm_avg: z.number().positive().optional(),
  construction_start_date: z.string().optional(),
  expected_completion_date: z.string().optional(),
  total_units: z.number().int().positive().optional(),
  floors: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createUnitSchema = z.object({
  project_id: z.string().uuid(),
  unit_number: z.string().min(1).max(50),
  floor: z.number().int().optional(),
  rooms: z.number().min(0.5).max(20).optional(),
  area_sqm: z.number().positive().optional(),
  price: z.number().positive().optional(),
  status: z.enum(['available', 'reserved', 'sold', 'unavailable']).default('available'),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

// Allowed upload MIME types and limits
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOC_TYPES = ['application/pdf'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4'];
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
