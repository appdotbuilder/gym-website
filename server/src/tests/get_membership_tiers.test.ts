import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { membershipTiersTable } from '../db/schema';
import { type CreateMembershipTierInput } from '../schema';
import { getMembershipTiers } from '../handlers/get_membership_tiers';

// Test data for membership tiers
const testTier1: CreateMembershipTierInput = {
  name: 'Basic',
  description: 'Basic membership with gym access',
  price: 29.99,
  duration_months: 1,
  features: ['Gym Access', 'Locker Room'],
  is_active: true
};

const testTier2: CreateMembershipTierInput = {
  name: 'Premium',
  description: 'Premium membership with all features',
  price: 79.99,
  duration_months: 3,
  features: ['Gym Access', 'Group Classes', 'Personal Training', 'Locker Room'],
  is_active: true
};

const testTier3: CreateMembershipTierInput = {
  name: 'VIP',
  description: 'VIP membership with exclusive access',
  price: 149.99,
  duration_months: 6,
  features: ['Gym Access', 'Group Classes', 'Personal Training', 'Locker Room', 'Spa Access'],
  is_active: false
};

describe('getMembershipTiers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no membership tiers exist', async () => {
    const result = await getMembershipTiers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all membership tiers with correct data types', async () => {
    // Create test membership tiers
    await db.insert(membershipTiersTable)
      .values([
        {
          ...testTier1,
          price: testTier1.price.toString(),
          features: JSON.stringify(testTier1.features)
        },
        {
          ...testTier2,
          price: testTier2.price.toString(),
          features: JSON.stringify(testTier2.features)
        }
      ])
      .execute();

    const result = await getMembershipTiers();

    expect(result).toHaveLength(2);

    // Verify first tier
    const basicTier = result.find(tier => tier.name === 'Basic');
    expect(basicTier).toBeDefined();
    expect(basicTier!.name).toBe('Basic');
    expect(basicTier!.description).toBe('Basic membership with gym access');
    expect(typeof basicTier!.price).toBe('number');
    expect(basicTier!.price).toBe(29.99);
    expect(basicTier!.duration_months).toBe(1);
    expect(Array.isArray(basicTier!.features)).toBe(true);
    expect(basicTier!.features).toEqual(['Gym Access', 'Locker Room']);
    expect(basicTier!.is_active).toBe(true);
    expect(basicTier!.id).toBeDefined();
    expect(basicTier!.created_at).toBeInstanceOf(Date);

    // Verify second tier
    const premiumTier = result.find(tier => tier.name === 'Premium');
    expect(premiumTier).toBeDefined();
    expect(premiumTier!.price).toBe(79.99);
    expect(premiumTier!.features).toHaveLength(4);
    expect(premiumTier!.features).toContain('Personal Training');
  });

  it('should return membership tiers ordered by creation date (newest first)', async () => {
    // Insert tiers with slight delay to ensure different timestamps
    await db.insert(membershipTiersTable)
      .values({
        ...testTier1,
        price: testTier1.price.toString(),
        features: JSON.stringify(testTier1.features)
      })
      .execute();

    // Small delay to ensure different creation times
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(membershipTiersTable)
      .values({
        ...testTier2,
        price: testTier2.price.toString(),
        features: JSON.stringify(testTier2.features)
      })
      .execute();

    const result = await getMembershipTiers();

    expect(result).toHaveLength(2);
    // The most recently created should be first (Premium)
    expect(result[0].name).toBe('Premium');
    expect(result[1].name).toBe('Basic');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should include both active and inactive membership tiers', async () => {
    // Create mix of active and inactive tiers
    await db.insert(membershipTiersTable)
      .values([
        {
          ...testTier2,
          price: testTier2.price.toString(),
          features: JSON.stringify(testTier2.features)
        },
        {
          ...testTier3,
          price: testTier3.price.toString(),
          features: JSON.stringify(testTier3.features)
        }
      ])
      .execute();

    const result = await getMembershipTiers();

    expect(result).toHaveLength(2);
    
    const activeTier = result.find(tier => tier.is_active === true);
    const inactiveTier = result.find(tier => tier.is_active === false);
    
    expect(activeTier).toBeDefined();
    expect(inactiveTier).toBeDefined();
    expect(activeTier!.name).toBe('Premium');
    expect(inactiveTier!.name).toBe('VIP');
  });

  it('should handle complex features arrays correctly', async () => {
    const complexTier: CreateMembershipTierInput = {
      name: 'Enterprise',
      description: 'Enterprise membership',
      price: 299.99,
      duration_months: 12,
      features: [
        'Unlimited Gym Access',
        '24/7 Access',
        'Personal Training Sessions (10/month)',
        'Group Classes',
        'Nutritional Consulting',
        'Spa & Wellness Center',
        'Guest Passes (5/month)'
      ],
      is_active: true
    };

    await db.insert(membershipTiersTable)
      .values({
        ...complexTier,
        price: complexTier.price.toString(),
        features: JSON.stringify(complexTier.features)
      })
      .execute();

    const result = await getMembershipTiers();

    expect(result).toHaveLength(1);
    const tier = result[0];
    
    expect(tier.features).toHaveLength(7);
    expect(tier.features).toContain('Personal Training Sessions (10/month)');
    expect(tier.features).toContain('Guest Passes (5/month)');
    expect(Array.isArray(tier.features)).toBe(true);
  });

  it('should handle decimal prices correctly', async () => {
    const precisionTier: CreateMembershipTierInput = {
      name: 'Precision Test',
      description: 'Testing decimal precision',
      price: 99.95,
      duration_months: 1,
      features: ['Test Feature'],
      is_active: true
    };

    await db.insert(membershipTiersTable)
      .values({
        ...precisionTier,
        price: precisionTier.price.toString(),
        features: JSON.stringify(precisionTier.features)
      })
      .execute();

    const result = await getMembershipTiers();

    expect(result).toHaveLength(1);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].price).toBe(99.95);
  });
});