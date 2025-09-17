import { db } from '../db';
import { classBookingsTable } from '../db/schema';
import { type GetUserByIdInput, type ClassBooking } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserClassBookings(input: GetUserByIdInput): Promise<ClassBooking[]> {
  try {
    // Query class bookings for the specified user
    const results = await db.select()
      .from(classBookingsTable)
      .where(eq(classBookingsTable.user_id, input.user_id))
      .execute();

    // Return the results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to get user class bookings:', error);
    throw error;
  }
}