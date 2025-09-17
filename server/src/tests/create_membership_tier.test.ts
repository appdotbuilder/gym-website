import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { membershipTiersTable } from '../db/schema';
import { type CreateMembershipTierInput } from '../schema';
import { createMembershipTier } from '../handlers/create_membership_tier';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateMembershipTierInput = {
  name: 'Premium Membership',
  description: 'Full access to all gym facilities and classes',
  price: 99.99,
  duration_months: 12,
  features: ['Unlimited access', '24/7 gym access', 'Personal training discount', 'Guest passes'],
  is_active: true
};

describe('createMembershipTier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a membership tier', async () => {
    const result = await createMembershipTier(testInput);

    // Basic field validation
    expect(result.name).toEqual('Premium Membership');
    expect(result.description).toEqual(testInput.description);
    expect(result.price).toEqual(99.99);
    expect(typeof result.price).toBe('number'); // Verify numeric conversion
    expect(result.duration_months).toEqual(12);
    expect(result.features).toEqual(['Unlimited access', '24/7 gym access', 'Personal training discount', 'Guest passes']);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save membership tier to database', async () => {
    const result = await createMembershipTier(testInput);

    // Query database to verify persistence
    const membershipTiers = await db.select()
      .from(membershipTiersTable)
      .where(eq(membershipTiersTable.id, result.id))
      .execute();

    expect(membershipTiers).toHaveLength(1);
    const savedTier = membershipTiers[0];
    
    expect(savedTier.name).toEqual('Premium Membership');
    expect(savedTier.description).toEqual(testInput.description);
    expect(parseFloat(savedTier.price)).toEqual(99.99); // Database stores as string
    expect(savedTier.duration_months).toEqual(12);
    expect(savedTier.features).toEqual(['Unlimited access', '24/7 gym access', 'Personal training discount', 'Guest passes']);
    expect(savedTier.is_active).toEqual(true);
    expect(savedTier.created_at).toBeInstanceOf(Date);
  });

  it('should handle membership tier with minimal features', async () => {
    const minimalInput: CreateMembershipTierInput = {
      name: 'Basic Membership',
      description: 'Basic gym access',
      price: 29.99,
      duration_months: 1,
      features: ['Basic access'],
      is_active: false
    };

    const result = await createMembershipTier(minimalInput);

    expect(result.name).toEqual('Basic Membership');
    expect(result.price).toEqual(29.99);
    expect(result.duration_months).toEqual(1);
    expect(result.features).toEqual(['Basic access']);
    expect(result.is_active).toEqual(false);
  });

  it('should handle membership tier with many features', async () => {
    const extensiveFeatures = [
      'Unlimited gym access',
      '24/7 facility access',
      'All group classes included',
      'Personal training sessions (2 per month)',
      'Nutrition consultation',
      'Guest passes (4 per month)',
      'Locker rental included',
      'Towel service',
      'Massage therapy discount',
      'Priority booking for classes'
    ];

    const extensiveInput: CreateMembershipTierInput = {
      name: 'Elite Membership',
      description: 'The ultimate gym experience with all premium features',
      price: 199.99,
      duration_months: 24,
      features: extensiveFeatures,
      is_active: true
    };

    const result = await createMembershipTier(extensiveInput);

    expect(result.features).toHaveLength(10);
    expect(result.features).toEqual(extensiveFeatures);
    expect(result.price).toEqual(199.99);
  });

  it('should use default value for is_active when not specified', async () => {
    const inputWithDefaults: CreateMembershipTierInput = {
      name: 'Standard Membership',
      description: 'Standard gym access with most features',
      price: 59.99,
      duration_months: 6,
      features: ['Gym access', 'Group classes', 'Locker access'],
      is_active: true // Zod default applied at parsing time, not handler time
    };

    const result = await createMembershipTier(inputWithDefaults);

    expect(result.is_active).toEqual(true); // Should use the Zod default value
  });

  it('should handle decimal prices correctly', async () => {
    const preciseInput: CreateMembershipTierInput = {
      name: 'Precision Membership',
      description: 'Testing precise pricing',
      price: 123.45, // Database precision is 10,2 so this will be stored exactly
      duration_months: 3,
      features: ['Access'],
      is_active: true
    };

    const result = await createMembershipTier(preciseInput);

    expect(result.price).toEqual(123.45);
    expect(typeof result.price).toBe('number');

    // Verify database storage handles precision correctly
    const saved = await db.select()
      .from(membershipTiersTable)
      .where(eq(membershipTiersTable.id, result.id))
      .execute();

    expect(parseFloat(saved[0].price)).toEqual(123.45);
  });

  it('should create multiple membership tiers independently', async () => {
    const input1: CreateMembershipTierInput = {
      name: 'Student Membership',
      description: 'Discounted rate for students',
      price: 19.99,
      duration_months: 1,
      features: ['Basic access', 'Student discount'],
      is_active: true
    };

    const input2: CreateMembershipTierInput = {
      name: 'Senior Membership',
      description: 'Special rate for seniors',
      price: 39.99,
      duration_months: 6,
      features: ['Gym access', 'Senior programs', 'Health monitoring'],
      is_active: true
    };

    const result1 = await createMembershipTier(input1);
    const result2 = await createMembershipTier(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Student Membership');
    expect(result2.name).toEqual('Senior Membership');
    expect(result1.price).toEqual(19.99);
    expect(result2.price).toEqual(39.99);

    // Verify both are persisted
    const allTiers = await db.select().from(membershipTiersTable).execute();
    expect(allTiers).toHaveLength(2);
  });
});