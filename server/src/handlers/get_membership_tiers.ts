import { db } from '../db';
import { membershipTiersTable } from '../db/schema';
import { type MembershipTier } from '../schema';
import { desc } from 'drizzle-orm';

export const getMembershipTiers = async (): Promise<MembershipTier[]> => {
  try {
    // Fetch all membership tiers, ordered by creation date (newest first)
    const results = await db.select()
      .from(membershipTiersTable)
      .orderBy(desc(membershipTiersTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(tier => ({
      ...tier,
      price: parseFloat(tier.price), // Convert string back to number
      features: tier.features as string[] // Type assertion for JSONB field
    }));
  } catch (error) {
    console.error('Failed to fetch membership tiers:', error);
    throw error;
  }
};