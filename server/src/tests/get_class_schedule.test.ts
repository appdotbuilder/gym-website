import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { classSchedulesTable, gymClassesTable, trainersTable } from '../db/schema';
import { type GetClassScheduleInput } from '../schema';
import { getClassSchedule } from '../handlers/get_class_schedule';

describe('getClassSchedule', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createPrerequisiteData = async () => {
    // Create a trainer first
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@gym.com',
        phone: '123-456-7890',
        specialization: 'Strength Training',
        bio: 'Experienced trainer',
        hourly_rate: '50.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    const trainerId = trainerResult[0].id;

    // Create a gym class
    const classResult = await db.insert(gymClassesTable)
      .values({
        name: 'Morning Yoga',
        description: 'Relaxing morning yoga session',
        instructor_id: trainerId,
        duration_minutes: 60,
        capacity: 20,
        difficulty_level: 'beginner'
      })
      .returning()
      .execute();

    return { trainerId, classId: classResult[0].id };
  };

  it('should return upcoming schedules when no date range provided', async () => {
    const { classId } = await createPrerequisiteData();

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create schedules: one in the past, one in the future
    await db.insert(classSchedulesTable)
      .values([
        {
          class_id: classId,
          start_time: yesterday,
          end_time: new Date(yesterday.getTime() + 60 * 60 * 1000), // +1 hour
          room: 'Room A',
          available_spots: 15,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: tomorrow,
          end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000), // +1 hour
          room: 'Room B',
          available_spots: 18,
          is_cancelled: false
        }
      ])
      .execute();

    const input: GetClassScheduleInput = {};
    const result = await getClassSchedule(input);

    // Should only return future schedules
    expect(result).toHaveLength(1);
    expect(result[0].room).toEqual('Room B');
    expect(result[0].available_spots).toEqual(18);
    expect(result[0].start_time).toBeInstanceOf(Date);
    expect(result[0].start_time.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should filter schedules by date_from', async () => {
    const { classId } = await createPrerequisiteData();

    const baseDate = new Date('2024-01-15T10:00:00Z');
    const beforeDate = new Date('2024-01-10T10:00:00Z');
    const afterDate = new Date('2024-01-20T10:00:00Z');

    // Create multiple schedules
    await db.insert(classSchedulesTable)
      .values([
        {
          class_id: classId,
          start_time: beforeDate,
          end_time: new Date(beforeDate.getTime() + 60 * 60 * 1000),
          room: 'Room A',
          available_spots: 10,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: baseDate,
          end_time: new Date(baseDate.getTime() + 60 * 60 * 1000),
          room: 'Room B',
          available_spots: 15,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: afterDate,
          end_time: new Date(afterDate.getTime() + 60 * 60 * 1000),
          room: 'Room C',
          available_spots: 20,
          is_cancelled: false
        }
      ])
      .execute();

    const input: GetClassScheduleInput = {
      date_from: baseDate
    };
    const result = await getClassSchedule(input);

    // Should return schedules from baseDate onwards
    expect(result).toHaveLength(2);
    expect(result[0].room).toEqual('Room B');
    expect(result[1].room).toEqual('Room C');
    
    // Verify ordering by start_time
    expect(result[0].start_time.getTime()).toBeLessThanOrEqual(result[1].start_time.getTime());
  });

  it('should filter schedules by date_to', async () => {
    const { classId } = await createPrerequisiteData();

    const baseDate = new Date('2024-01-15T10:00:00Z');
    const beforeDate = new Date('2024-01-10T10:00:00Z');
    const afterDate = new Date('2024-01-20T10:00:00Z');

    // Create multiple schedules
    await db.insert(classSchedulesTable)
      .values([
        {
          class_id: classId,
          start_time: beforeDate,
          end_time: new Date(beforeDate.getTime() + 60 * 60 * 1000),
          room: 'Room A',
          available_spots: 10,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: baseDate,
          end_time: new Date(baseDate.getTime() + 60 * 60 * 1000),
          room: 'Room B',
          available_spots: 15,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: afterDate,
          end_time: new Date(afterDate.getTime() + 60 * 60 * 1000),
          room: 'Room C',
          available_spots: 20,
          is_cancelled: false
        }
      ])
      .execute();

    const input: GetClassScheduleInput = {
      date_to: baseDate
    };
    const result = await getClassSchedule(input);

    // Should return schedules up to and including baseDate
    expect(result).toHaveLength(2);
    expect(result[0].room).toEqual('Room A');
    expect(result[1].room).toEqual('Room B');
  });

  it('should filter schedules by date range', async () => {
    const { classId } = await createPrerequisiteData();

    const startDate = new Date('2024-01-15T00:00:00Z');
    const endDate = new Date('2024-01-17T00:00:00Z');
    const beforeDate = new Date('2024-01-10T10:00:00Z');
    const withinDate = new Date('2024-01-16T10:00:00Z');
    const afterDate = new Date('2024-01-20T10:00:00Z');

    // Create schedules before, within, and after the range
    await db.insert(classSchedulesTable)
      .values([
        {
          class_id: classId,
          start_time: beforeDate,
          end_time: new Date(beforeDate.getTime() + 60 * 60 * 1000),
          room: 'Room A',
          available_spots: 10,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: withinDate,
          end_time: new Date(withinDate.getTime() + 60 * 60 * 1000),
          room: 'Room B',
          available_spots: 15,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: afterDate,
          end_time: new Date(afterDate.getTime() + 60 * 60 * 1000),
          room: 'Room C',
          available_spots: 20,
          is_cancelled: false
        }
      ])
      .execute();

    const input: GetClassScheduleInput = {
      date_from: startDate,
      date_to: endDate
    };
    const result = await getClassSchedule(input);

    // Should only return schedules within the date range
    expect(result).toHaveLength(1);
    expect(result[0].room).toEqual('Room B');
    expect(result[0].start_time.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
    expect(result[0].start_time.getTime()).toBeLessThanOrEqual(endDate.getTime());
  });

  it('should include schedules on the same day as date_to', async () => {
    const { classId } = await createPrerequisiteData();

    const targetDate = new Date('2024-01-15T00:00:00Z');
    const morningSchedule = new Date('2024-01-15T09:00:00Z');
    const eveningSchedule = new Date('2024-01-15T20:00:00Z');
    const nextDaySchedule = new Date('2024-01-16T09:00:00Z');

    await db.insert(classSchedulesTable)
      .values([
        {
          class_id: classId,
          start_time: morningSchedule,
          end_time: new Date(morningSchedule.getTime() + 60 * 60 * 1000),
          room: 'Room A',
          available_spots: 10,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: eveningSchedule,
          end_time: new Date(eveningSchedule.getTime() + 60 * 60 * 1000),
          room: 'Room B',
          available_spots: 15,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: nextDaySchedule,
          end_time: new Date(nextDaySchedule.getTime() + 60 * 60 * 1000),
          room: 'Room C',
          available_spots: 20,
          is_cancelled: false
        }
      ])
      .execute();

    const input: GetClassScheduleInput = {
      date_to: targetDate
    };
    const result = await getClassSchedule(input);

    // Should include both morning and evening schedules on the target date
    expect(result).toHaveLength(2);
    expect(result[0].room).toEqual('Room A');
    expect(result[1].room).toEqual('Room B');
  });

  it('should return empty array when no schedules match criteria', async () => {
    await createPrerequisiteData();

    const futureDate = new Date('2025-01-01T00:00:00Z');
    const input: GetClassScheduleInput = {
      date_from: futureDate
    };
    const result = await getClassSchedule(input);

    expect(result).toHaveLength(0);
  });

  it('should return schedules ordered by start_time ascending', async () => {
    const { classId } = await createPrerequisiteData();

    const firstTime = new Date('2024-01-15T09:00:00Z');
    const secondTime = new Date('2024-01-15T14:00:00Z');
    const thirdTime = new Date('2024-01-15T19:00:00Z');

    // Insert in reverse chronological order to test sorting
    await db.insert(classSchedulesTable)
      .values([
        {
          class_id: classId,
          start_time: thirdTime,
          end_time: new Date(thirdTime.getTime() + 60 * 60 * 1000),
          room: 'Room C',
          available_spots: 20,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: firstTime,
          end_time: new Date(firstTime.getTime() + 60 * 60 * 1000),
          room: 'Room A',
          available_spots: 10,
          is_cancelled: false
        },
        {
          class_id: classId,
          start_time: secondTime,
          end_time: new Date(secondTime.getTime() + 60 * 60 * 1000),
          room: 'Room B',
          available_spots: 15,
          is_cancelled: false
        }
      ])
      .execute();

    const input: GetClassScheduleInput = {
      date_from: new Date('2024-01-15T00:00:00Z'),
      date_to: new Date('2024-01-15T23:59:59Z')
    };
    const result = await getClassSchedule(input);

    expect(result).toHaveLength(3);
    // Should be ordered by start_time ascending
    expect(result[0].room).toEqual('Room A'); // 09:00
    expect(result[1].room).toEqual('Room B'); // 14:00
    expect(result[2].room).toEqual('Room C'); // 19:00
    
    // Verify actual time ordering
    expect(result[0].start_time.getTime()).toBeLessThan(result[1].start_time.getTime());
    expect(result[1].start_time.getTime()).toBeLessThan(result[2].start_time.getTime());
  });

  it('should include all required fields in returned schedules', async () => {
    const { classId } = await createPrerequisiteData();

    const scheduleTime = new Date();
    scheduleTime.setDate(scheduleTime.getDate() + 1); // Tomorrow

    await db.insert(classSchedulesTable)
      .values({
        class_id: classId,
        start_time: scheduleTime,
        end_time: new Date(scheduleTime.getTime() + 60 * 60 * 1000),
        room: 'Room A',
        available_spots: 15,
        is_cancelled: true
      })
      .execute();

    const input: GetClassScheduleInput = {};
    const result = await getClassSchedule(input);

    expect(result).toHaveLength(1);
    const schedule = result[0];
    
    // Verify all required fields are present and have correct types
    expect(typeof schedule.id).toBe('number');
    expect(typeof schedule.class_id).toBe('number');
    expect(schedule.start_time).toBeInstanceOf(Date);
    expect(schedule.end_time).toBeInstanceOf(Date);
    expect(typeof schedule.room).toBe('string');
    expect(typeof schedule.available_spots).toBe('number');
    expect(typeof schedule.is_cancelled).toBe('boolean');
    expect(schedule.created_at).toBeInstanceOf(Date);
    
    // Verify specific values
    expect(schedule.class_id).toEqual(classId);
    expect(schedule.room).toEqual('Room A');
    expect(schedule.available_spots).toEqual(15);
    expect(schedule.is_cancelled).toEqual(true);
  });
});