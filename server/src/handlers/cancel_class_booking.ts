import { db } from '../db';
import { classBookingsTable } from '../db/schema';
import { type CancelClassBookingInput, type ClassBooking } from '../schema';
import { eq, and } from 'drizzle-orm';

export const cancelClassBooking = async (input: CancelClassBookingInput): Promise<ClassBooking> => {
  try {
    // First, verify the booking exists and belongs to the user
    const existingBooking = await db.select()
      .from(classBookingsTable)
      .where(
        and(
          eq(classBookingsTable.id, input.booking_id),
          eq(classBookingsTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingBooking.length === 0) {
      throw new Error('Class booking not found or does not belong to the user');
    }

    // Check if the booking is already cancelled
    if (existingBooking[0].booking_status === 'cancelled') {
      throw new Error('Class booking is already cancelled');
    }

    // Update the booking status to cancelled and set cancelled_at timestamp
    const result = await db.update(classBookingsTable)
      .set({
        booking_status: 'cancelled',
        cancelled_at: new Date()
      })
      .where(
        and(
          eq(classBookingsTable.id, input.booking_id),
          eq(classBookingsTable.user_id, input.user_id)
        )
      )
      .returning()
      .execute();

    const booking = result[0];
    return {
      ...booking,
      // No numeric conversions needed for this table
    };
  } catch (error) {
    console.error('Class booking cancellation failed:', error);
    throw error;
  }
};