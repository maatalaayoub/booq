import { z } from 'zod';

// ─── UPDATE USER PROFILE ────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthday: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  username: z.string()
    .trim()
    .toLowerCase()
    .transform(val => val === '' ? undefined : val)
    .pipe(
      z.string()
        .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3-20 characters (lowercase letters, numbers, underscores)')
        .optional()
    ),
  coverImageUrl: z.string().nullable().optional(),
  coverImagePosition: z.number().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});
