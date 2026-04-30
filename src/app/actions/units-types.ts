/**
 * Schemas and types for unit actions.
 * Lives outside the 'use server' file (only async exports allowed there).
 */

import { z } from 'zod';

export const createUnitSchema = z.object({
  project_id: z.string().uuid(),
  unit_number: z.string().min(1, 'מספר יחידה חובה').max(50),
  floor: z.number().int().optional().nullable(),
  rooms: z.number().min(0.5).max(30).optional().nullable(),
  area_sqm: z.number().positive().optional().nullable(),
  balcony_area_sqm: z.number().nonnegative().optional().nullable(),
  parking_spots: z.number().int().nonnegative().default(0),
  storage_units: z.number().int().nonnegative().default(0),
  price: z.number().positive().optional().nullable(),
  status: z.enum(['available', 'reserved', 'sold', 'unavailable']).default('available'),
  direction: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateUnitSchema = createUnitSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
