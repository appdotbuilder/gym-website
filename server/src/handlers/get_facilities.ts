import { db } from '../db';
import { facilitiesTable } from '../db/schema';
import { type Facility } from '../schema';
import { eq } from 'drizzle-orm';

export const getFacilities = async (): Promise<Facility[]> => {
  try {
    // Fetch all active facilities from the database
    const results = await db.select()
      .from(facilitiesTable)
      .where(eq(facilitiesTable.is_active, true))
      .execute();

    // Return the facilities with proper type conversion
    return results.map(facility => ({
      ...facility,
      // All fields are already in correct format, no numeric conversions needed
      // as facilities table doesn't have numeric columns that need parsing
    }));
  } catch (error) {
    console.error('Fetching facilities failed:', error);
    throw error;
  }
};