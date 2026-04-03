import { z } from 'zod';

// ─── ONBOARDING ─────────────────────────────────────────────────────────

const validProfessionalTypes = ['barber', 'hairdresser', 'makeup', 'nails', 'massage'];
const validBusinessCategories = ['salon_owner', 'mobile_service', 'job_seeker'];
const validServiceModes = ['booking', 'walkin', 'both'];

export const onboardingSchema = z.object({
  professionalType: z.string().min(1, 'Professional type is required'),
  businessCategory: z.enum(validBusinessCategories),
  serviceCategoryId: z.string().optional(),
  specialtyId: z.string().optional(),
  serviceMode: z.enum(validServiceModes).optional(),
  workLocation: z.string().optional(),
  businessHours: z.any().optional(),
  yearsOfExperience: z.number().optional(),
  hasCertificate: z.boolean().optional(),
  businessName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  serviceArea: z.string().optional(),
  travelRadiusKm: z.number().optional(),
  preferredCity: z.string().optional(),
  bio: z.string().optional(),
  completeOnboarding: z.boolean().optional(),
}).refine(
  data => validProfessionalTypes.includes(data.professionalType) || data.specialtyId,
  { message: 'Invalid professional type', path: ['professionalType'] }
);
