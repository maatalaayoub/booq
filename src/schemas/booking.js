import { z } from 'zod';
import { zUUID, zDateStr, zTimeStr } from '@/lib/validate';

// ─── CREATE BOOKING ─────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  businessId: zUUID,
  // Accept either serviceIds array or single serviceId
  serviceIds: z.array(zUUID).min(1).max(10).optional(),
  serviceId: zUUID.optional(),
  date: zDateStr,
  startTime: zTimeStr,
  clientName: z.string().trim().min(2, 'Client name is required'),
  clientPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(
  data => (data.serviceIds && data.serviceIds.length > 0) || data.serviceId,
  { message: 'At least one service must be selected', path: ['serviceIds'] }
);

// ─── EDIT BOOKING (PATCH /api/bookings) ─────────────────────────────────

export const editBookingSchema = z.object({
  id: zUUID,
  date: zDateStr.optional(),
  startTime: zTimeStr.optional(),
  serviceIds: z.array(zUUID).min(1).optional(),
}).refine(
  data => (data.date && data.startTime) || (data.serviceIds && data.serviceIds.length > 0),
  { message: 'Nothing to update — provide date+startTime or serviceIds' }
);

// ─── CANCEL BOOKING (DELETE /api/bookings?id=UUID) ──────────────────────

export const cancelBookingSchema = z.object({
  id: zUUID,
});

// ─── AVAILABLE SLOTS QUERY ──────────────────────────────────────────────

export const availableSlotsSchema = z.object({
  businessId: zUUID,
  date: zDateStr,
  duration: z.coerce.number().int().min(5).max(480).default(30),
});
