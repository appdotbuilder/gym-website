import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone || null
      })
      .returning()
      .execute();

    // Return the created user
    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};