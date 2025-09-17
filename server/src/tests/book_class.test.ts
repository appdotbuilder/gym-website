import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  trainersTable, 
  gymClassesTable, 
  classSchedulesTable, 
  classBookingsTable 
} from '../db/schema';
import { type BookClassInput } from '../schema';
import { bookClass } from '../handlers/book_class';
import { eq, and } from 'drizzle-orm';

describe('bookClass', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let trainerId: number;
  let classId: number;
  let scheduleId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '123-456-7890'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test trainer
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'trainer@example.com',
        phone: '987-654-3210',
        specialization: 'Yoga',
        bio: 'Experienced yoga instructor',
        hourly_rate: '50.00',
        is_available: true
      })
      .returning()
      .execute();
    trainerId = trainerResult[0].id;

    // Create test gym class
    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Morning Yoga',
        description: 'Relaxing morning yoga session',
        instructor_id: trainerId,
        duration_minutes: 60,
        capacity: 10,
        difficulty_level: 'beginner'
      })
      .returning()
      .execute();
    classId = classResult[0].id;

    // Create test class schedule
    const scheduleResult = await db.insert(classSchedulesTable)
      .values({
        class_id: classId,
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z'),
        room: 'Studio A',
        available_spots: 5,
        is_cancelled: false
      })
      .returning()
      .execute();
    scheduleId = scheduleResult[0].id;
  });

  it('should successfully book a class when spots are available', async () => {
    const input: BookClassInput = {
      user_id: userId,
      schedule_id: scheduleId
    };

    const result = await bookClass(input);

    expect(result.user_id).toEqual(userId);
    expect(result.schedule_id).toEqual(scheduleId);
    expect(result.booking_status).toEqual('confirmed');
    expect(result.id).toBeDefined();
    expect(result.booked_at).toBeInstanceOf(Date);
    expect(result.cancelled_at).toBeNull();
  });

  it('should decrease available spots when booking is confirmed', async () => {
    const input: BookClassInput = {
      user_id: userId,
      schedule_id: scheduleId
    };

    await bookClass(input);

    // Check that available spots decreased
    const updatedSchedule = await db.select()
      .from(classSchedulesTable)
      .where(eq(classSchedulesTable.id, scheduleId))
      .execute();

    expect(updatedSchedule[0].available_spots).toEqual(4);
  });

  it('should save booking to database', async () => {
    const input: BookClassInput = {
      user_id: userId,
      schedule_id: scheduleId
    };

    const result = await bookClass(input);

    const bookings = await db.select()
      .from(classBookingsTable)
      .where(eq(classBookingsTable.id, result.id))
      .execute();

    expect(bookings).toHaveLength(1);
    expect(bookings[0].user_id).toEqual(userId);
    expect(bookings[0].schedule_id).toEqual(scheduleId);
    expect(bookings[0].booking_status).toEqual('confirmed');
  });

  it('should put user on waitlist when no spots available', async () => {
    // Update schedule to have 0 available spots
    await db.update(classSchedulesTable)
      .set({ available_spots: 0 })
      .where(eq(classSchedulesTable.id, scheduleId))
      .execute();

    const input: BookClassInput = {
      user_id: userId,
      schedule_id: scheduleId
    };

    const result = await bookClass(input);

    expect(result.booking_status).toEqual('waitlist');
  });

  it('should not decrease spots when booking goes to waitlist', async () => {
    // Update schedule to have 0 available spots
    await db.update(classSchedulesTable)
      .set({ available_spots: 0 })
      .where(eq(classSchedulesTable.id, scheduleId))
      .execute();

    const input: BookClassInput = {
      user_id: userId,
      schedule_id: scheduleId
    };

    await bookClass(input);

    // Check that available spots remain unchanged
    const updatedSchedule = await db.select()
      .from(classSchedulesTable)
      .where(eq(classSchedulesTable.id, scheduleId))
      .execute();

    expect(updatedSchedule[0].available_spots).toEqual(0);
  });

  it('should throw error for non-existent user', async () => {
    const input: BookClassInput = {
      user_id: 999999,
      schedule_id: scheduleId
    };

    await expect(bookClass(input)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should throw error for non-existent schedule', async () => {
    const input: BookClassInput = {
      user_id: userId,
      schedule_id: 999999
    };

    await expect(bookClass(input)).rejects.toThrow(/Class schedule with id 999999 not found/i);
  });

  it('should throw error for cancelled class', async () => {
    // Cancel the class
    await db.update(classSchedulesTable)
      .set({ is_cancelled: true })
      .where(eq(classSchedulesTable.id, scheduleId))
      .execute();

    const input: BookClassInput = {
      user_id: userId,
      schedule_id: scheduleId
    };

    await expect(bookClass(input)).rejects.toThrow(/Class schedule .* not found or is cancelled/i);
  });

  it('should throw error when user already has confirmed booking', async () => {
    // Create initial booking
    await db.insert(classBookingsTable)
      .values({
        user_id: userId,
        schedule_id: scheduleId,
        booking_status: 'confirmed'
      })
      .execute();

    const input: BookClassInput = {
      user_id: userId,
      schedule_id: scheduleId
    };

    await expect(bookClass(input)).rejects.toThrow(/User already has a confirmed booking/i);
  });

  it('should allow booking when user has cancelled booking for same schedule', async () => {
    // Create cancelled booking
    await db.insert(classBookingsTable)
      .values({
        user_id: userId,
        schedule_id: scheduleId,
        booking_status: 'cancelled'
      })
      .execute();

    const input: BookClassInput = {
      user_id: userId,
      schedule_id: scheduleId
    };

    const result = await bookClass(input);

    expect(result.booking_status).toEqual('confirmed');
  });

  it('should handle multiple concurrent bookings for last spot', async () => {
    // Update schedule to have only 1 spot
    await db.update(classSchedulesTable)
      .set({ available_spots: 1 })
      .where(eq(classSchedulesTable.id, scheduleId))
      .execute();

    // Create another user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '555-123-4567'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    const input1: BookClassInput = { user_id: userId, schedule_id: scheduleId };
    const input2: BookClassInput = { user_id: user2Id, schedule_id: scheduleId };

    // First booking should be confirmed
    const result1 = await bookClass(input1);
    expect(result1.booking_status).toEqual('confirmed');

    // Second booking should go to waitlist
    const result2 = await bookClass(input2);
    expect(result2.booking_status).toEqual('waitlist');

    // Verify final state
    const finalSchedule = await db.select()
      .from(classSchedulesTable)
      .where(eq(classSchedulesTable.id, scheduleId))
      .execute();
    
    expect(finalSchedule[0].available_spots).toEqual(0);
  });
});