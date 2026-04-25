import { z } from 'zod';
import { ProjectType, ProjectStatus } from './domain';

/**
 * Full project wizard schema with cross-field validation.
 * Each step has its own sub-schema for independent validation.
 */

// Step 1: Basic info
export const stepBasicsSchema = z.object({
  name: z
    .string()
    .min(2, 'שם הפרויקט חייב להכיל לפחות 2 תווים')
    .max(200, 'שם הפרויקט ארוך מדי'),
  slug: z
    .string()
    .min(2, 'מזהה URL חייב להכיל לפחות 2 תווים')
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'רק אותיות קטנות באנגלית, מספרים ומקף'),
  description: z.string().max(5000, 'תיאור ארוך מדי').optional().or(z.literal('')),
  project_type: ProjectType,
  status: ProjectStatus,
  developer_name: z.string().max(200).optional().or(z.literal('')),
  developer_contact: z.string().max(200).optional().or(z.literal('')),
});

// Step 2: Location
export const stepLocationSchema = z.object({
  city: z.string().min(1, 'עיר היא שדה חובה').max(100),
  neighborhood: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(300).optional().or(z.literal('')),
  gush: z
    .string()
    .max(20)
    .regex(/^[0-9]*$/, 'גוש חייב להיות מספר')
    .optional()
    .or(z.literal('')),
  helka: z
    .string()
    .max(20)
    .regex(/^[0-9]*$/, 'חלקה חייבת להיות מספר')
    .optional()
    .or(z.literal('')),
  latitude: z
    .union([z.coerce.number().min(-90).max(90), z.literal('')])
    .optional(),
  longitude: z
    .union([z.coerce.number().min(-180).max(180), z.literal('')])
    .optional(),
});

// Step 3: Pricing & Timeline (with cross-field validation)
export const stepPricingSchema = z
  .object({
    total_units: z
      .union([z.coerce.number().int().positive('חייב להיות מספר חיובי'), z.literal('')])
      .optional(),
    floors: z
      .union([z.coerce.number().int().positive(), z.literal('')])
      .optional(),
    price_min: z
      .union([z.coerce.number().positive(), z.literal('')])
      .optional(),
    price_max: z
      .union([z.coerce.number().positive(), z.literal('')])
      .optional(),
    price_per_sqm_avg: z
      .union([z.coerce.number().positive(), z.literal('')])
      .optional(),
    construction_start_date: z.string().optional().or(z.literal('')),
    expected_completion_date: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (typeof data.price_min === 'number' && typeof data.price_max === 'number') {
        return data.price_min <= data.price_max;
      }
      return true;
    },
    { message: 'מחיר מינימלי לא יכול להיות גדול ממחיר מקסימלי', path: ['price_max'] }
  )
  .refine(
    (data) => {
      if (data.construction_start_date && data.expected_completion_date) {
        return (
          new Date(data.construction_start_date) <=
          new Date(data.expected_completion_date)
        );
      }
      return true;
    },
    {
      message: 'תאריך סיום צפוי חייב להיות אחרי תאריך התחלה',
      path: ['expected_completion_date'],
    }
  );

// Step 4: Media - pending files before upload
export const stepMediaSchema = z.object({
  // Media is managed as File[] in state, not in the form
  // This just validates minimum count
  _mediaCount: z.number().min(0),
});

// Full combined schema
export const fullProjectSchema = z.object({
  ...stepBasicsSchema.shape,
  ...stepLocationSchema.shape,
  // For pricing we spread the inner object shape (before .refine)
  total_units: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  floors: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  price_min: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  price_max: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  price_per_sqm_avg: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  construction_start_date: z.string().optional().or(z.literal('')),
  expected_completion_date: z.string().optional().or(z.literal('')),
});

export type StepBasics = z.infer<typeof stepBasicsSchema>;
export type StepLocation = z.infer<typeof stepLocationSchema>;
export type StepPricing = z.infer<typeof stepPricingSchema>;
export type FullProjectForm = z.infer<typeof fullProjectSchema>;

// Helper: strip empty strings so they become undefined / null in DB
export function cleanFormData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned as Partial<T>;
}
