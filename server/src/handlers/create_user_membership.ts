import { db } from '../db';
import { userMembershipsTable, membershipTiersTable, usersTable } from '../db/schema';
import { type CreateUserMembershipInput, type UserMembership } from '../schema';
import { eq } from 'drizzle-orm';

export const createUserMembership = async (input: CreateUserMembershipInput): Promise<UserMembership> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Verify membership tier exists and get duration
    const membershipTier = await db.select()
      .from(membershipTiersTable)
      .where(eq(membershipTiersTable.id, input.membership_tier_id))
      .execute();

    if (membershipTier.length === 0) {
      throw new Error(`Membership tier with id ${input.membership_tier_id} not found`);
    }

    if (!membershipTier[0].is_active) {
      throw new Error(`Membership tier with id ${input.membership_tier_id} is not active`);
    }

    // Calculate end date based on membership tier duration
    const endDate = new Date(input.start_date);
    endDate.setMonth(endDate.getMonth() + membershipTier[0].duration_months);

    // Insert user membership record
    const result = await db.insert(userMembershipsTable)
      .values({
        user_id: input.user_id,
        membership_tier_id: input.membership_tier_id,
        start_date: input.start_date,
        end_date: endDate
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User membership creation failed:', error);
    throw error;
  }
};