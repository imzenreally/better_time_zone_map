import type { TimeZone } from '../types/TimeZone';
import type { MapGeometry } from '../types/MapGeometry';
import type { TimeZoneBoundary } from '../types/Geography';

export class DataManager {
  private timeZones: TimeZone[] | null = null;
  private mapGeometry: TimeZoneBoundary[] | null = null;

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

  /**
   * Load map geometry (time zone boundary polygons) from JSON file.
   * Used for geographic rendering of time zones.
   *
   * @returns Array of time zone boundaries, or empty array if loading fails
   */
  async loadMapGeometry(): Promise<TimeZoneBoundary[]> {
    if (this.mapGeometry) {
      return this.mapGeometry;
    }

    try {
      // Try to load using dynamic import first (works in Node.js and modern browsers)
      const geometryData = await import('../data/map-geometry.json');
      const data: MapGeometry = geometryData.default;

      // Validate structure
      if (!data.boundaries || !Array.isArray(data.boundaries)) {
        console.warn('Invalid map geometry format: missing boundaries array');
        this.mapGeometry = [];
        return [];
      }

      // Validate zone IDs match existing timezones (if loaded)
      if (this.timeZones) {
        const validZoneIds = new Set(this.timeZones.map(z => z.id));
        const invalidZones = data.boundaries.filter(
          b => !validZoneIds.has(b.zoneId)
        );

        if (invalidZones.length > 0) {
          console.warn(
            `Map geometry contains ${invalidZones.length} zones not in timezones.json:`,
            invalidZones.slice(0, 5).map(z => z.zoneId)
          );
        }
      }

      this.mapGeometry = data.boundaries;
      console.log(`Loaded map geometry: ${data.boundaries.length} zones`);
      return data.boundaries;
    } catch (error) {
      console.error('Failed to load map geometry:', error);
      // Return empty array - app will use fallback rendering
      this.mapGeometry = [];
      return [];
    }
  }

  /**
   * Get boundary data for a specific time zone.
   *
   * @param zoneId IANA time zone identifier
   * @returns TimeZoneBoundary or null if not found
   */
  getZoneBoundary(zoneId: string): TimeZoneBoundary | null {
    if (!this.mapGeometry) return null;
    return this.mapGeometry.find(b => b.zoneId === zoneId) || null;
  }
}
