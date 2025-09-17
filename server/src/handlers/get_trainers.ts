import { db } from '../db';
import { trainersTable } from '../db/schema';
import { type Trainer } from '../schema';
import { eq } from 'drizzle-orm';

export const getTrainers = async (): Promise<Trainer[]> => {
  try {
    // Fetch all available trainers from the database
    const results = await db.select()
      .from(trainersTable)
      .where(eq(trainersTable.is_available, true))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(trainer => ({
      ...trainer,
      hourly_rate: parseFloat(trainer.hourly_rate) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch trainers:', error);
    throw error;
  }
};