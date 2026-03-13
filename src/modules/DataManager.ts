import type { TimeZone } from '../types/TimeZone';

export class DataManager {
  private timeZones: TimeZone[] | null = null;

  async loadTimeZones(): Promise<TimeZone[]> {
    if (this.timeZones) {
      return this.timeZones;
    }

    try {
      // Try to load using dynamic import first (works in Node.js and modern browsers)
      const timezoneData = await import('../data/timezones.json');
      this.timeZones = timezoneData.default;
      return this.timeZones;
    } catch {
      try {
        // Fallback to fetch for browser environment
        const response = await fetch('/src/data/timezones.json');
        if (!response.ok) {
          throw new Error(`Failed to load time zones: ${response.statusText}`);
        }
        this.timeZones = await response.json();
        return this.timeZones!;
      } catch (error) {
        console.error('Error loading time zone data:', error);
        throw new Error('Failed to load time zone data', { cause: error });
      }
    }
  }

  getTimeZones(): TimeZone[] {
    if (!this.timeZones) {
      throw new Error('Time zones not loaded. Call loadTimeZones() first.');
    }
    return this.timeZones;
  }
}
