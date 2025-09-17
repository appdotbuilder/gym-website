import { db } from '../db';
import { trainersTable, personalTrainingSessionsTable } from '../db/schema';
import { type GetTrainerAvailabilityInput } from '../schema';
import { eq, and, between } from 'drizzle-orm';

export async function getTrainerAvailability(input: GetTrainerAvailabilityInput): Promise<string[]> {
  try {
    // First verify trainer exists and is available
    const trainer = await db.select()
      .from(trainersTable)
      .where(eq(trainersTable.id, input.trainer_id))
      .execute();

    if (trainer.length === 0) {
      throw new Error('Trainer not found');
    }

    if (!trainer[0].is_available) {
      throw new Error('Trainer is not available');
    }

    // Get start and end of the requested date for filtering sessions
    const startOfDay = new Date(input.date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(input.date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all personal training sessions for this trainer on the specified date
    const existingSessions = await db.select()
      .from(personalTrainingSessionsTable)
      .where(
        and(
          eq(personalTrainingSessionsTable.trainer_id, input.trainer_id),
          between(personalTrainingSessionsTable.session_date, startOfDay, endOfDay),
          eq(personalTrainingSessionsTable.status, 'scheduled')
        )
      )
      .execute();

    // Define business hours (9 AM to 8 PM with hourly slots)
    const businessStart = 9; // 9 AM
    const businessEnd = 20; // 8 PM (last slot starts at 8 PM)
    const availableSlots: string[] = [];

    // Generate all possible hourly slots
    for (let hour = businessStart; hour <= businessEnd; hour++) {
      const timeSlot = hour.toString().padStart(2, '0') + ':00';
      
      // Check if this slot conflicts with any existing session
      const isSlotTaken = existingSessions.some(session => {
        const sessionStart = session.start_time;
        const sessionEnd = session.end_time;
        
        // Convert hour to HH:00 format for comparison
        const slotTime = timeSlot;
        
        // Check if the slot overlaps with the session
        // A slot is taken if it starts within the session time range
        return slotTime >= sessionStart && slotTime < sessionEnd;
      });

      if (!isSlotTaken) {
        availableSlots.push(timeSlot);
      }
    }

    return availableSlots;
  } catch (error) {
    console.error('Get trainer availability failed:', error);
    throw error;
  }
}