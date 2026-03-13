import type { TimeZone } from '../types/TimeZone';

export class TimeZoneEngine {
  private zones: Map<string, TimeZone>;

  constructor(timeZones: TimeZone[]) {
    this.zones = new Map(timeZones.map((z) => [z.id, z]));
  }

  getCurrentTime(zoneId: string): Date {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Time zone not found: ${zoneId}`);
    }

    // Get current UTC time
    const now = new Date();
    const utcTime = now.getTime();

    // Apply offset (offset is in minutes, convert to milliseconds)
    const offsetMs = zone.offset * 60 * 1000;

    return new Date(utcTime + offsetMs);
  }
}
