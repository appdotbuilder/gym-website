import { db } from '../db';
import { usersTable, trainersTable, personalTrainingSessionsTable } from '../db/schema';
import { type BookPersonalTrainingInput, type PersonalTrainingSession } from '../schema';
import { eq, and } from 'drizzle-orm';

export const bookPersonalTraining = async (input: BookPersonalTrainingInput): Promise<PersonalTrainingSession> => {
  try {
    // Verify user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Verify trainer exists and get hourly rate
    const trainer = await db.select()
      .from(trainersTable)
      .where(eq(trainersTable.id, input.trainer_id))
      .execute();
    
    if (trainer.length === 0) {
      throw new Error(`Trainer with id ${input.trainer_id} not found`);
    }

    if (!trainer[0].is_available) {
      throw new Error(`Trainer with id ${input.trainer_id} is not available`);
    }

    // Check for conflicting sessions on the same date and time
    const conflictingSessions = await db.select()
      .from(personalTrainingSessionsTable)
      .where(
        and(
          eq(personalTrainingSessionsTable.trainer_id, input.trainer_id),
          eq(personalTrainingSessionsTable.session_date, input.session_date),
          eq(personalTrainingSessionsTable.status, 'scheduled')
        )
      )
      .execute();

    // Check for time overlap
    const hasConflict = conflictingSessions.some(session => {
      const existingStart = session.start_time;
      const existingEnd = session.end_time;
      const requestedStart = input.start_time;
      const requestedEnd = input.end_time;
      
      // Check if the times overlap
      return (requestedStart < existingEnd && requestedEnd > existingStart);
    });

    if (hasConflict) {
      throw new Error('Trainer is not available at the requested time');
    }

    // Calculate session duration and price
    const [startHour, startMinute] = input.start_time.split(':').map(Number);
    const [endHour, endMinute] = input.end_time.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const durationHours = (endTotalMinutes - startTotalMinutes) / 60;
    
    if (durationHours <= 0) {
      throw new Error('End time must be after start time');
    }

    const hourlyRate = parseFloat(trainer[0].hourly_rate);
    const sessionPrice = hourlyRate * durationHours;

    // Create the personal training session
    const result = await db.insert(personalTrainingSessionsTable)
      .values({
        user_id: input.user_id,
        trainer_id: input.trainer_id,
        session_date: input.session_date,
        start_time: input.start_time,
        end_time: input.end_time,
        status: 'scheduled',
        notes: input.notes || null,
        price: sessionPrice.toString() // Convert to string for numeric column
      })
      .returning()
      .execute();

    const session = result[0];
    return {
      ...session,
      price: parseFloat(session.price) // Convert back to number
    };
  } catch (error) {
    console.error('Personal training booking failed:', error);
    throw error;
  }
};