import type { TimeZone } from '../types/TimeZone';

export class TimeZoneEngine {
  private zones: Map<string, TimeZone>;

  constructor(timeZones: TimeZone[]) {
    this.zones = new Map(timeZones.map((z) => [z.id, z]));
  }

  /**
   * Returns a Date whose UTC fields represent the current local time in the given zone.
   * Use getUTCHours(), getUTCMinutes(), etc. to read the local time.
   * Do NOT use getTime() or local getters on the result.
   *
   * @param zoneId - The IANA time zone identifier (e.g., "America/New_York")
   * @returns A Date object with manipulated timestamp for offset calculation
   * @throws Error if the time zone ID is not found
   */
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

  /**
   * Returns the UTC offset in minutes for the given time zone and date.
   *
   * @param zoneId - The IANA time zone identifier (e.g., "America/New_York")
   * @param _date - The date to get the offset for (used for DST calculation in future phases)
   * @returns The offset in minutes from UTC (e.g., -300 for UTC-5)
   * @throws Error if the time zone ID is not found
   */
  getOffset(zoneId: string, _date: Date): number {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Time zone not found: ${zoneId}`);
    }

    // For MVP, use standard offset
    // Phase 2 will add proper DST detection
    return zone.offset;
  }
}
