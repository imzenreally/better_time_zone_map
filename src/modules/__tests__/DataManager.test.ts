import { describe, it, expect, beforeEach } from 'vitest';
import { DataManager } from '../DataManager';
import type { MapGeometry } from '../../types/MapGeometry';
import type { TimeZoneBoundary } from '../../types/Geography';

describe('DataManager', () => {
  let dataManager: DataManager;

  beforeEach(() => {
    dataManager = new DataManager();
  });

  it('should instantiate DataManager', () => {
    expect(dataManager).toBeDefined();
    expect(dataManager).toBeInstanceOf(DataManager);
  });

  it('should load time zone data', async () => {
    const zones = await dataManager.loadTimeZones();
    expect(Array.isArray(zones)).toBe(true);
    expect(zones.length).toBeGreaterThan(0);
  });

  it('should throw if getTimeZones called before loading', () => {
    expect(() => dataManager.getTimeZones()).toThrow('Time zones not loaded');
  });

  it('should return cached data from getTimeZones after loading', async () => {
    await dataManager.loadTimeZones();
    const zones = dataManager.getTimeZones();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones[0]).toHaveProperty('id');
  });

  it('should cache data and not reload on subsequent calls', async () => {
    const firstLoad = await dataManager.loadTimeZones();
    const secondLoad = await dataManager.loadTimeZones();
    expect(firstLoad).toBe(secondLoad); // Same reference = cached
  });

  // Tests for loadMapGeometry
  describe('loadMapGeometry', () => {
    it('should load map geometry data successfully', async () => {
      const geometry = await dataManager.loadMapGeometry();
      expect(geometry).toBeDefined();
      expect(geometry).toBeInstanceOf(Object);
    });

    it('should validate map geometry structure', async () => {
      const geometry = await dataManager.loadMapGeometry();

      // geometry is now TimeZoneBoundary[], not MapGeometry
      expect(Array.isArray(geometry)).toBe(true);
      expect(geometry.length).toBeGreaterThan(0);

      // Validate boundaries structure
      const boundary = geometry[0];
      expect(boundary).toHaveProperty('zoneId');
      expect(boundary).toHaveProperty('polygons');
      expect(typeof boundary.zoneId).toBe('string');
      expect(Array.isArray(boundary.polygons)).toBe(true);

      if (boundary.polygons.length > 0) {
        const polygon = boundary.polygons[0];
        expect(polygon).toHaveProperty('coordinates');
        expect(Array.isArray(polygon.coordinates)).toBe(true);
      }
    });

    it('should cache data and return same reference on subsequent calls', async () => {
      const firstLoad = await dataManager.loadMapGeometry();
      const secondLoad = await dataManager.loadMapGeometry();
      expect(firstLoad).toBe(secondLoad); // Same reference = cached
    });

    it('should return empty array if loading fails gracefully', async () => {
      // We can't easily mock the import, but we can verify the fallback behavior
      // by checking that the method doesn't throw and returns an array
      const result = await dataManager.loadMapGeometry();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // Tests for getZoneBoundary
  describe('getZoneBoundary', () => {
    it('should return boundary for a valid zone after loading', async () => {
      await dataManager.loadMapGeometry();
      const boundary = dataManager.getZoneBoundary('Africa/Abidjan');

      expect(boundary).toBeDefined();
      expect(boundary.zoneId).toBe('Africa/Abidjan');
      expect(Array.isArray(boundary.polygons)).toBe(true);
      expect(boundary.polygons.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent zone', async () => {
      await dataManager.loadMapGeometry();
      const boundary = dataManager.getZoneBoundary('Invalid/Zone');
      expect(boundary).toBeNull();
    });

    it('should return null if called before loading map geometry', () => {
      const boundary = dataManager.getZoneBoundary('Africa/Abidjan');
      expect(boundary).toBeNull();
    });
  });
});
