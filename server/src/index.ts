import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserInputSchema, 
  updateUserInputSchema,
  getUserByIdInputSchema,
  createMembershipTierInputSchema,
  createUserMembershipInputSchema,
  bookClassInputSchema,
  cancelClassBookingInputSchema,
  bookPersonalTrainingInputSchema,
  updatePersonalTrainingInputSchema,
  getClassScheduleInputSchema,
  getTrainerAvailabilityInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUserById } from './handlers/get_user';
import { updateUser } from './handlers/update_user';
import { getMembershipTiers } from './handlers/get_membership_tiers';
import { createMembershipTier } from './handlers/create_membership_tier';
import { createUserMembership } from './handlers/create_user_membership';
import { getUserMembership } from './handlers/get_user_membership';
import { getTrainers } from './handlers/get_trainers';
import { getTrainerAvailability } from './handlers/get_trainer_availability';
import { getGymClasses } from './handlers/get_gym_classes';
import { getClassSchedule } from './handlers/get_class_schedule';
import { bookClass } from './handlers/book_class';
import { cancelClassBooking } from './handlers/cancel_class_booking';
import { getUserClassBookings } from './handlers/get_user_class_bookings';
import { bookPersonalTraining } from './handlers/book_personal_training';
import { updatePersonalTraining } from './handlers/update_personal_training';
import { getUserPersonalTrainingSessions } from './handlers/get_user_personal_training_sessions';
import { getFacilities } from './handlers/get_facilities';
import { getGymInfo } from './handlers/get_gym_info';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUserById: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserById(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Membership management
  getMembershipTiers: publicProcedure
    .query(() => getMembershipTiers()),

  createMembershipTier: publicProcedure
    .input(createMembershipTierInputSchema)
    .mutation(({ input }) => createMembershipTier(input)),

  createUserMembership: publicProcedure
    .input(createUserMembershipInputSchema)
    .mutation(({ input }) => createUserMembership(input)),

  getUserMembership: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserMembership(input)),

  // Trainer management
  getTrainers: publicProcedure
    .query(() => getTrainers()),

  getTrainerAvailability: publicProcedure
    .input(getTrainerAvailabilityInputSchema)
    .query(({ input }) => getTrainerAvailability(input)),

  // Gym classes and schedules
  getGymClasses: publicProcedure
    .query(() => getGymClasses()),

  getClassSchedule: publicProcedure
    .input(getClassScheduleInputSchema)
    .query(({ input }) => getClassSchedule(input)),

  // Class booking management
  bookClass: publicProcedure
    .input(bookClassInputSchema)
    .mutation(({ input }) => bookClass(input)),

  cancelClassBooking: publicProcedure
    .input(cancelClassBookingInputSchema)
    .mutation(({ input }) => cancelClassBooking(input)),

  getUserClassBookings: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserClassBookings(input)),

  // Personal training management
  bookPersonalTraining: publicProcedure
    .input(bookPersonalTrainingInputSchema)
    .mutation(({ input }) => bookPersonalTraining(input)),

  updatePersonalTraining: publicProcedure
    .input(updatePersonalTrainingInputSchema)
    .mutation(({ input }) => updatePersonalTraining(input)),

  getUserPersonalTrainingSessions: publicProcedure
    .input(getUserByIdInputSchema)
    .query(({ input }) => getUserPersonalTrainingSessions(input)),

  // Gym information
  getFacilities: publicProcedure
    .query(() => getFacilities()),

  getGymInfo: publicProcedure
    .query(() => getGymInfo()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();