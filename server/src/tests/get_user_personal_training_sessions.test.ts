import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, trainersTable, personalTrainingSessionsTable } from '../db/schema';
import { type GetUserByIdInput } from '../schema';
import { getUserPersonalTrainingSessions } from '../handlers/get_user_personal_training_sessions';

// Test input
const testInput: GetUserByIdInput = {
  user_id: 1
};

describe('getUserPersonalTrainingSessions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return personal training sessions for a specific user', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    // Create test trainer
    const [trainer] = await db.insert(trainersTable)
      .values({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'trainer@example.com',
        phone: '+1987654321',
        specialization: 'Weight Training',
        bio: 'Experienced trainer',
        hourly_rate: '75.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    // Create test personal training sessions
    const sessionDate = new Date('2024-01-15T10:00:00Z');
    const sessions = await db.insert(personalTrainingSessionsTable)
      .values([
        {
          user_id: user.id,
          trainer_id: trainer.id,
          session_date: sessionDate,
          start_time: '10:00',
          end_time: '11:00',
          status: 'scheduled',
          notes: 'First session',
          price: '75.00'
        },
        {
          user_id: user.id,
          trainer_id: trainer.id,
          session_date: new Date('2024-01-22T10:00:00Z'),
          start_time: '10:00',
          end_time: '11:00',
          status: 'completed',
          notes: 'Second session',
          price: '75.00'
        }
      ])
      .returning()
      .execute();

    const result = await getUserPersonalTrainingSessions({ user_id: user.id });

    expect(result).toHaveLength(2);
    
    // Check first session
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].trainer_id).toEqual(trainer.id);
    expect(result[0].start_time).toEqual('10:00');
    expect(result[0].end_time).toEqual('11:00');
    expect(result[0].status).toEqual('scheduled');
    expect(result[0].notes).toEqual('First session');
    expect(result[0].price).toEqual(75.00);
    expect(typeof result[0].price).toEqual('number');
    expect(result[0].session_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();

    // Check second session
    expect(result[1].user_id).toEqual(user.id);
    expect(result[1].trainer_id).toEqual(trainer.id);
    expect(result[1].status).toEqual('completed');
    expect(result[1].notes).toEqual('Second session');
    expect(result[1].price).toEqual(75.00);
    expect(typeof result[1].price).toEqual('number');
  });

  it('should return empty array for user with no personal training sessions', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    const result = await getUserPersonalTrainingSessions({ user_id: user.id });

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return only sessions for the specified user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890'
        },
        {
          email: 'user2@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '+1987654321'
        }
      ])
      .returning()
      .execute();

    // Create test trainer
    const [trainer] = await db.insert(trainersTable)
      .values({
        first_name: 'Mike',
        last_name: 'Johnson',
        email: 'trainer@example.com',
        phone: '+1555666777',
        specialization: 'Cardio',
        bio: 'Cardio specialist',
        hourly_rate: '60.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    // Create sessions for both users
    await db.insert(personalTrainingSessionsTable)
      .values([
        {
          user_id: users[0].id,
          trainer_id: trainer.id,
          session_date: new Date('2024-01-15T10:00:00Z'),
          start_time: '10:00',
          end_time: '11:00',
          status: 'scheduled',
          notes: 'User 1 session',
          price: '60.00'
        },
        {
          user_id: users[1].id,
          trainer_id: trainer.id,
          session_date: new Date('2024-01-15T11:00:00Z'),
          start_time: '11:00',
          end_time: '12:00',
          status: 'scheduled',
          notes: 'User 2 session',
          price: '60.00'
        }
      ])
      .returning()
      .execute();

    const result = await getUserPersonalTrainingSessions({ user_id: users[0].id });

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(users[0].id);
    expect(result[0].notes).toEqual('User 1 session');
    expect(result[0].price).toEqual(60.00);
  });

  it('should handle sessions with different statuses correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    // Create test trainer
    const [trainer] = await db.insert(trainersTable)
      .values({
        first_name: 'Sarah',
        last_name: 'Wilson',
        email: 'trainer@example.com',
        phone: '+1444555666',
        specialization: 'Yoga',
        bio: 'Yoga instructor',
        hourly_rate: '50.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    // Create sessions with different statuses
    await db.insert(personalTrainingSessionsTable)
      .values([
        {
          user_id: user.id,
          trainer_id: trainer.id,
          session_date: new Date('2024-01-15T10:00:00Z'),
          start_time: '10:00',
          end_time: '11:00',
          status: 'scheduled',
          notes: 'Upcoming session',
          price: '50.00'
        },
        {
          user_id: user.id,
          trainer_id: trainer.id,
          session_date: new Date('2024-01-08T10:00:00Z'),
          start_time: '10:00',
          end_time: '11:00',
          status: 'completed',
          notes: 'Past session',
          price: '50.00'
        },
        {
          user_id: user.id,
          trainer_id: trainer.id,
          session_date: new Date('2024-01-20T10:00:00Z'),
          start_time: '10:00',
          end_time: '11:00',
          status: 'cancelled',
          notes: 'Cancelled session',
          price: '50.00'
        }
      ])
      .returning()
      .execute();

    const result = await getUserPersonalTrainingSessions({ user_id: user.id });

    expect(result).toHaveLength(3);
    
    const statuses = result.map(session => session.status);
    expect(statuses).toContain('scheduled');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('cancelled');

    // All sessions should have correct price conversion
    result.forEach(session => {
      expect(session.price).toEqual(50.00);
      expect(typeof session.price).toEqual('number');
    });
  });

  it('should handle sessions with null notes', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    // Create test trainer
    const [trainer] = await db.insert(trainersTable)
      .values({
        first_name: 'Alex',
        last_name: 'Brown',
        email: 'trainer@example.com',
        phone: '+1333444555',
        specialization: 'Strength Training',
        bio: 'Strength coach',
        hourly_rate: '80.00',
        is_available: true,
        image_url: null
      })
      .returning()
      .execute();

    // Create session with null notes
    const [session] = await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: user.id,
        trainer_id: trainer.id,
        session_date: new Date('2024-01-15T10:00:00Z'),
        start_time: '10:00',
        end_time: '11:00',
        status: 'scheduled',
        notes: null, // Explicitly null
        price: '80.00'
      })
      .returning()
      .execute();

    const result = await getUserPersonalTrainingSessions({ user_id: user.id });

    expect(result).toHaveLength(1);
    expect(result[0].notes).toBeNull();
    expect(result[0].price).toEqual(80.00);
    expect(typeof result[0].price).toEqual('number');
  });
});