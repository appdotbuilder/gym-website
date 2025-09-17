import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs
const testInputWithPhone: CreateUserInput = {
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  phone: '+1234567890'
};

const testInputWithoutPhone: CreateUserInput = {
  email: 'jane.smith@example.com',
  first_name: 'Jane',
  last_name: 'Smith'
};

const testInputWithNullPhone: CreateUserInput = {
  email: 'bob.wilson@example.com',
  first_name: 'Bob',
  last_name: 'Wilson',
  phone: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with phone number', async () => {
    const result = await createUser(testInputWithPhone);

    // Basic field validation
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user without phone number', async () => {
    const result = await createUser(testInputWithoutPhone);

    // Basic field validation
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.phone).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with explicit null phone', async () => {
    const result = await createUser(testInputWithNullPhone);

    // Basic field validation
    expect(result.email).toEqual('bob.wilson@example.com');
    expect(result.first_name).toEqual('Bob');
    expect(result.last_name).toEqual('Wilson');
    expect(result.phone).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInputWithPhone);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('john.doe@example.com');
    expect(savedUser.first_name).toEqual('John');
    expect(savedUser.last_name).toEqual('Doe');
    expect(savedUser.phone).toEqual('+1234567890');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique IDs for different users', async () => {
    const user1 = await createUser(testInputWithPhone);
    const user2 = await createUser(testInputWithoutPhone);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.id).toBeGreaterThan(0);
    expect(user2.id).toBeGreaterThan(0);
  });

  it('should set created_at and updated_at to current time', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testInputWithPhone);
    const afterCreation = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInputWithPhone);

    // Try to create another user with the same email
    const duplicateEmailInput: CreateUserInput = {
      email: 'john.doe@example.com', // Same email
      first_name: 'Jane',
      last_name: 'Smith'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });

  it('should handle various email formats', async () => {
    const emailVariants = [
      'user@domain.com',
      'user.name@domain.co.uk',
      'user+tag@domain.org',
      'user123@test-domain.com'
    ];

    for (let i = 0; i < emailVariants.length; i++) {
      const input: CreateUserInput = {
        email: emailVariants[i],
        first_name: `User${i}`,
        last_name: `Test${i}`
      };

      const result = await createUser(input);
      expect(result.email).toEqual(emailVariants[i]);
      expect(result.first_name).toEqual(`User${i}`);
      expect(result.last_name).toEqual(`Test${i}`);
    }
  });

  it('should handle special characters in names', async () => {
    const specialCharInput: CreateUserInput = {
      email: 'special@example.com',
      first_name: "O'Connor",
      last_name: 'García-López'
    };

    const result = await createUser(specialCharInput);
    expect(result.first_name).toEqual("O'Connor");
    expect(result.last_name).toEqual('García-López');
  });
});