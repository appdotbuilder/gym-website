import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, membershipTiersTable, userMembershipsTable } from '../db/schema';
import { type GetUserByIdInput } from '../schema';
import { getUserMembership } from '../handlers/get_user_membership';

describe('getUserMembership', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active membership for user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test membership tier
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Premium',
        description: 'Premium membership',
        price: '99.99',
        duration_months: 12,
        features: ['Pool access', 'Group classes'],
        is_active: true
      })
      .returning()
      .execute();
    
    const tierID = tierResult[0].id;

    // Create active user membership
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    
    await db.insert(userMembershipsTable)
      .values({
        user_id: userId,
        membership_tier_id: tierID,
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      })
      .execute();

    const input: GetUserByIdInput = {
      user_id: userId
    };

    const result = await getUserMembership(input);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.membership_tier_id).toEqual(tierID);
    expect(result!.start_date).toEqual(startDate);
    expect(result!.end_date).toEqual(endDate);
    expect(result!.status).toEqual('active');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user has no active membership', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    const input: GetUserByIdInput = {
      user_id: userId
    };

    const result = await getUserMembership(input);

    expect(result).toBeNull();
  });

  it('should return null when user has only expired memberships', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test membership tier
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Basic',
        description: 'Basic membership',
        price: '49.99',
        duration_months: 6,
        features: ['Gym access'],
        is_active: true
      })
      .returning()
      .execute();
    
    const tierID = tierResult[0].id;

    // Create expired user membership
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-06-30');
    
    await db.insert(userMembershipsTable)
      .values({
        user_id: userId,
        membership_tier_id: tierID,
        start_date: startDate,
        end_date: endDate,
        status: 'expired'
      })
      .execute();

    const input: GetUserByIdInput = {
      user_id: userId
    };

    const result = await getUserMembership(input);

    expect(result).toBeNull();
  });

  it('should return most recent active membership when user has multiple', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test membership tiers
    const tierResult1 = await db.insert(membershipTiersTable)
      .values({
        name: 'Basic',
        description: 'Basic membership',
        price: '49.99',
        duration_months: 6,
        features: ['Gym access'],
        is_active: true
      })
      .returning()
      .execute();
    
    const tierResult2 = await db.insert(membershipTiersTable)
      .values({
        name: 'Premium',
        description: 'Premium membership',
        price: '99.99',
        duration_months: 12,
        features: ['Pool access', 'Group classes'],
        is_active: true
      })
      .returning()
      .execute();
    
    const tierID1 = tierResult1[0].id;
    const tierID2 = tierResult2[0].id;

    // Create first active membership (older)
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps
    await db.insert(userMembershipsTable)
      .values({
        user_id: userId,
        membership_tier_id: tierID1,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-06-30'),
        status: 'active'
      })
      .execute();

    // Create second active membership (newer)
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps
    await db.insert(userMembershipsTable)
      .values({
        user_id: userId,
        membership_tier_id: tierID2,
        start_date: new Date('2024-07-01'),
        end_date: new Date('2024-12-31'),
        status: 'active'
      })
      .execute();

    const input: GetUserByIdInput = {
      user_id: userId
    };

    const result = await getUserMembership(input);

    expect(result).not.toBeNull();
    expect(result!.membership_tier_id).toEqual(tierID2); // Should return the more recent one
    expect(result!.start_date).toEqual(new Date('2024-07-01'));
    expect(result!.status).toEqual('active');
  });

  it('should return null for non-existent user', async () => {
    const input: GetUserByIdInput = {
      user_id: 9999 // Non-existent user ID
    };

    const result = await getUserMembership(input);

    expect(result).toBeNull();
  });

  it('should ignore cancelled memberships', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: null
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test membership tier
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Basic',
        description: 'Basic membership',
        price: '49.99',
        duration_months: 6,
        features: ['Gym access'],
        is_active: true
      })
      .returning()
      .execute();
    
    const tierID = tierResult[0].id;

    // Create cancelled user membership
    await db.insert(userMembershipsTable)
      .values({
        user_id: userId,
        membership_tier_id: tierID,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-06-30'),
        status: 'cancelled'
      })
      .execute();

    const input: GetUserByIdInput = {
      user_id: userId
    };

    const result = await getUserMembership(input);

    expect(result).toBeNull();
  });
});