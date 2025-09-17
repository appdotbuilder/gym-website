import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { trainersTable } from '../db/schema';
import { getTrainers } from '../handlers/get_trainers';
import { eq } from 'drizzle-orm';

// Test trainer data
const testTrainer1 = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@gym.com',
  phone: '555-0123',
  specialization: 'Weight Training',
  bio: 'Experienced weight training specialist',
  hourly_rate: 75.50,
  is_available: true,
  image_url: 'https://example.com/john.jpg'
};

const testTrainer2 = {
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane.smith@gym.com',
  phone: null,
  specialization: 'Yoga',
  bio: 'Certified yoga instructor',
  hourly_rate: 60.00,
  is_available: true,
  image_url: null
};

const unavailableTrainer = {
  first_name: 'Bob',
  last_name: 'Wilson',
  email: 'bob.wilson@gym.com',
  phone: '555-0456',
  specialization: 'Cardio',
  bio: 'Cardio training expert',
  hourly_rate: 65.00,
  is_available: false,
  image_url: null
};

describe('getTrainers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all available trainers', async () => {
    // Create test trainers
    await db.insert(trainersTable)
      .values([
        {
          ...testTrainer1,
          hourly_rate: testTrainer1.hourly_rate.toString()
        },
        {
          ...testTrainer2,
          hourly_rate: testTrainer2.hourly_rate.toString()
        }
      ])
      .execute();

    const result = await getTrainers();

    expect(result).toHaveLength(2);
    
    // Check first trainer
    const trainer1 = result.find(t => t.email === 'john.doe@gym.com');
    expect(trainer1).toBeDefined();
    expect(trainer1?.first_name).toEqual('John');
    expect(trainer1?.last_name).toEqual('Doe');
    expect(trainer1?.specialization).toEqual('Weight Training');
    expect(trainer1?.hourly_rate).toEqual(75.50);
    expect(typeof trainer1?.hourly_rate).toEqual('number');
    expect(trainer1?.is_available).toEqual(true);
    expect(trainer1?.id).toBeDefined();
    expect(trainer1?.created_at).toBeInstanceOf(Date);

    // Check second trainer
    const trainer2 = result.find(t => t.email === 'jane.smith@gym.com');
    expect(trainer2).toBeDefined();
    expect(trainer2?.first_name).toEqual('Jane');
    expect(trainer2?.hourly_rate).toEqual(60.00);
    expect(trainer2?.phone).toBeNull();
    expect(trainer2?.image_url).toBeNull();
  });

  it('should only return available trainers', async () => {
    // Create both available and unavailable trainers
    await db.insert(trainersTable)
      .values([
        {
          ...testTrainer1,
          hourly_rate: testTrainer1.hourly_rate.toString()
        },
        {
          ...unavailableTrainer,
          hourly_rate: unavailableTrainer.hourly_rate.toString()
        }
      ])
      .execute();

    const result = await getTrainers();

    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual('john.doe@gym.com');
    expect(result[0].is_available).toEqual(true);
    
    // Verify unavailable trainer is not included
    const unavailableIncluded = result.some(t => t.email === 'bob.wilson@gym.com');
    expect(unavailableIncluded).toEqual(false);
  });

  it('should return empty array when no available trainers exist', async () => {
    // Create only unavailable trainer
    await db.insert(trainersTable)
      .values({
        ...unavailableTrainer,
        hourly_rate: unavailableTrainer.hourly_rate.toString()
      })
      .execute();

    const result = await getTrainers();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when no trainers exist', async () => {
    const result = await getTrainers();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should save trainers correctly in database', async () => {
    // Create trainer through direct database insertion
    const insertResult = await db.insert(trainersTable)
      .values({
        ...testTrainer1,
        hourly_rate: testTrainer1.hourly_rate.toString()
      })
      .returning()
      .execute();

    const createdTrainer = insertResult[0];
    expect(createdTrainer.id).toBeDefined();

    // Verify trainer exists in database
    const dbTrainers = await db.select()
      .from(trainersTable)
      .where(eq(trainersTable.id, createdTrainer.id))
      .execute();

    expect(dbTrainers).toHaveLength(1);
    expect(dbTrainers[0].first_name).toEqual('John');
    expect(parseFloat(dbTrainers[0].hourly_rate)).toEqual(75.50);
    expect(dbTrainers[0].is_available).toEqual(true);
    expect(dbTrainers[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle numeric conversion correctly', async () => {
    // Create trainer with specific hourly rate
    await db.insert(trainersTable)
      .values({
        ...testTrainer1,
        hourly_rate: '123.45' // Insert as string
      })
      .execute();

    const result = await getTrainers();

    expect(result).toHaveLength(1);
    expect(result[0].hourly_rate).toEqual(123.45);
    expect(typeof result[0].hourly_rate).toEqual('number');
  });
});