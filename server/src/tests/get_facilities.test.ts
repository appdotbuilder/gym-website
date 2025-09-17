import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { facilitiesTable } from '../db/schema';
import { getFacilities } from '../handlers/get_facilities';

describe('getFacilities', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active facilities', async () => {
    // Create test facilities
    await db.insert(facilitiesTable).values([
      {
        name: 'Main Gym Floor',
        description: 'Large open gym with modern equipment',
        image_url: 'https://example.com/gym.jpg',
        is_active: true
      },
      {
        name: 'Yoga Studio',
        description: 'Peaceful yoga and meditation space',
        image_url: 'https://example.com/yoga.jpg',
        is_active: true
      },
      {
        name: 'Swimming Pool',
        description: '25-meter swimming pool with lanes',
        image_url: null,
        is_active: true
      }
    ]).execute();

    const result = await getFacilities();

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Main Gym Floor');
    expect(result[0].description).toBe('Large open gym with modern equipment');
    expect(result[0].image_url).toBe('https://example.com/gym.jpg');
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].name).toBe('Yoga Studio');
    expect(result[1].description).toBe('Peaceful yoga and meditation space');
    expect(result[1].is_active).toBe(true);

    expect(result[2].name).toBe('Swimming Pool');
    expect(result[2].image_url).toBeNull();
    expect(result[2].is_active).toBe(true);
  });

  it('should not return inactive facilities', async () => {
    // Create mix of active and inactive facilities
    await db.insert(facilitiesTable).values([
      {
        name: 'Active Facility',
        description: 'This facility is active',
        is_active: true
      },
      {
        name: 'Inactive Facility',
        description: 'This facility is inactive',
        is_active: false
      },
      {
        name: 'Another Active Facility',
        description: 'This facility is also active',
        is_active: true
      }
    ]).execute();

    const result = await getFacilities();

    expect(result).toHaveLength(2);
    expect(result.every(facility => facility.is_active)).toBe(true);
    expect(result.find(facility => facility.name === 'Inactive Facility')).toBeUndefined();
    expect(result.find(facility => facility.name === 'Active Facility')).toBeDefined();
    expect(result.find(facility => facility.name === 'Another Active Facility')).toBeDefined();
  });

  it('should return empty array when no active facilities exist', async () => {
    // Create only inactive facilities
    await db.insert(facilitiesTable).values([
      {
        name: 'Closed Facility 1',
        description: 'This facility is closed',
        is_active: false
      },
      {
        name: 'Closed Facility 2',
        description: 'This facility is also closed',
        is_active: false
      }
    ]).execute();

    const result = await getFacilities();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when no facilities exist at all', async () => {
    // No facilities inserted
    const result = await getFacilities();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle facilities with null image_url correctly', async () => {
    // Create facility with null image_url
    await db.insert(facilitiesTable).values({
      name: 'Facility Without Image',
      description: 'This facility has no image',
      image_url: null,
      is_active: true
    }).execute();

    const result = await getFacilities();

    expect(result).toHaveLength(1);
    expect(result[0].image_url).toBeNull();
    expect(result[0].name).toBe('Facility Without Image');
    expect(result[0].is_active).toBe(true);
  });
});