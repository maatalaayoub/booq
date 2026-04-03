import { z } from 'zod';
import { zUUID } from '@/lib/validate';

// ─── CREATE SERVICE ─────────────────────────────────────────────────────

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(5).max(480).default(30),
  price: z.coerce.number().min(0, 'price is required'),
  currency: z.string().default('MAD'),
  is_active: z.boolean().default(true),
});

// ─── UPDATE SERVICE ─────────────────────────────────────────────────────

export const updateServiceSchema = z.object({
  id: zUUID,
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  is_active: z.boolean().optional(),
});

// ─── DELETE SERVICE ─────────────────────────────────────────────────────

export const deleteServiceSchema = z.object({
  id: zUUID,
});
