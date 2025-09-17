import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, membershipTiersTable, userMembershipsTable } from '../db/schema';
import { type CreateUserMembershipInput } from '../schema';
import { createUserMembership } from '../handlers/create_user_membership';
import { eq } from 'drizzle-orm';

describe('createUserMembership', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user membership with correct end date', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    // Create test membership tier (6 months duration)
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Premium',
        description: 'Premium membership',
        price: '99.99',
        duration_months: 6,
        features: ['Feature 1', 'Feature 2'],
        is_active: true
      })
      .returning()
      .execute();

    const startDate = new Date('2024-01-01');
    const input: CreateUserMembershipInput = {
      user_id: userResult[0].id,
      membership_tier_id: tierResult[0].id,
      start_date: startDate
    };

    const result = await createUserMembership(input);

    // Verify basic fields
    expect(result.user_id).toEqual(userResult[0].id);
    expect(result.membership_tier_id).toEqual(tierResult[0].id);
    expect(result.start_date).toEqual(startDate);
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify end date calculation (6 months from start date)
    const expectedEndDate = new Date('2024-07-01');
    expect(result.end_date).toEqual(expectedEndDate);
  });

  it('should save user membership to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: null
      })
      .returning()
      .execute();

    // Create test membership tier (12 months duration)
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Basic',
        description: 'Basic membership',
        price: '49.99',
        duration_months: 12,
        features: ['Basic feature'],
        is_active: true
      })
      .returning()
      .execute();

    const startDate = new Date('2024-03-15');
    const input: CreateUserMembershipInput = {
      user_id: userResult[0].id,
      membership_tier_id: tierResult[0].id,
      start_date: startDate
    };

    const result = await createUserMembership(input);

    // Verify record was saved to database
    const memberships = await db.select()
      .from(userMembershipsTable)
      .where(eq(userMembershipsTable.id, result.id))
      .execute();

    expect(memberships).toHaveLength(1);
    expect(memberships[0].user_id).toEqual(userResult[0].id);
    expect(memberships[0].membership_tier_id).toEqual(tierResult[0].id);
    expect(memberships[0].start_date).toEqual(startDate);
    expect(memberships[0].status).toEqual('active');

    // Verify end date calculation (12 months from March 15, 2024)
    const expectedEndDate = new Date('2025-03-15');
    expect(memberships[0].end_date).toEqual(expectedEndDate);
  });

  it('should throw error when user does not exist', async () => {
    // Create test membership tier
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Premium',
        description: 'Premium membership',
        price: '99.99',
        duration_months: 6,
        features: ['Feature 1'],
        is_active: true
      })
      .returning()
      .execute();

    const input: CreateUserMembershipInput = {
      user_id: 999, // Non-existent user ID
      membership_tier_id: tierResult[0].id,
      start_date: new Date('2024-01-01')
    };

    await expect(createUserMembership(input)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should throw error when membership tier does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    const input: CreateUserMembershipInput = {
      user_id: userResult[0].id,
      membership_tier_id: 999, // Non-existent membership tier ID
      start_date: new Date('2024-01-01')
    };

    await expect(createUserMembership(input)).rejects.toThrow(/Membership tier with id 999 not found/i);
  });

  it('should throw error when membership tier is not active', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    // Create inactive membership tier
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Inactive Tier',
        description: 'Inactive membership tier',
        price: '99.99',
        duration_months: 6,
        features: ['Feature 1'],
        is_active: false // Not active
      })
      .returning()
      .execute();

    const input: CreateUserMembershipInput = {
      user_id: userResult[0].id,
      membership_tier_id: tierResult[0].id,
      start_date: new Date('2024-01-01')
    };

    await expect(createUserMembership(input)).rejects.toThrow(/Membership tier with id .* is not active/i);
  });

  it('should handle different duration calculations correctly', async () => {
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

    // Create membership tier with 3 months duration
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Quarterly',
        description: 'Quarterly membership',
        price: '29.99',
        duration_months: 3,
        features: ['Basic access'],
        is_active: true
      })
      .returning()
      .execute();

    // Test with end of year date to verify month calculation
    const startDate = new Date('2024-10-31');
    const input: CreateUserMembershipInput = {
      user_id: userResult[0].id,
      membership_tier_id: tierResult[0].id,
      start_date: startDate
    };

    const result = await createUserMembership(input);

    // 3 months from October 31, 2024 should be January 31, 2025
    const expectedEndDate = new Date('2025-01-31');
    expect(result.end_date).toEqual(expectedEndDate);
  });

  it('should handle leap year date calculations', async () => {
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

    // Create annual membership tier
    const tierResult = await db.insert(membershipTiersTable)
      .values({
        name: 'Annual',
        description: 'Annual membership',
        price: '199.99',
        duration_months: 12,
        features: ['Full access'],
        is_active: true
      })
      .returning()
      .execute();

    // Start on leap day
    const startDate = new Date('2024-02-29');
    const input: CreateUserMembershipInput = {
      user_id: userResult[0].id,
      membership_tier_id: tierResult[0].id,
      start_date: startDate
    };

    const result = await createUserMembership(input);

    // 12 months from Feb 29, 2024 should be Feb 29, 2025 (but 2025 is not leap year, so it becomes Mar 1)
    const expectedEndDate = new Date('2025-03-01');
    expect(result.end_date).toEqual(expectedEndDate);
  });
});