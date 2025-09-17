import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { trainersTable, personalTrainingSessionsTable, usersTable } from '../db/schema';
import { type GetTrainerAvailabilityInput } from '../schema';
import { getTrainerAvailability } from '../handlers/get_trainer_availability';
import { eq } from 'drizzle-orm';

describe('getTrainerAvailability', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testDate = new Date('2024-01-15');

  let testTrainer: any;
  let testUser: any;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test trainer
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'John',
        last_name: 'Trainer',
        email: 'trainer@example.com',
        specialization: 'Weight Training',
        bio: 'Experienced trainer',
        hourly_rate: '75.00',
        is_available: true
      })
      .returning()
      .execute();
    testTrainer = trainerResult[0];
  });

  it('should return all available slots for trainer with no sessions', async () => {
    const input: GetTrainerAvailabilityInput = {
      trainer_id: testTrainer.id,
      date: testDate
    };

    const result = await getTrainerAvailability(input);

    // Should have all business hours available (9 AM to 8 PM = 12 slots)
    expect(result).toHaveLength(12);
    expect(result).toContain('09:00');
    expect(result).toContain('12:00');
    expect(result).toContain('15:00');
    expect(result).toContain('20:00');
    
    // Should be sorted
    expect(result[0]).toBe('09:00');
    expect(result[result.length - 1]).toBe('20:00');
  });

  it('should exclude slots with existing sessions', async () => {
    // Create existing session from 10:00 to 11:00
    await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: testUser.id,
        trainer_id: testTrainer.id,
        session_date: testDate,
        start_time: '10:00',
        end_time: '11:00',
        status: 'scheduled',
        price: '75.00'
      })
      .execute();

    const input: GetTrainerAvailabilityInput = {
      trainer_id: testTrainer.id,
      date: testDate
    };

    const result = await getTrainerAvailability(input);

    // Should not include 10:00 slot
    expect(result).not.toContain('10:00');
    // Should still include 9:00 and 11:00
    expect(result).toContain('09:00');
    expect(result).toContain('11:00');
    expect(result).toHaveLength(11); // One less than full availability
  });

  it('should exclude multiple booked slots', async () => {
    // Create multiple existing sessions
    await db.insert(personalTrainingSessionsTable)
      .values([
        {
          user_id: testUser.id,
          trainer_id: testTrainer.id,
          session_date: testDate,
          start_time: '09:00',
          end_time: '10:00',
          status: 'scheduled',
          price: '75.00'
        },
        {
          user_id: testUser.id,
          trainer_id: testTrainer.id,
          session_date: testDate,
          start_time: '14:00',
          end_time: '15:00',
          status: 'scheduled',
          price: '75.00'
        },
        {
          user_id: testUser.id,
          trainer_id: testTrainer.id,
          session_date: testDate,
          start_time: '18:00',
          end_time: '19:00',
          status: 'scheduled',
          price: '75.00'
        }
      ])
      .execute();

    const input: GetTrainerAvailabilityInput = {
      trainer_id: testTrainer.id,
      date: testDate
    };

    const result = await getTrainerAvailability(input);

    // Should exclude 09:00, 14:00, and 18:00
    expect(result).not.toContain('09:00');
    expect(result).not.toContain('14:00');
    expect(result).not.toContain('18:00');
    
    // Should still include other slots
    expect(result).toContain('10:00');
    expect(result).toContain('13:00');
    expect(result).toContain('17:00');
    expect(result).toContain('19:00');
    expect(result).toHaveLength(9); // 12 - 3 booked slots
  });

  it('should handle multi-hour sessions correctly', async () => {
    // Create a 2-hour session from 13:00 to 15:00
    await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: testUser.id,
        trainer_id: testTrainer.id,
        session_date: testDate,
        start_time: '13:00',
        end_time: '15:00',
        status: 'scheduled',
        price: '150.00'
      })
      .execute();

    const input: GetTrainerAvailabilityInput = {
      trainer_id: testTrainer.id,
      date: testDate
    };

    const result = await getTrainerAvailability(input);

    // Should exclude both 13:00 and 14:00 slots
    expect(result).not.toContain('13:00');
    expect(result).not.toContain('14:00');
    
    // Should include 12:00 and 15:00 (session ends at 15:00, so 15:00 slot is available)
    expect(result).toContain('12:00');
    expect(result).toContain('15:00');
    expect(result).toHaveLength(10); // 12 - 2 booked slots
  });

  it('should only include scheduled sessions', async () => {
    // Create sessions with different statuses
    await db.insert(personalTrainingSessionsTable)
      .values([
        {
          user_id: testUser.id,
          trainer_id: testTrainer.id,
          session_date: testDate,
          start_time: '10:00',
          end_time: '11:00',
          status: 'scheduled',
          price: '75.00'
        },
        {
          user_id: testUser.id,
          trainer_id: testTrainer.id,
          session_date: testDate,
          start_time: '11:00',
          end_time: '12:00',
          status: 'cancelled',
          price: '75.00'
        },
        {
          user_id: testUser.id,
          trainer_id: testTrainer.id,
          session_date: testDate,
          start_time: '12:00',
          end_time: '13:00',
          status: 'completed',
          price: '75.00'
        }
      ])
      .execute();

    const input: GetTrainerAvailabilityInput = {
      trainer_id: testTrainer.id,
      date: testDate
    };

    const result = await getTrainerAvailability(input);

    // Should only exclude 10:00 (scheduled session)
    expect(result).not.toContain('10:00');
    // Should include 11:00 and 12:00 (cancelled and completed sessions don't block availability)
    expect(result).toContain('11:00');
    expect(result).toContain('12:00');
    expect(result).toHaveLength(11); // Only 1 slot blocked
  });

  it('should only show availability for the specific date', async () => {
    const otherDate = new Date('2024-01-16');
    
    // Create session on different date
    await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: testUser.id,
        trainer_id: testTrainer.id,
        session_date: otherDate,
        start_time: '10:00',
        end_time: '11:00',
        status: 'scheduled',
        price: '75.00'
      })
      .execute();

    const input: GetTrainerAvailabilityInput = {
      trainer_id: testTrainer.id,
      date: testDate // Different date from the session
    };

    const result = await getTrainerAvailability(input);

    // Should include all slots since session is on different date
    expect(result).toContain('10:00');
    expect(result).toHaveLength(12); // Full availability
  });

  it('should throw error for non-existent trainer', async () => {
    const input: GetTrainerAvailabilityInput = {
      trainer_id: 99999,
      date: testDate
    };

    expect(getTrainerAvailability(input)).rejects.toThrow(/trainer not found/i);
  });

  it('should throw error for unavailable trainer', async () => {
    // Update trainer to be unavailable
    await db.update(trainersTable)
      .set({ is_available: false })
      .where(eq(trainersTable.id, testTrainer.id))
      .execute();

    const input: GetTrainerAvailabilityInput = {
      trainer_id: testTrainer.id,
      date: testDate
    };

    expect(getTrainerAvailability(input)).rejects.toThrow(/trainer is not available/i);
  });
});