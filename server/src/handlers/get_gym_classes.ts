import { db } from '../db';
import { gymClassesTable, trainersTable } from '../db/schema';
import { type GymClass } from '../schema';
import { eq } from 'drizzle-orm';

export const getGymClasses = async (): Promise<GymClass[]> => {
  try {
    // Query gym classes with instructor information joined
    const results = await db.select()
      .from(gymClassesTable)
      .innerJoin(trainersTable, eq(gymClassesTable.instructor_id, trainersTable.id))
      .execute();

    // Transform results to match GymClass schema
    return results.map(result => ({
      id: result.gym_classes.id,
      name: result.gym_classes.name,
      description: result.gym_classes.description,
      instructor_id: result.gym_classes.instructor_id,
      duration_minutes: result.gym_classes.duration_minutes,
      capacity: result.gym_classes.capacity,
      difficulty_level: result.gym_classes.difficulty_level,
      created_at: result.gym_classes.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch gym classes:', error);
    throw error;
  }
};