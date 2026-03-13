import type { TimeZone, DSTTransition } from '../types/TimeZone';

export class TimeZoneEngine {
  private zones: Map<string, TimeZone>;

  constructor(timeZones: TimeZone[]) {
    this.zones = new Map(timeZones.map((z) => [z.id, z]));
  }
}
