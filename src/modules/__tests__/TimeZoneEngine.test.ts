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
      coordinates: { lat: 40.7128, lon: -74.006 },
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
      coordinates: { lat: 33.4484, lon: -112.074 },
    };
    const engineWithPhoenix = new TimeZoneEngine([phoenixZone]);
    const offset = engineWithPhoenix.getOffset('America/Phoenix', new Date());
    expect(offset).toBe(-420);
  });

  it('should throw error for invalid zone ID in getOffset', () => {
    expect(() => engine.getOffset('Invalid/Zone', new Date())).toThrow('Time zone not found');
  });

  it('should detect if a zone is in DST', () => {
    // Test with a summer date (July = month 6, which is in DST period March-October)
    const summerDate = new Date('2026-07-15');
    const isDstSummer = engine.isDST('America/New_York', summerDate);
    expect(isDstSummer).toBe(true);

    // Test with a winter date (January = month 0, which is NOT in DST period)
    const winterDate = new Date('2026-01-15');
    const isDstWinter = engine.isDST('America/New_York', winterDate);
    expect(isDstWinter).toBe(false);
  });

  it('should return false for zones without DST rules', () => {
    const phoenixZone: TimeZone = {
      id: 'America/Phoenix',
      name: 'Mountain Standard Time',
      abbreviation: 'MST',
      offset: -420,
      countries: ['US'],
      majorCities: ['Phoenix'],
      coordinates: { lat: 33.4484, lon: -112.074 },
    };
    const engineWithPhoenix = new TimeZoneEngine([phoenixZone]);
    const isDst = engineWithPhoenix.isDST('America/Phoenix', new Date());
    expect(isDst).toBe(false);
  });

  it('should throw error for invalid zone ID in isDST', () => {
    expect(() => engine.isDST('Invalid/Zone', new Date())).toThrow('Time zone not found');
  });
});
