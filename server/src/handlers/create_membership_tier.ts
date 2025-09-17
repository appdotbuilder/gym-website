import { db } from '../db';
import { membershipTiersTable } from '../db/schema';
import { type CreateMembershipTierInput, type MembershipTier } from '../schema';

export const createMembershipTier = async (input: CreateMembershipTierInput): Promise<MembershipTier> => {
  try {
    // Insert membership tier record
    const result = await db.insert(membershipTiersTable)
      .values({
        name: input.name,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        duration_months: input.duration_months, // Integer column - no conversion needed
        features: input.features, // Array stored as JSON - Drizzle handles conversion
        is_active: input.is_active // Boolean column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const membershipTier = result[0];
    return {
      ...membershipTier,
      price: parseFloat(membershipTier.price), // Convert string back to number
      features: membershipTier.features as string[] // Type assertion for JSON field
    };
  } catch (error) {
    console.error('Membership tier creation failed:', error);
    throw error;
  }
};