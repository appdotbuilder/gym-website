import { db } from '../db';
import { userMembershipsTable } from '../db/schema';
import { type GetUserByIdInput, type UserMembership } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getUserMembership(input: GetUserByIdInput): Promise<UserMembership | null> {
  try {
    // Query for the user's most recent active membership
    const result = await db.select()
      .from(userMembershipsTable)
      .where(
        and(
          eq(userMembershipsTable.user_id, input.user_id),
          eq(userMembershipsTable.status, 'active')
        )
      )
      .orderBy(desc(userMembershipsTable.created_at))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const membership = result[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...membership,
      // No numeric fields in this table that need conversion
    };
  } catch (error) {
    console.error('Failed to get user membership:', error);
    throw error;
  }
}