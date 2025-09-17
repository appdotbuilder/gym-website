import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { trainersTable, gymClassesTable } from '../db/schema';
import { getGymClasses } from '../handlers/get_gym_classes';
import { eq } from 'drizzle-orm';

// Test data
const testTrainer = {
  first_name: 'John',
  last_name: 'Smith',
  email: 'john.smith@gym.com',
  phone: '555-0123',
  specialization: 'Strength Training',
  bio: 'Experienced fitness trainer',
  hourly_rate: '75.00',
  is_available: true,
  image_url: null
};

const testGymClass = {
  name: 'Morning Yoga',
  description: 'Relaxing morning yoga session',
  duration_minutes: 60,
  capacity: 20,
  difficulty_level: 'beginner' as const
};

describe('getGymClasses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no gym classes exist', async () => {
    const result = await getGymClasses();
    expect(result).toEqual([]);
  });

  it('should return all gym classes', async () => {
    // Create trainer first (required for foreign key)
    const trainerResult = await db.insert(trainersTable)
      .values(testTrainer)
      .returning()
      .execute();

    const trainerId = trainerResult[0].id;

    // Create gym class
    const classResult = await db.insert(gymClassesTable)
      .values({
        ...testGymClass,
        instructor_id: trainerId
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getGymClasses();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: classResult[0].id,
      name: 'Morning Yoga',
      description: 'Relaxing morning yoga session',
      instructor_id: trainerId,
      duration_minutes: 60,
      capacity: 20,
      difficulty_level: 'beginner'
    });
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple gym classes', async () => {
    // Create trainer
    const trainerResult = await db.insert(trainersTable)
      .values(testTrainer)
      .returning()
      .execute();

    const trainerId = trainerResult[0].id;

    // Create multiple gym classes
    await db.insert(gymClassesTable)
      .values([
        {
          ...testGymClass,
          instructor_id: trainerId,
          name: 'Morning Yoga'
        },
        {
          ...testGymClass,
          instructor_id: trainerId,
          name: 'HIIT Training',
          description: 'High intensity interval training',
          duration_minutes: 45,
          capacity: 15,
          difficulty_level: 'advanced' as const
        },
        {
          ...testGymClass,
          instructor_id: trainerId,
          name: 'Pilates',
          description: 'Core strengthening pilates class',
          duration_minutes: 50,
          capacity: 12,
          difficulty_level: 'intermediate' as const
        }
      ])
      .execute();

    const result = await getGymClasses();

    expect(result).toHaveLength(3);
    expect(result.map(c => c.name)).toContain('Morning Yoga');
    expect(result.map(c => c.name)).toContain('HIIT Training');
    expect(result.map(c => c.name)).toContain('Pilates');

    // Verify different difficulty levels
    const difficulties = result.map(c => c.difficulty_level);
    expect(difficulties).toContain('beginner');
    expect(difficulties).toContain('intermediate');
    expect(difficulties).toContain('advanced');
  });

  it('should verify gym classes are saved to database correctly', async () => {
    // Create trainer
    const trainerResult = await db.insert(trainersTable)
      .values(testTrainer)
      .returning()
      .execute();

    const trainerId = trainerResult[0].id;

    // Create gym class
    await db.insert(gymClassesTable)
      .values({
        ...testGymClass,
        instructor_id: trainerId
      })
      .execute();

    // Verify data was saved correctly in database
    const savedClasses = await db.select()
      .from(gymClassesTable)
      .where(eq(gymClassesTable.name, 'Morning Yoga'))
      .execute();

    expect(savedClasses).toHaveLength(1);
    expect(savedClasses[0].name).toEqual('Morning Yoga');
    expect(savedClasses[0].instructor_id).toEqual(trainerId);
    expect(savedClasses[0].duration_minutes).toEqual(60);
    expect(savedClasses[0].capacity).toEqual(20);
    expect(savedClasses[0].difficulty_level).toEqual('beginner');
    expect(savedClasses[0].created_at).toBeInstanceOf(Date);

    // Test handler returns the same data
    const result = await getGymClasses();
    expect(result[0].name).toEqual(savedClasses[0].name);
    expect(result[0].instructor_id).toEqual(savedClasses[0].instructor_id);
  });

  it('should handle classes with different trainers', async () => {
    // Create multiple trainers
    const trainer1Result = await db.insert(trainersTable)
      .values({
        ...testTrainer,
        email: 'trainer1@gym.com'
      })
      .returning()
      .execute();

    const trainer2Result = await db.insert(trainersTable)
      .values({
        ...testTrainer,
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'trainer2@gym.com',
        specialization: 'Cardio Training'
      })
      .returning()
      .execute();

    // Create classes for different trainers
    await db.insert(gymClassesTable)
      .values([
        {
          ...testGymClass,
          instructor_id: trainer1Result[0].id,
          name: 'Yoga Class'
        },
        {
          ...testGymClass,
          instructor_id: trainer2Result[0].id,
          name: 'Cardio Blast',
          description: 'High energy cardio workout'
        }
      ])
      .execute();

    const result = await getGymClasses();

    expect(result).toHaveLength(2);
    expect(result.find(c => c.name === 'Yoga Class')?.instructor_id).toEqual(trainer1Result[0].id);
    expect(result.find(c => c.name === 'Cardio Blast')?.instructor_id).toEqual(trainer2Result[0].id);
  });
});