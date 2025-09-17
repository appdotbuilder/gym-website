import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async (userData: CreateUserInput) => {
    const result = await db.insert(usersTable)
      .values({
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || null
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update all user fields', async () => {
    // Create a test user first
    const testUser = await createTestUser({
      email: 'original@example.com',
      first_name: 'Original',
      last_name: 'User',
      phone: '123-456-7890'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'updated@example.com',
      first_name: 'Updated',
      last_name: 'Name',
      phone: '098-765-4321'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('updated@example.com');
    expect(result.first_name).toEqual('Updated');
    expect(result.last_name).toEqual('Name');
    expect(result.phone).toEqual('098-765-4321');
    expect(result.created_at).toEqual(testUser.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should update only provided fields', async () => {
    // Create a test user first
    const testUser = await createTestUser({
      email: 'original@example.com',
      first_name: 'Original',
      last_name: 'User',
      phone: '123-456-7890'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'newemail@example.com',
      first_name: 'NewFirst'
      // Intentionally not updating last_name or phone
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('newemail@example.com');
    expect(result.first_name).toEqual('NewFirst');
    expect(result.last_name).toEqual('User'); // Should remain unchanged
    expect(result.phone).toEqual('123-456-7890'); // Should remain unchanged
    expect(result.created_at).toEqual(testUser.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should update phone to null', async () => {
    // Create a test user with a phone number
    const testUser = await createTestUser({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: '123-456-7890'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      phone: null
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUser.id);
    expect(result.phone).toBeNull();
    expect(result.email).toEqual(testUser.email); // Other fields unchanged
    expect(result.first_name).toEqual(testUser.first_name);
    expect(result.last_name).toEqual(testUser.last_name);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should persist changes to database', async () => {
    // Create a test user first
    const testUser = await createTestUser({
      email: 'original@example.com',
      first_name: 'Original',
      last_name: 'User'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'persistent@example.com',
      first_name: 'Persistent'
    };

    await updateUser(updateInput);

    // Query the database directly to verify changes were persisted
    const updatedUserFromDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUserFromDb).toHaveLength(1);
    expect(updatedUserFromDb[0].email).toEqual('persistent@example.com');
    expect(updatedUserFromDb[0].first_name).toEqual('Persistent');
    expect(updatedUserFromDb[0].last_name).toEqual('User'); // Unchanged
    expect(updatedUserFromDb[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUserFromDb[0].updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      email: 'nonexistent@example.com'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should handle empty update gracefully', async () => {
    // Create a test user first
    const testUser = await createTestUser({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: '123-456-7890'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id
      // No fields to update except id
    };

    const result = await updateUser(updateInput);

    // All original data should remain the same except updated_at
    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual(testUser.email);
    expect(result.first_name).toEqual(testUser.first_name);
    expect(result.last_name).toEqual(testUser.last_name);
    expect(result.phone).toEqual(testUser.phone);
    expect(result.created_at).toEqual(testUser.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should handle duplicate email constraint violation', async () => {
    // Create two test users
    const user1 = await createTestUser({
      email: 'user1@example.com',
      first_name: 'User',
      last_name: 'One'
    });

    const user2 = await createTestUser({
      email: 'user2@example.com',
      first_name: 'User',
      last_name: 'Two'
    });

    // Try to update user2 with user1's email
    const updateInput: UpdateUserInput = {
      id: user2.id,
      email: 'user1@example.com' // This should violate unique constraint
    };

    await expect(updateUser(updateInput)).rejects.toThrow();
  });
});