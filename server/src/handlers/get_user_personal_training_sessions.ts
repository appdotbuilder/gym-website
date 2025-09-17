import { db } from '../db';
import { personalTrainingSessionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetUserByIdInput, type PersonalTrainingSession } from '../schema';

export async function getUserPersonalTrainingSessions(input: GetUserByIdInput): Promise<PersonalTrainingSession[]> {
  try {
    // Query personal training sessions for the specific user
    const results = await db.select()
      .from(personalTrainingSessionsTable)
      .where(eq(personalTrainingSessionsTable.user_id, input.user_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(session => ({
      ...session,
      price: parseFloat(session.price) // Convert numeric column to number
    }));
  } catch (error) {
    console.error('Failed to get user personal training sessions:', error);
    throw error;
  }
}