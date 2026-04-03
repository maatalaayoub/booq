import { z } from 'zod';
import { zUUID, zTimeStr } from '@/lib/validate';

// ─── CREATE APPOINTMENT (business-side) ─────────────────────────────────

export const createAppointmentSchema = z.object({
  client_name: z.string().trim().min(1, 'Client name is required'),
  client_phone: z.string().optional(),
  client_address: z.string().optional(),
  service: z.string().trim().min(1, 'Service is required'),
  price: z.coerce.number().min(0).optional(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).default('pending'),
  notes: z.string().optional(),
});

// ─── UPDATE APPOINTMENT (business-side) ──────────────────────────────────

export const updateAppointmentSchema = z.object({
  id: zUUID,
  client_name: z.string().trim().min(1).optional(),
  client_phone: z.string().optional(),
  client_address: z.string().optional(),
  service: z.string().trim().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
  rescheduled_by: z.enum(['business', 'client']).optional(),
});

// ─── DELETE APPOINTMENT ─────────────────────────────────────────────────

export const deleteAppointmentSchema = z.object({
  id: zUUID,
});
