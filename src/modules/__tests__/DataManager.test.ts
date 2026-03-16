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
    expect(zones.length).toBe(3);
    expect(zones[0].id).toBe('America/New_York');
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

      // Check required properties
      expect(geometry).toHaveProperty('version');
      expect(geometry).toHaveProperty('source');
      expect(geometry).toHaveProperty('simplified');
      expect(geometry).toHaveProperty('boundaries');

      // Validate types
      expect(typeof geometry.version).toBe('string');
      expect(typeof geometry.source).toBe('string');
      expect(typeof geometry.simplified).toBe('boolean');
      expect(Array.isArray(geometry.boundaries)).toBe(true);

      // Validate boundaries structure
      if (geometry.boundaries.length > 0) {
        const boundary = geometry.boundaries[0];
        expect(boundary).toHaveProperty('zoneId');
        expect(boundary).toHaveProperty('polygons');
        expect(typeof boundary.zoneId).toBe('string');
        expect(Array.isArray(boundary.polygons)).toBe(true);

        if (boundary.polygons.length > 0) {
          const polygon = boundary.polygons[0];
          expect(polygon).toHaveProperty('coordinates');
          expect(Array.isArray(polygon.coordinates)).toBe(true);
        }
      }
    });

    it('should cache data and return same reference on subsequent calls', async () => {
      const firstLoad = await dataManager.loadMapGeometry();
      const secondLoad = await dataManager.loadMapGeometry();
      expect(firstLoad).toBe(secondLoad); // Same reference = cached
    });

    it('should throw if getZoneBoundary called before loading', () => {
      expect(() => dataManager.getZoneBoundary('America/New_York')).toThrow(
        'Map geometry not loaded'
      );
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

    it('should return undefined for non-existent zone', async () => {
      await dataManager.loadMapGeometry();
      const boundary = dataManager.getZoneBoundary('Invalid/Zone');
      expect(boundary).toBeUndefined();
    });

    it('should throw if called before loading map geometry', () => {
      expect(() => dataManager.getZoneBoundary('Africa/Abidjan')).toThrow(
        'Map geometry not loaded'
      );
    });
  });
});
