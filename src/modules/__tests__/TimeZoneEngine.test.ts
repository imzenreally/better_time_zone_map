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
});
