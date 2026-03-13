import { describe, it, expect, beforeEach } from 'vitest';
import { DataManager } from '../DataManager';

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
});
