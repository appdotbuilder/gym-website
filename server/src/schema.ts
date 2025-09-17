import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Membership tier schema
export const membershipTierSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  duration_months: z.number().int(),
  features: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type MembershipTier = z.infer<typeof membershipTierSchema>;

// User membership schema
export const userMembershipSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  membership_tier_id: z.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  status: z.enum(['active', 'expired', 'cancelled']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type UserMembership = z.infer<typeof userMembershipSchema>;

// Trainer schema
export const trainerSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  specialization: z.string(),
  bio: z.string(),
  hourly_rate: z.number(),
  is_available: z.boolean(),
  image_url: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Trainer = z.infer<typeof trainerSchema>;

// Gym class schema
export const gymClassSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  instructor_id: z.number(),
  duration_minutes: z.number().int(),
  capacity: z.number().int(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  created_at: z.coerce.date()
});

export type GymClass = z.infer<typeof gymClassSchema>;

// Class schedule schema
export const classScheduleSchema = z.object({
  id: z.number(),
  class_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  room: z.string(),
  available_spots: z.number().int(),
  is_cancelled: z.boolean(),
  created_at: z.coerce.date()
});

export type ClassSchedule = z.infer<typeof classScheduleSchema>;

// Class booking schema
export const classBookingSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  schedule_id: z.number(),
  booking_status: z.enum(['confirmed', 'cancelled', 'waitlist']),
  booked_at: z.coerce.date(),
  cancelled_at: z.coerce.date().nullable()
});

export type ClassBooking = z.infer<typeof classBookingSchema>;

// Personal training session schema
export const personalTrainingSessionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  trainer_id: z.number(),
  session_date: z.coerce.date(),
  start_time: z.string(), // Time stored as string (HH:MM format)
  end_time: z.string(),
  status: z.enum(['scheduled', 'completed', 'cancelled']),
  notes: z.string().nullable(),
  price: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PersonalTrainingSession = z.infer<typeof personalTrainingSessionSchema>;

// Facility schema
export const facilitySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  image_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Facility = z.infer<typeof facilitySchema>;

// Gym info schema
export const gymInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  operating_hours: z.object({
    monday: z.string(),
    tuesday: z.string(),
    wednesday: z.string(),
    thursday: z.string(),
    friday: z.string(),
    saturday: z.string(),
    sunday: z.string()
  }),
  description: z.string().nullable(),
  updated_at: z.coerce.date()
});

export type GymInfo = z.infer<typeof gymInfoSchema>;

// Input schemas for creating/updating
export const createUserInputSchema = z.object({
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const createMembershipTierInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number().positive(),
  duration_months: z.number().int().positive(),
  features: z.array(z.string()),
  is_active: z.boolean().default(true)
});

export type CreateMembershipTierInput = z.infer<typeof createMembershipTierInputSchema>;

export const createUserMembershipInputSchema = z.object({
  user_id: z.number(),
  membership_tier_id: z.number(),
  start_date: z.coerce.date()
});

export type CreateUserMembershipInput = z.infer<typeof createUserMembershipInputSchema>;

export const bookClassInputSchema = z.object({
  user_id: z.number(),
  schedule_id: z.number()
});

export type BookClassInput = z.infer<typeof bookClassInputSchema>;

export const cancelClassBookingInputSchema = z.object({
  booking_id: z.number(),
  user_id: z.number()
});

export type CancelClassBookingInput = z.infer<typeof cancelClassBookingInputSchema>;

export const bookPersonalTrainingInputSchema = z.object({
  user_id: z.number(),
  trainer_id: z.number(),
  session_date: z.coerce.date(),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  notes: z.string().nullable().optional()
});

export type BookPersonalTrainingInput = z.infer<typeof bookPersonalTrainingInputSchema>;

export const updatePersonalTrainingInputSchema = z.object({
  session_id: z.number(),
  user_id: z.number(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  notes: z.string().nullable().optional()
});

export type UpdatePersonalTrainingInput = z.infer<typeof updatePersonalTrainingInputSchema>;

// Query input schemas
export const getUserByIdInputSchema = z.object({
  user_id: z.number()
});

export type GetUserByIdInput = z.infer<typeof getUserByIdInputSchema>;

export const getClassScheduleInputSchema = z.object({
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional()
});

export type GetClassScheduleInput = z.infer<typeof getClassScheduleInputSchema>;

export const getTrainerAvailabilityInputSchema = z.object({
  trainer_id: z.number(),
  date: z.coerce.date()
});

export type GetTrainerAvailabilityInput = z.infer<typeof getTrainerAvailabilityInputSchema>;