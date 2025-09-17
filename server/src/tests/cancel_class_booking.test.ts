import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, trainersTable, gymClassesTable, classSchedulesTable, classBookingsTable } from '../db/schema';
import { type CancelClassBookingInput } from '../schema';
import { cancelClassBooking } from '../handlers/cancel_class_booking';
import { eq, and } from 'drizzle-orm';

describe('cancelClassBooking', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestData = async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '123-456-7890'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create another user for testing unauthorized access
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '098-765-4321'
      })
      .returning()
      .execute();
    const otherUser = otherUserResult[0];

    // Create a trainer
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Mike',
        last_name: 'Johnson',
        email: 'trainer@example.com',
        phone: '555-0123',
        specialization: 'Yoga',
        bio: 'Certified yoga instructor',
        hourly_rate: '75.00',
        is_available: true
      })
      .returning()
      .execute();
    const trainer = trainerResult[0];

    // Create a gym class
    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Morning Yoga',
        description: 'Relaxing morning yoga session',
        instructor_id: trainer.id,
        duration_minutes: 60,
        capacity: 20,
        difficulty_level: 'beginner'
      })
      .returning()
      .execute();
    const gymClass = classResult[0];

    // Create a class schedule
    const scheduleResult = await db.insert(classSchedulesTable)
      .values({
        class_id: gymClass.id,
        start_time: new Date('2024-01-15T10:00:00Z'),
        end_time: new Date('2024-01-15T11:00:00Z'),
        room: 'Studio A',
        available_spots: 15,
        is_cancelled: false
      })
      .returning()
      .execute();
    const schedule = scheduleResult[0];

    // Create a confirmed class booking
    const bookingResult = await db.insert(classBookingsTable)
      .values({
        user_id: user.id,
        schedule_id: schedule.id,
        booking_status: 'confirmed'
      })
      .returning()
      .execute();
    const booking = bookingResult[0];

    // Create a cancelled booking for testing already cancelled scenario
    const cancelledBookingResult = await db.insert(classBookingsTable)
      .values({
        user_id: user.id,
        schedule_id: schedule.id,
        booking_status: 'cancelled',
        cancelled_at: new Date()
      })
      .returning()
      .execute();
    const cancelledBooking = cancelledBookingResult[0];

    return { user, otherUser, trainer, gymClass, schedule, booking, cancelledBooking };
  };

  const testInput: CancelClassBookingInput = {
    booking_id: 1,
    user_id: 1
  };

  it('should cancel a confirmed class booking', async () => {
    const { user, booking } = await createTestData();
    
    const input: CancelClassBookingInput = {
      booking_id: booking.id,
      user_id: user.id
    };

    const result = await cancelClassBooking(input);

    // Verify the returned booking data
    expect(result.id).toEqual(booking.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.schedule_id).toEqual(booking.schedule_id);
    expect(result.booking_status).toEqual('cancelled');
    expect(result.booked_at).toBeInstanceOf(Date);
    expect(result.cancelled_at).toBeInstanceOf(Date);
    expect(result.cancelled_at).not.toBeNull();
  });

  it('should update booking status in database', async () => {
    const { user, booking } = await createTestData();
    
    const input: CancelClassBookingInput = {
      booking_id: booking.id,
      user_id: user.id
    };

    await cancelClassBooking(input);

    // Query the database to verify the booking was updated
    const updatedBookings = await db.select()
      .from(classBookingsTable)
      .where(eq(classBookingsTable.id, booking.id))
      .execute();

    expect(updatedBookings).toHaveLength(1);
    expect(updatedBookings[0].booking_status).toEqual('cancelled');
    expect(updatedBookings[0].cancelled_at).toBeInstanceOf(Date);
    expect(updatedBookings[0].cancelled_at).not.toBeNull();
  });

  it('should throw error if booking does not exist', async () => {
    const { user } = await createTestData();
    
    const input: CancelClassBookingInput = {
      booking_id: 999, // Non-existent booking ID
      user_id: user.id
    };

    await expect(cancelClassBooking(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error if booking does not belong to user', async () => {
    const { otherUser, booking } = await createTestData();
    
    const input: CancelClassBookingInput = {
      booking_id: booking.id,
      user_id: otherUser.id // Different user trying to cancel
    };

    await expect(cancelClassBooking(input)).rejects.toThrow(/not found.*belong/i);
  });

  it('should throw error if booking is already cancelled', async () => {
    const { user, cancelledBooking } = await createTestData();
    
    const input: CancelClassBookingInput = {
      booking_id: cancelledBooking.id,
      user_id: user.id
    };

    await expect(cancelClassBooking(input)).rejects.toThrow(/already cancelled/i);
  });

  it('should handle waitlist bookings', async () => {
    const { user } = await createTestData();
    
    // Create a waitlist booking
    const waitlistBookingResult = await db.insert(classBookingsTable)
      .values({
        user_id: user.id,
        schedule_id: 1, // Using existing schedule
        booking_status: 'waitlist'
      })
      .returning()
      .execute();
    const waitlistBooking = waitlistBookingResult[0];

    const input: CancelClassBookingInput = {
      booking_id: waitlistBooking.id,
      user_id: user.id
    };

    const result = await cancelClassBooking(input);

    expect(result.booking_status).toEqual('cancelled');
    expect(result.cancelled_at).toBeInstanceOf(Date);
  });

  it('should verify user ownership with correct user and booking combination', async () => {
    const { user, booking } = await createTestData();
    
    // This should work - correct user and booking combination
    const input: CancelClassBookingInput = {
      booking_id: booking.id,
      user_id: user.id
    };

    const result = await cancelClassBooking(input);
    expect(result.booking_status).toEqual('cancelled');

    // Verify database state
    const bookings = await db.select()
      .from(classBookingsTable)
      .where(
        and(
          eq(classBookingsTable.id, booking.id),
          eq(classBookingsTable.user_id, user.id)
        )
      )
      .execute();

    expect(bookings).toHaveLength(1);
    expect(bookings[0].booking_status).toEqual('cancelled');
  });
});