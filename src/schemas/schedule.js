import { z } from 'zod';
import { zUUID, zDateStr, zTimeStr } from '@/lib/validate';

// ─── UPDATE BUSINESS HOURS ──────────────────────────────────────────────

export const updateBusinessHoursSchema = z.object({
  businessHours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    openTime: zTimeStr.optional(),
    closeTime: zTimeStr.optional(),
  })).min(1, 'businessHours array is required'),
});

// ─── CREATE SCHEDULE EXCEPTION ──────────────────────────────────────────

const validExceptionTypes = ['break', 'lunch_break', 'closure', 'holiday', 'vacation', 'other'];

export const createExceptionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  type: z.enum(validExceptionTypes),
  date: zDateStr,
  endDate: zDateStr.nullable().optional(),
  startTime: zTimeStr.nullable().optional(),
  endTime: zTimeStr.nullable().optional(),
  isFullDay: z.boolean().nullable().optional(),
  recurring: z.boolean().default(false),
  recurringDay: z.number().int().min(0).max(6).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ─── UPDATE SCHEDULE EXCEPTION ──────────────────────────────────────────

export const updateExceptionSchema = createExceptionSchema.extend({
  id: zUUID,
});

// ─── DELETE SCHEDULE EXCEPTION ──────────────────────────────────────────

export const deleteExceptionSchema = z.object({
  id: zUUID,
});
