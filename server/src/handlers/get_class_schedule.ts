import { db } from '../db';
import { classSchedulesTable } from '../db/schema';
import { type GetClassScheduleInput, type ClassSchedule } from '../schema';
import { gte, lte, and, asc, SQL } from 'drizzle-orm';

export const getClassSchedule = async (input: GetClassScheduleInput): Promise<ClassSchedule[]> => {
  try {
    // Build conditions array for date filtering
    const conditions: SQL<unknown>[] = [];

    // If no date range is provided, default to upcoming schedules (from now)
    if (!input.date_from && !input.date_to) {
      const now = new Date();
      conditions.push(gte(classSchedulesTable.start_time, now));
    } else {
      // Apply date filters if provided
      if (input.date_from) {
        conditions.push(gte(classSchedulesTable.start_time, input.date_from));
      }
      
      if (input.date_to) {
        // Set end of day for date_to to include all schedules on that date
        const endOfDay = new Date(input.date_to);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(classSchedulesTable.start_time, endOfDay));
      }
    }

    // Build and execute the query in one chain
    const baseQuery = db.select().from(classSchedulesTable);
    
    const results = conditions.length > 0
      ? await baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(asc(classSchedulesTable.start_time))
          .execute()
      : await baseQuery
          .orderBy(asc(classSchedulesTable.start_time))
          .execute();

    // Return the results - all fields are already in the correct format
    return results;
  } catch (error) {
    console.error('Failed to fetch class schedule:', error);
    throw error;
  }
};