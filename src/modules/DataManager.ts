import type { TimeZone } from '../types/TimeZone';
import type { MapGeometry } from '../types/MapGeometry';
import type { TimeZoneBoundary } from '../types/Geography';

export class DataManager {
  private timeZones: TimeZone[] | null = null;
  private mapGeometry: MapGeometry | null = null;

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

  async loadMapGeometry(): Promise<MapGeometry> {
    if (this.mapGeometry) {
      return this.mapGeometry;
    }

    try {
      // Try to load using dynamic import first (works in Node.js and modern browsers)
      const geometryData = await import('../data/map-geometry.json');
      this.mapGeometry = geometryData.default;
      return this.mapGeometry;
    } catch {
      try {
        // Fallback to fetch for browser environment
        const response = await fetch('/src/data/map-geometry.json');
        if (!response.ok) {
          throw new Error(`Failed to load map geometry: ${response.statusText}`);
        }
        this.mapGeometry = await response.json();
        return this.mapGeometry!;
      } catch (error) {
        console.error('Error loading map geometry data:', error);
        throw new Error('Failed to load map geometry data', { cause: error });
      }
    }
  }

  getZoneBoundary(zoneId: string): TimeZoneBoundary | undefined {
    if (!this.mapGeometry) {
      throw new Error('Map geometry not loaded. Call loadMapGeometry() first.');
    }

    return this.mapGeometry.boundaries.find(
      (boundary) => boundary.zoneId === zoneId
    );
  }
}
