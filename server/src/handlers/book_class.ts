import { db } from '../db';
import { classBookingsTable, classSchedulesTable, usersTable } from '../db/schema';
import { type BookClassInput, type ClassBooking } from '../schema';
import { eq, and } from 'drizzle-orm';

export const bookClass = async (input: BookClassInput): Promise<ClassBooking> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Check if schedule exists and is not cancelled
    const schedule = await db.select()
      .from(classSchedulesTable)
      .where(
        and(
          eq(classSchedulesTable.id, input.schedule_id),
          eq(classSchedulesTable.is_cancelled, false)
        )
      )
      .execute();

    if (schedule.length === 0) {
      throw new Error(`Class schedule with id ${input.schedule_id} not found or is cancelled`);
    }

    const classSchedule = schedule[0];

    // Check if user already has a booking for this schedule
    const existingBooking = await db.select()
      .from(classBookingsTable)
      .where(
        and(
          eq(classBookingsTable.user_id, input.user_id),
          eq(classBookingsTable.schedule_id, input.schedule_id),
          eq(classBookingsTable.booking_status, 'confirmed')
        )
      )
      .execute();

    if (existingBooking.length > 0) {
      throw new Error('User already has a confirmed booking for this class');
    }

    // Determine booking status based on available spots
    let bookingStatus: 'confirmed' | 'waitlist' = 'confirmed';
    
    if (classSchedule.available_spots <= 0) {
      bookingStatus = 'waitlist';
    }

    // Create the booking
    const result = await db.insert(classBookingsTable)
      .values({
        user_id: input.user_id,
        schedule_id: input.schedule_id,
        booking_status: bookingStatus
      })
      .returning()
      .execute();

    // If booking is confirmed, decrease available spots
    if (bookingStatus === 'confirmed') {
      await db.update(classSchedulesTable)
        .set({
          available_spots: classSchedule.available_spots - 1
        })
        .where(eq(classSchedulesTable.id, input.schedule_id))
        .execute();
    }

    return result[0];
  } catch (error) {
    console.error('Class booking failed:', error);
    throw error;
  }
};