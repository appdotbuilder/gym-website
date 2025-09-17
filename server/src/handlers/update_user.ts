import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // First verify the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with ID ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.email !== undefined) {
      updateData['email'] = input.email;
    }
    if (input.first_name !== undefined) {
      updateData['first_name'] = input.first_name;
    }
    if (input.last_name !== undefined) {
      updateData['last_name'] = input.last_name;
    }
    if (input.phone !== undefined) {
      updateData['phone'] = input.phone;
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};