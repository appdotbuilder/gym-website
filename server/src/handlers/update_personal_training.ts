import { db } from '../db';
import { personalTrainingSessionsTable } from '../db/schema';
import { type UpdatePersonalTrainingInput, type PersonalTrainingSession } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updatePersonalTraining = async (input: UpdatePersonalTrainingInput): Promise<PersonalTrainingSession> => {
  try {
    // First verify that the session exists and belongs to the user
    const existingSession = await db.select()
      .from(personalTrainingSessionsTable)
      .where(
        and(
          eq(personalTrainingSessionsTable.id, input.session_id),
          eq(personalTrainingSessionsTable.user_id, input.user_id)
        )
      )
      .limit(1)
      .execute();

    if (existingSession.length === 0) {
      throw new Error('Personal training session not found or does not belong to user');
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Update the session
    const result = await db.update(personalTrainingSessionsTable)
      .set(updateData)
      .where(
        and(
          eq(personalTrainingSessionsTable.id, input.session_id),
          eq(personalTrainingSessionsTable.user_id, input.user_id)
        )
      )
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedSession = result[0];
    return {
      ...updatedSession,
      price: parseFloat(updatedSession.price)
    };
  } catch (error) {
    console.error('Personal training session update failed:', error);
    throw error;
  }
};