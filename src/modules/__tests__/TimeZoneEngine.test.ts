import { describe, it, expect, beforeEach } from 'vitest';
import { TimeZoneEngine } from '../TimeZoneEngine';
import type { TimeZone } from '../../types/TimeZone';

describe('TimeZoneEngine', () => {
  let engine: TimeZoneEngine;
  const mockZones: TimeZone[] = [
    {
      id: 'America/New_York',
      name: 'Eastern Standard Time',
      abbreviation: 'EST',
      offset: -300,
      dstOffset: -240,
      dstRules: {
        start: 'Second Sunday in March',
        end: 'First Sunday in November',
        observes: true,
      },
      countries: ['US'],
      majorCities: ['New York', 'Miami', 'Detroit'],
      coordinates: { lat: 40.7128, lon: -74.0060 },
    },
  ];

  beforeEach(() => {
    engine = new TimeZoneEngine(mockZones);
  });

  it('should instantiate with time zone data', () => {
    expect(engine).toBeDefined();
    expect(engine).toBeInstanceOf(TimeZoneEngine);
  });

  it('should get current time for a time zone', () => {
    const now = new Date();
    const time = engine.getCurrentTime('America/New_York');
    expect(time).toBeInstanceOf(Date);
    expect(time.getTime()).toBeGreaterThan(0);

    // Verify offset was applied (EST is -300 minutes = -5 hours)
    const expectedOffset = -300 * 60 * 1000; // -5 hours in milliseconds
    const diff = time.getTime() - now.getTime();
    expect(Math.abs(diff - expectedOffset)).toBeLessThan(1000); // within 1 second tolerance
  });

  it('should throw error for invalid zone ID', () => {
    expect(() => engine.getCurrentTime('Invalid/Zone')).toThrow('Time zone not found');
  });

  it('should get offset for a time zone', () => {
    const offset = engine.getOffset('America/New_York', new Date());
    expect(typeof offset).toBe('number');
    // EST is -300 minutes (UTC-5) or EDT is -240 (UTC-4)
    expect(offset === -300 || offset === -240).toBe(true);
  });

  it('should return correct offset for zone without DST', () => {
    const phoenixZone: TimeZone = {
      id: 'America/Phoenix',
      name: 'Mountain Standard Time',
      abbreviation: 'MST',
      offset: -420, // UTC-7
      countries: ['US'],
      majorCities: ['Phoenix'],
      coordinates: { lat: 33.4484, lon: -112.0740 },
    };
    const engineWithPhoenix = new TimeZoneEngine([phoenixZone]);
    const offset = engineWithPhoenix.getOffset('America/Phoenix', new Date());
    expect(offset).toBe(-420);
  });

  it('should throw error for invalid zone ID in getOffset', () => {
    expect(() => engine.getOffset('Invalid/Zone', new Date())).toThrow('Time zone not found');
  });
});
