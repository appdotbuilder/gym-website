import { db } from '../db';
import { gymInfoTable } from '../db/schema';
import { type GymInfo } from '../schema';

export const getGymInfo = async (): Promise<GymInfo | null> => {
  try {
    // Query the gym_info table - should only have one record
    const results = await db.select()
      .from(gymInfoTable)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const gymInfo = results[0];
    
    // Return the gym info with proper type conversion
    return {
      ...gymInfo,
      // operating_hours is stored as JSONB and should already be parsed
      operating_hours: gymInfo.operating_hours as {
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
        sunday: string;
      }
    };
  } catch (error) {
    console.error('Failed to fetch gym info:', error);
    throw error;
  }
};