import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { personalTrainingSessionsTable, usersTable, trainersTable } from '../db/schema';
import { type UpdatePersonalTrainingInput } from '../schema';
import { updatePersonalTraining } from '../handlers/update_personal_training';
import { eq, and } from 'drizzle-orm';

describe('updatePersonalTraining', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let trainerId: number;
  let sessionId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create another user for authorization tests
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create test trainer
    const trainerResult = await db.insert(trainersTable)
      .values({
        first_name: 'Test',
        last_name: 'Trainer',
        email: 'trainer@test.com',
        phone: null,
        specialization: 'Strength Training',
        bio: 'Test trainer bio',
        hourly_rate: '75.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();
    trainerId = trainerResult[0].id;

    // Create test personal training session
    const sessionResult = await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: userId,
        trainer_id: trainerId,
        session_date: new Date('2024-01-15'),
        start_time: '10:00',
        end_time: '11:00',
        status: 'scheduled',
        notes: 'Initial notes',
        price: '100.00'
      })
      .returning()
      .execute();
    sessionId = sessionResult[0].id;
  });

  it('should update session status successfully', async () => {
    const input: UpdatePersonalTrainingInput = {
      session_id: sessionId,
      user_id: userId,
      status: 'completed'
    };

    const result = await updatePersonalTraining(input);

    expect(result.id).toBe(sessionId);
    expect(result.user_id).toBe(userId);
    expect(result.trainer_id).toBe(trainerId);
    expect(result.status).toBe('completed');
    expect(result.notes).toBe('Initial notes'); // Should remain unchanged
    expect(typeof result.price).toBe('number');
    expect(result.price).toBe(100.00);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update session notes successfully', async () => {
    const input: UpdatePersonalTrainingInput = {
      session_id: sessionId,
      user_id: userId,
      notes: 'Updated training notes with progress details'
    };

    const result = await updatePersonalTraining(input);

    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('scheduled'); // Should remain unchanged
    expect(result.notes).toBe('Updated training notes with progress details');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both status and notes', async () => {
    const input: UpdatePersonalTrainingInput = {
      session_id: sessionId,
      user_id: userId,
      status: 'cancelled',
      notes: 'Client cancelled due to injury'
    };

    const result = await updatePersonalTraining(input);

    expect(result.status).toBe('cancelled');
    expect(result.notes).toBe('Client cancelled due to injury');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should clear notes when set to null', async () => {
    const input: UpdatePersonalTrainingInput = {
      session_id: sessionId,
      user_id: userId,
      notes: null
    };

    const result = await updatePersonalTraining(input);

    expect(result.notes).toBeNull();
    expect(result.status).toBe('scheduled'); // Should remain unchanged
  });

  it('should persist changes to database', async () => {
    const input: UpdatePersonalTrainingInput = {
      session_id: sessionId,
      user_id: userId,
      status: 'completed',
      notes: 'Great session, client showed improvement'
    };

    await updatePersonalTraining(input);

    // Verify changes were persisted
    const sessions = await db.select()
      .from(personalTrainingSessionsTable)
      .where(eq(personalTrainingSessionsTable.id, sessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe('completed');
    expect(sessions[0].notes).toBe('Great session, client showed improvement');
    expect(sessions[0].updated_at).toBeInstanceOf(Date);
    expect(parseFloat(sessions[0].price)).toBe(100.00);
  });

  it('should throw error when session does not exist', async () => {
    const input: UpdatePersonalTrainingInput = {
      session_id: 99999, // Non-existent session
      user_id: userId,
      status: 'completed'
    };

    await expect(updatePersonalTraining(input))
      .rejects
      .toThrow(/Personal training session not found or does not belong to user/i);
  });

  it('should throw error when user does not own the session', async () => {
    const input: UpdatePersonalTrainingInput = {
      session_id: sessionId,
      user_id: otherUserId, // Different user trying to update
      status: 'completed'
    };

    await expect(updatePersonalTraining(input))
      .rejects
      .toThrow(/Personal training session not found or does not belong to user/i);
  });

  it('should update with only partial data', async () => {
    const input: UpdatePersonalTrainingInput = {
      session_id: sessionId,
      user_id: userId
      // No status or notes provided
    };

    const result = await updatePersonalTraining(input);

    // Should still work, only updating the updated_at timestamp
    expect(result.id).toBe(sessionId);
    expect(result.status).toBe('scheduled'); // Original value
    expect(result.notes).toBe('Initial notes'); // Original value
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different status transitions correctly', async () => {
    // Test scheduled -> cancelled
    let input: UpdatePersonalTrainingInput = {
      session_id: sessionId,
      user_id: userId,
      status: 'cancelled'
    };

    let result = await updatePersonalTraining(input);
    expect(result.status).toBe('cancelled');

    // Test cancelled -> scheduled (rescheduled)
    input = {
      session_id: sessionId,
      user_id: userId,
      status: 'scheduled'
    };

    result = await updatePersonalTraining(input);
    expect(result.status).toBe('scheduled');

    // Test scheduled -> completed
    input = {
      session_id: sessionId,
      user_id: userId,
      status: 'completed'
    };

    result = await updatePersonalTraining(input);
    expect(result.status).toBe('completed');
  });
});