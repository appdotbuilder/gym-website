import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput, type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user';
import { eq } from 'drizzle-orm';

// Create a user helper for tests
const createTestUser = async (userData: CreateUserInput) => {
  const result = await db.insert(usersTable)
    .values({
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user
    const testUserData: CreateUserInput = {
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890'
    };

    const createdUser = await createTestUser(testUserData);
    
    // Test the handler
    const input: GetUserByIdInput = {
      user_id: createdUser.id
    };

    const result = await getUserById(input);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdUser.id);
    expect(result!.email).toBe('john.doe@example.com');
    expect(result!.first_name).toBe('John');
    expect(result!.last_name).toBe('Doe');
    expect(result!.phone).toBe('+1234567890');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return user with null phone when phone is not provided', async () => {
    // Create a test user without phone
    const testUserData: CreateUserInput = {
      email: 'jane.smith@example.com',
      first_name: 'Jane',
      last_name: 'Smith'
    };

    const createdUser = await createTestUser(testUserData);
    
    const input: GetUserByIdInput = {
      user_id: createdUser.id
    };

    const result = await getUserById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdUser.id);
    expect(result!.email).toBe('jane.smith@example.com');
    expect(result!.first_name).toBe('Jane');
    expect(result!.last_name).toBe('Smith');
    expect(result!.phone).toBeNull();
  });

  it('should return null when user does not exist', async () => {
    const input: GetUserByIdInput = {
      user_id: 999 // Non-existent user ID
    };

    const result = await getUserById(input);

    expect(result).toBeNull();
  });

  it('should verify user exists in database', async () => {
    // Create a test user
    const testUserData: CreateUserInput = {
      email: 'test.user@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone: null
    };

    const createdUser = await createTestUser(testUserData);
    
    // Get user through handler
    const input: GetUserByIdInput = {
      user_id: createdUser.id
    };

    const handlerResult = await getUserById(input);

    // Verify it matches database record
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(handlerResult!.id).toBe(dbUsers[0].id);
    expect(handlerResult!.email).toBe(dbUsers[0].email);
    expect(handlerResult!.first_name).toBe(dbUsers[0].first_name);
    expect(handlerResult!.last_name).toBe(dbUsers[0].last_name);
    expect(handlerResult!.phone).toBe(dbUsers[0].phone);
  });

  it('should handle multiple users correctly', async () => {
    // Create multiple test users
    const user1Data: CreateUserInput = {
      email: 'user1@example.com',
      first_name: 'User',
      last_name: 'One'
    };

    const user2Data: CreateUserInput = {
      email: 'user2@example.com',
      first_name: 'User',
      last_name: 'Two',
      phone: '+9876543210'
    };

    const createdUser1 = await createTestUser(user1Data);
    const createdUser2 = await createTestUser(user2Data);

    // Test getting first user
    const input1: GetUserByIdInput = { user_id: createdUser1.id };
    const result1 = await getUserById(input1);

    expect(result1).not.toBeNull();
    expect(result1!.email).toBe('user1@example.com');
    expect(result1!.first_name).toBe('User');
    expect(result1!.last_name).toBe('One');
    expect(result1!.phone).toBeNull();

    // Test getting second user
    const input2: GetUserByIdInput = { user_id: createdUser2.id };
    const result2 = await getUserById(input2);

    expect(result2).not.toBeNull();
    expect(result2!.email).toBe('user2@example.com');
    expect(result2!.first_name).toBe('User');
    expect(result2!.last_name).toBe('Two');
    expect(result2!.phone).toBe('+9876543210');

    // Verify they are different users
    expect(result1!.id).not.toBe(result2!.id);
  });
});