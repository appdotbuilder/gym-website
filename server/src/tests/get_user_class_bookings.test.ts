import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, trainersTable, gymClassesTable, classSchedulesTable, classBookingsTable } from '../db/schema';
import { type GetUserByIdInput } from '../schema';
import { getUserClassBookings } from '../handlers/get_user_class_bookings';
import { eq } from 'drizzle-orm';

describe('getUserClassBookings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no bookings', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      })
      .returning()
      .execute();

    const testInput: GetUserByIdInput = {
      user_id: userResult[0].id
    };

    const result = await getUserClassBookings(testInput);

    expect(result).toEqual([]);
  });

  it('should return class bookings for user', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      })
      .returning()
      .execute();

    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'trainer@example.com',
        phone: '555-5678',
        specialization: 'Yoga',
        bio: 'Experienced yoga instructor',
        hourly_rate: '50.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Morning Yoga',
        description: 'Relaxing morning yoga session',
        instructor_id: trainerResult[0].id,
        duration_minutes: 60,
        capacity: 20,
        difficulty_level: 'beginner'
      })
      .returning()
      .execute();

    const scheduleResult = await db.insert(classSchedulesTable)
      .values({
        class_id: classResult[0].id,
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z'),
        room: 'Studio A',
        available_spots: 15,
        is_cancelled: false
      })
      .returning()
      .execute();

    const bookingDate = new Date('2024-01-10T08:00:00Z');
    
    const bookingResult = await db.insert(classBookingsTable)
      .values({
        user_id: userResult[0].id,
        schedule_id: scheduleResult[0].id,
        booking_status: 'confirmed',
        booked_at: bookingDate,
        cancelled_at: null
      })
      .returning()
      .execute();

    const testInput: GetUserByIdInput = {
      user_id: userResult[0].id
    };

    const result = await getUserClassBookings(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(bookingResult[0].id);
    expect(result[0].user_id).toEqual(userResult[0].id);
    expect(result[0].schedule_id).toEqual(scheduleResult[0].id);
    expect(result[0].booking_status).toEqual('confirmed');
    expect(result[0].booked_at).toBeInstanceOf(Date);
    expect(result[0].cancelled_at).toBeNull();
  });

  it('should return multiple bookings for user', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      })
      .returning()
      .execute();

    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'trainer@example.com',
        phone: '555-5678',
        specialization: 'Yoga',
        bio: 'Experienced yoga instructor',
        hourly_rate: '50.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Morning Yoga',
        description: 'Relaxing morning yoga session',
        instructor_id: trainerResult[0].id,
        duration_minutes: 60,
        capacity: 20,
        difficulty_level: 'beginner'
      })
      .returning()
      .execute();

    // Create two schedules
    const schedule1Result = await db.insert(classSchedulesTable)
      .values({
        class_id: classResult[0].id,
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z'),
        room: 'Studio A',
        available_spots: 15,
        is_cancelled: false
      })
      .returning()
      .execute();

    const schedule2Result = await db.insert(classSchedulesTable)
      .values({
        class_id: classResult[0].id,
        start_time: new Date('2024-01-16T09:00:00Z'),
        end_time: new Date('2024-01-16T10:00:00Z'),
        room: 'Studio B',
        available_spots: 10,
        is_cancelled: false
      })
      .returning()
      .execute();

    // Create two bookings
    await db.insert(classBookingsTable)
      .values([
        {
          user_id: userResult[0].id,
          schedule_id: schedule1Result[0].id,
          booking_status: 'confirmed',
          booked_at: new Date('2024-01-10T08:00:00Z'),
          cancelled_at: null
        },
        {
          user_id: userResult[0].id,
          schedule_id: schedule2Result[0].id,
          booking_status: 'waitlist',
          booked_at: new Date('2024-01-11T08:00:00Z'),
          cancelled_at: null
        }
      ])
      .execute();

    const testInput: GetUserByIdInput = {
      user_id: userResult[0].id
    };

    const result = await getUserClassBookings(testInput);

    expect(result).toHaveLength(2);
    
    // Check first booking
    const confirmedBooking = result.find(b => b.booking_status === 'confirmed');
    expect(confirmedBooking).toBeDefined();
    expect(confirmedBooking!.user_id).toEqual(userResult[0].id);
    expect(confirmedBooking!.schedule_id).toEqual(schedule1Result[0].id);

    // Check second booking
    const waitlistBooking = result.find(b => b.booking_status === 'waitlist');
    expect(waitlistBooking).toBeDefined();
    expect(waitlistBooking!.user_id).toEqual(userResult[0].id);
    expect(waitlistBooking!.schedule_id).toEqual(schedule2Result[0].id);
  });

  it('should not return bookings for other users', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '555-5678'
      })
      .returning()
      .execute();

    // Create prerequisite data for bookings
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Mike',
        last_name: 'Johnson',
        email: 'trainer@example.com',
        phone: '555-9999',
        specialization: 'CrossFit',
        bio: 'CrossFit trainer',
        hourly_rate: '60.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'CrossFit',
        description: 'High intensity workout',
        instructor_id: trainerResult[0].id,
        duration_minutes: 45,
        capacity: 15,
        difficulty_level: 'advanced'
      })
      .returning()
      .execute();

    const scheduleResult = await db.insert(classSchedulesTable)
      .values({
        class_id: classResult[0].id,
        start_time: new Date('2024-01-20T18:00:00Z'),
        end_time: new Date('2024-01-20T18:45:00Z'),
        room: 'Gym Floor',
        available_spots: 12,
        is_cancelled: false
      })
      .returning()
      .execute();

    // Create bookings for both users
    await db.insert(classBookingsTable)
      .values([
        {
          user_id: user1Result[0].id,
          schedule_id: scheduleResult[0].id,
          booking_status: 'confirmed',
          booked_at: new Date('2024-01-10T08:00:00Z'),
          cancelled_at: null
        },
        {
          user_id: user2Result[0].id,
          schedule_id: scheduleResult[0].id,
          booking_status: 'confirmed',
          booked_at: new Date('2024-01-11T08:00:00Z'),
          cancelled_at: null
        }
      ])
      .execute();

    // Query bookings for user1
    const testInput: GetUserByIdInput = {
      user_id: user1Result[0].id
    };

    const result = await getUserClassBookings(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1Result[0].id);
    expect(result[0].user_id).not.toEqual(user2Result[0].id);
  });

  it('should handle cancelled bookings correctly', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      })
      .returning()
      .execute();

    // Create prerequisite data
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Sarah',
        last_name: 'Wilson',
        email: 'trainer@example.com',
        phone: '555-7777',
        specialization: 'Pilates',
        bio: 'Pilates instructor',
        hourly_rate: '45.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Pilates',
        description: 'Core strengthening',
        instructor_id: trainerResult[0].id,
        duration_minutes: 50,
        capacity: 12,
        difficulty_level: 'intermediate'
      })
      .returning()
      .execute();

    const scheduleResult = await db.insert(classSchedulesTable)
      .values({
        class_id: classResult[0].id,
        start_time: new Date('2024-01-18T10:00:00Z'),
        end_time: new Date('2024-01-18T10:50:00Z'),
        room: 'Studio C',
        available_spots: 8,
        is_cancelled: false
      })
      .returning()
      .execute();

    const cancelledDate = new Date('2024-01-12T15:00:00Z');

    // Create cancelled booking
    const bookingResult = await db.insert(classBookingsTable)
      .values({
        user_id: userResult[0].id,
        schedule_id: scheduleResult[0].id,
        booking_status: 'cancelled',
        booked_at: new Date('2024-01-10T08:00:00Z'),
        cancelled_at: cancelledDate
      })
      .returning()
      .execute();

    const testInput: GetUserByIdInput = {
      user_id: userResult[0].id
    };

    const result = await getUserClassBookings(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(bookingResult[0].id);
    expect(result[0].booking_status).toEqual('cancelled');
    expect(result[0].cancelled_at).toBeInstanceOf(Date);
    expect(result[0].cancelled_at).toEqual(cancelledDate);
  });

  it('should verify data is persisted in database', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '555-1234'
      })
      .returning()
      .execute();

    // Create prerequisite data
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Tom',
        last_name: 'Brown',
        email: 'trainer@example.com',
        phone: '555-8888',
        specialization: 'Spin',
        bio: 'Spin class instructor',
        hourly_rate: '40.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Spin Class',
        description: 'High energy cycling',
        instructor_id: trainerResult[0].id,
        duration_minutes: 45,
        capacity: 25,
        difficulty_level: 'intermediate'
      })
      .returning()
      .execute();

    const scheduleResult = await db.insert(classSchedulesTable)
      .values({
        class_id: classResult[0].id,
        start_time: new Date('2024-01-22T07:00:00Z'),
        end_time: new Date('2024-01-22T07:45:00Z'),
        room: 'Spin Room',
        available_spots: 20,
        is_cancelled: false
      })
      .returning()
      .execute();

    await db.insert(classBookingsTable)
      .values({
        user_id: userResult[0].id,
        schedule_id: scheduleResult[0].id,
        booking_status: 'confirmed',
        booked_at: new Date('2024-01-15T10:00:00Z'),
        cancelled_at: null
      })
      .execute();

    const testInput: GetUserByIdInput = {
      user_id: userResult[0].id
    };

    // Call handler
    const handlerResult = await getUserClassBookings(testInput);

    // Verify in database directly
    const dbBookings = await db.select()
      .from(classBookingsTable)
      .where(eq(classBookingsTable.user_id, userResult[0].id))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbBookings).toHaveLength(1);
    expect(handlerResult[0].id).toEqual(dbBookings[0].id);
    expect(handlerResult[0].user_id).toEqual(dbBookings[0].user_id);
    expect(handlerResult[0].schedule_id).toEqual(dbBookings[0].schedule_id);
    expect(handlerResult[0].booking_status).toEqual(dbBookings[0].booking_status);
  });
});