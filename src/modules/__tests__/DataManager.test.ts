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
});
