import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, trainersTable, personalTrainingSessionsTable } from '../db/schema';
import { type BookPersonalTrainingInput } from '../schema';
import { bookPersonalTraining } from '../handlers/book_personal_training';
import { eq, and } from 'drizzle-orm';

describe('bookPersonalTraining', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTrainerId: number;
  let unavailableTrainerId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: '555-0123'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create available trainer
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'John',
        last_name: 'Trainer',
        email: 'john.trainer@example.com',
        phone: '555-0456',
        specialization: 'Weight Training',
        bio: 'Experienced weight trainer',
        hourly_rate: '75.00',
        is_available: true
      })
      .returning()
      .execute();
    
    testTrainerId = trainerResult[0].id;

    // Create unavailable trainer
    const unavailableTrainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Jane',
        last_name: 'Unavailable',
        email: 'jane.unavailable@example.com',
        phone: '555-0789',
        specialization: 'Cardio',
        bio: 'Cardio specialist',
        hourly_rate: '80.00',
        is_available: false
      })
      .returning()
      .execute();
    
    unavailableTrainerId = unavailableTrainerResult[0].id;
  });

  const testInput: BookPersonalTrainingInput = {
    user_id: 0, // Will be set in tests
    trainer_id: 0, // Will be set in tests
    session_date: new Date('2024-02-15T00:00:00.000Z'),
    start_time: '10:00',
    end_time: '11:00',
    notes: 'First session'
  };

  it('should successfully book a personal training session', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId
    };

    const result = await bookPersonalTraining(input);

    // Verify return values
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.trainer_id).toEqual(testTrainerId);
    expect(result.session_date).toEqual(input.session_date);
    expect(result.start_time).toEqual('10:00');
    expect(result.end_time).toEqual('11:00');
    expect(result.status).toEqual('scheduled');
    expect(result.notes).toEqual('First session');
    expect(result.price).toEqual(75.00); // 1 hour * $75/hour
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should calculate correct price for different session durations', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId,
      start_time: '09:00',
      end_time: '10:30' // 1.5 hours
    };

    const result = await bookPersonalTraining(input);
    expect(result.price).toEqual(112.50); // 1.5 hours * $75/hour
  });

  it('should save session to database', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId
    };

    const result = await bookPersonalTraining(input);

    // Verify database entry
    const sessions = await db.select()
      .from(personalTrainingSessionsTable)
      .where(eq(personalTrainingSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].user_id).toEqual(testUserId);
    expect(sessions[0].trainer_id).toEqual(testTrainerId);
    expect(sessions[0].status).toEqual('scheduled');
    expect(parseFloat(sessions[0].price)).toEqual(75.00);
  });

  it('should handle sessions without notes', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId,
      notes: undefined
    };

    const result = await bookPersonalTraining(input);
    expect(result.notes).toBeNull();
  });

  it('should throw error when user does not exist', async () => {
    const input = {
      ...testInput,
      user_id: 99999, // Non-existent user
      trainer_id: testTrainerId
    };

    await expect(bookPersonalTraining(input))
      .rejects
      .toThrow(/User with id 99999 not found/i);
  });

  it('should throw error when trainer does not exist', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: 99999 // Non-existent trainer
    };

    await expect(bookPersonalTraining(input))
      .rejects
      .toThrow(/Trainer with id 99999 not found/i);
  });

  it('should throw error when trainer is not available', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: unavailableTrainerId
    };

    await expect(bookPersonalTraining(input))
      .rejects
      .toThrow(/Trainer with id \d+ is not available/i);
  });

  it('should throw error when trainer has conflicting session', async () => {
    // Create existing session
    await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: testUserId,
        trainer_id: testTrainerId,
        session_date: new Date('2024-02-15T00:00:00.000Z'),
        start_time: '09:30',
        end_time: '10:30',
        status: 'scheduled',
        price: '75.00'
      })
      .execute();

    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId,
      start_time: '10:00', // Overlaps with existing 09:30-10:30 session
      end_time: '11:00'
    };

    await expect(bookPersonalTraining(input))
      .rejects
      .toThrow(/Trainer is not available at the requested time/i);
  });

  it('should allow back-to-back sessions without overlap', async () => {
    // Create existing session ending at 10:00
    await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: testUserId,
        trainer_id: testTrainerId,
        session_date: new Date('2024-02-15T00:00:00.000Z'),
        start_time: '09:00',
        end_time: '10:00',
        status: 'scheduled',
        price: '75.00'
      })
      .execute();

    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId,
      start_time: '10:00', // Starts exactly when previous ends
      end_time: '11:00'
    };

    const result = await bookPersonalTraining(input);
    expect(result.start_time).toEqual('10:00');
    expect(result.end_time).toEqual('11:00');
  });

  it('should ignore cancelled sessions when checking conflicts', async () => {
    // Create cancelled session at same time
    await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: testUserId,
        trainer_id: testTrainerId,
        session_date: new Date('2024-02-15T00:00:00.000Z'),
        start_time: '10:00',
        end_time: '11:00',
        status: 'cancelled',
        price: '75.00'
      })
      .execute();

    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId
    };

    const result = await bookPersonalTraining(input);
    expect(result.start_time).toEqual('10:00');
    expect(result.end_time).toEqual('11:00');
  });

  it('should throw error when end time is before start time', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId,
      start_time: '11:00',
      end_time: '10:00' // End before start
    };

    await expect(bookPersonalTraining(input))
      .rejects
      .toThrow(/End time must be after start time/i);
  });

  it('should handle cross-day time calculations correctly', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trainer_id: testTrainerId,
      start_time: '23:30',
      end_time: '00:30' // This would be invalid (next day)
    };

    // This should fail because end time appears before start time in same day
    await expect(bookPersonalTraining(input))
      .rejects
      .toThrow(/End time must be after start time/i);
  });
});