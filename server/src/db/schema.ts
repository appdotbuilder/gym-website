import { serial, text, pgTable, timestamp, numeric, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'expired', 'cancelled']);
export const difficultyLevelEnum = pgEnum('difficulty_level', ['beginner', 'intermediate', 'advanced']);
export const bookingStatusEnum = pgEnum('booking_status', ['confirmed', 'cancelled', 'waitlist']);
export const sessionStatusEnum = pgEnum('session_status', ['scheduled', 'completed', 'cancelled']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  phone: text('phone'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Membership tiers table
export const membershipTiersTable = pgTable('membership_tiers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  duration_months: integer('duration_months').notNull(),
  features: jsonb('features').notNull(), // Array of strings stored as JSON
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// User memberships table
export const userMembershipsTable = pgTable('user_memberships', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  membership_tier_id: integer('membership_tier_id').references(() => membershipTiersTable.id).notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  status: membershipStatusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Trainers table
export const trainersTable = pgTable('trainers', {
  id: serial('id').primaryKey(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'), // Nullable
  specialization: text('specialization').notNull(),
  bio: text('bio').notNull(),
  hourly_rate: numeric('hourly_rate', { precision: 8, scale: 2 }).notNull(),
  is_available: boolean('is_available').notNull().default(true),
  image_url: text('image_url'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Gym classes table
export const gymClassesTable = pgTable('gym_classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  instructor_id: integer('instructor_id').references(() => trainersTable.id).notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  capacity: integer('capacity').notNull(),
  difficulty_level: difficultyLevelEnum('difficulty_level').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Class schedules table
export const classSchedulesTable = pgTable('class_schedules', {
  id: serial('id').primaryKey(),
  class_id: integer('class_id').references(() => gymClassesTable.id).notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  room: text('room').notNull(),
  available_spots: integer('available_spots').notNull(),
  is_cancelled: boolean('is_cancelled').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Class bookings table
export const classBookingsTable = pgTable('class_bookings', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  schedule_id: integer('schedule_id').references(() => classSchedulesTable.id).notNull(),
  booking_status: bookingStatusEnum('booking_status').notNull().default('confirmed'),
  booked_at: timestamp('booked_at').defaultNow().notNull(),
  cancelled_at: timestamp('cancelled_at'), // Nullable
});

// Personal training sessions table
export const personalTrainingSessionsTable = pgTable('personal_training_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  trainer_id: integer('trainer_id').references(() => trainersTable.id).notNull(),
  session_date: timestamp('session_date').notNull(),
  start_time: text('start_time').notNull(), // Time in HH:MM format
  end_time: text('end_time').notNull(),
  status: sessionStatusEnum('status').notNull().default('scheduled'),
  notes: text('notes'), // Nullable
  price: numeric('price', { precision: 8, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Facilities table
export const facilitiesTable = pgTable('facilities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  image_url: text('image_url'), // Nullable
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Gym info table (singleton table for gym details)
export const gymInfoTable = pgTable('gym_info', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  operating_hours: jsonb('operating_hours').notNull(), // Object with days of week
  description: text('description'), // Nullable
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  memberships: many(userMembershipsTable),
  classBookings: many(classBookingsTable),
  personalTrainingSessions: many(personalTrainingSessionsTable),
}));

export const membershipTiersRelations = relations(membershipTiersTable, ({ many }) => ({
  userMemberships: many(userMembershipsTable),
}));

export const userMembershipsRelations = relations(userMembershipsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userMembershipsTable.user_id],
    references: [usersTable.id],
  }),
  membershipTier: one(membershipTiersTable, {
    fields: [userMembershipsTable.membership_tier_id],
    references: [membershipTiersTable.id],
  }),
}));

export const trainersRelations = relations(trainersTable, ({ many }) => ({
  gymClasses: many(gymClassesTable),
  personalTrainingSessions: many(personalTrainingSessionsTable),
}));

export const gymClassesRelations = relations(gymClassesTable, ({ one, many }) => ({
  instructor: one(trainersTable, {
    fields: [gymClassesTable.instructor_id],
    references: [trainersTable.id],
  }),
  schedules: many(classSchedulesTable),
}));

export const classSchedulesRelations = relations(classSchedulesTable, ({ one, many }) => ({
  gymClass: one(gymClassesTable, {
    fields: [classSchedulesTable.class_id],
    references: [gymClassesTable.id],
  }),
  bookings: many(classBookingsTable),
}));

export const classBookingsRelations = relations(classBookingsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [classBookingsTable.user_id],
    references: [usersTable.id],
  }),
  schedule: one(classSchedulesTable, {
    fields: [classBookingsTable.schedule_id],
    references: [classSchedulesTable.id],
  }),
}));

export const personalTrainingSessionsRelations = relations(personalTrainingSessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [personalTrainingSessionsTable.user_id],
    references: [usersTable.id],
  }),
  trainer: one(trainersTable, {
    fields: [personalTrainingSessionsTable.trainer_id],
    references: [trainersTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  membershipTiers: membershipTiersTable,
  userMemberships: userMembershipsTable,
  trainers: trainersTable,
  gymClasses: gymClassesTable,
  classSchedules: classSchedulesTable,
  classBookings: classBookingsTable,
  personalTrainingSessions: personalTrainingSessionsTable,
  facilities: facilitiesTable,
  gymInfo: gymInfoTable,
};