import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { gymInfoTable } from '../db/schema';
import { getGymInfo } from '../handlers/get_gym_info';

const testGymData = {
  name: 'FitLife Gym',
  address: '123 Main St, Fitness City, FC 12345',
  phone: '+1-555-0123',
  email: 'info@fitlifegym.com',
  operating_hours: {
    monday: '5:00 AM - 11:00 PM',
    tuesday: '5:00 AM - 11:00 PM',
    wednesday: '5:00 AM - 11:00 PM',
    thursday: '5:00 AM - 11:00 PM',
    friday: '5:00 AM - 11:00 PM',
    saturday: '6:00 AM - 10:00 PM',
    sunday: '7:00 AM - 9:00 PM'
  },
  description: 'Premier fitness facility with state-of-the-art equipment and expert trainers.'
};

describe('getGymInfo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no gym info exists', async () => {
    const result = await getGymInfo();
    expect(result).toBeNull();
  });

  it('should return gym info when it exists', async () => {
    // Insert test gym info
    await db.insert(gymInfoTable)
      .values(testGymData)
      .execute();

    const result = await getGymInfo();

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('FitLife Gym');
    expect(result!.address).toEqual('123 Main St, Fitness City, FC 12345');
    expect(result!.phone).toEqual('+1-555-0123');
    expect(result!.email).toEqual('info@fitlifegym.com');
    expect(result!.description).toEqual('Premier fitness facility with state-of-the-art equipment and expert trainers.');
    expect(result!.id).toBeDefined();
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return operating hours correctly', async () => {
    // Insert test gym info
    await db.insert(gymInfoTable)
      .values(testGymData)
      .execute();

    const result = await getGymInfo();

    expect(result).not.toBeNull();
    expect(result!.operating_hours).toEqual({
      monday: '5:00 AM - 11:00 PM',
      tuesday: '5:00 AM - 11:00 PM',
      wednesday: '5:00 AM - 11:00 PM',
      thursday: '5:00 AM - 11:00 PM',
      friday: '5:00 AM - 11:00 PM',
      saturday: '6:00 AM - 10:00 PM',
      sunday: '7:00 AM - 9:00 PM'
    });
    expect(typeof result!.operating_hours).toBe('object');
    expect(result!.operating_hours.monday).toBe('5:00 AM - 11:00 PM');
    expect(result!.operating_hours.sunday).toBe('7:00 AM - 9:00 PM');
  });

  it('should handle gym info with null description', async () => {
    const gymDataWithNullDescription = {
      ...testGymData,
      description: null
    };

    await db.insert(gymInfoTable)
      .values(gymDataWithNullDescription)
      .execute();

    const result = await getGymInfo();

    expect(result).not.toBeNull();
    expect(result!.description).toBeNull();
    expect(result!.name).toEqual('FitLife Gym');
    expect(result!.operating_hours).toEqual(testGymData.operating_hours);
  });

  it('should return only first record when multiple records exist', async () => {
    // Insert first gym info
    await db.insert(gymInfoTable)
      .values(testGymData)
      .execute();

    // Insert second gym info
    const secondGymData = {
      ...testGymData,
      name: 'Second Gym',
      email: 'info@secondgym.com'
    };

    await db.insert(gymInfoTable)
      .values(secondGymData)
      .execute();

    const result = await getGymInfo();

    expect(result).not.toBeNull();
    // Should return the first record (by insertion order/id)
    expect(result!.name).toEqual('FitLife Gym');
    expect(result!.email).toEqual('info@fitlifegym.com');
  });

  it('should verify data persistence in database', async () => {
    await db.insert(gymInfoTable)
      .values(testGymData)
      .execute();

    const result = await getGymInfo();

    // Verify the data was actually saved to database
    const directQuery = await db.select()
      .from(gymInfoTable)
      .execute();

    expect(directQuery).toHaveLength(1);
    expect(directQuery[0].name).toEqual(result!.name);
    expect(directQuery[0].operating_hours).toEqual(result!.operating_hours);
    expect(directQuery[0].updated_at).toBeInstanceOf(Date);
  });
});