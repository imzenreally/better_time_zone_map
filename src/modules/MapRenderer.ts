import type { TimeZone } from '../types/TimeZone';
import type { TimeZoneEngine } from './TimeZoneEngine';
import { MapProjection } from './MapProjection';
import type { TimeZoneBoundary, Polygon } from '../types/Geography';

export interface MapRendererOptions {
  width: number;
  height: number;
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timeZones: TimeZone[];
  private timeZoneEngine: TimeZoneEngine | null = null;
  private theme: 'light' | 'dark' = 'light';

  // Geographic rendering support
  private mapGeometry: TimeZoneBoundary[] | null = null;

  constructor(canvas: HTMLCanvasElement, timeZones: TimeZone[], options: MapRendererOptions) {
    this.canvas = canvas;
    this.timeZones = timeZones;

    // Set canvas size
    this.canvas.width = options.width;
    this.canvas.height = options.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
  }

  setTimeZoneEngine(engine: TimeZoneEngine): void {
    this.timeZoneEngine = engine;
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
  }

  /**
   * Set map geometry data for geographic rendering.
   * If not set or empty, renderer will use fallback rectangle rendering.
   *
   * @param geometry Array of time zone boundaries with polygon coordinates
   */
  setMapGeometry(geometry: TimeZoneBoundary[]): void {
    this.mapGeometry = geometry;
    console.log(`MapRenderer: Set map geometry with ${geometry.length} zones`);
  }

  render(): void {
    // Clear canvas with theme-aware background
    this.ctx.fillStyle = this.theme === 'dark' ? '#0a0a0a' : '#e8f4f8';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Choose rendering mode based on geometry availability
    if (this.mapGeometry?.length) {
      this.drawGeographicMap();
    } else {
      // Fallback to rectangle rendering
      this.drawSimpleMap();
    }
  }

  private drawSimpleMap(): void {
    // For MVP, draw simple rectangles representing time zone regions
    // We'll draw vertical strips for longitude-based zones

    const zoneWidth = this.canvas.width / 24; // 24 time zones roughly

    this.timeZones.forEach((zone) => {
      // Calculate position based on offset
      // Offset is in minutes, convert to hours for positioning
      const hourOffset = zone.offset / 60;
      const x = ((hourOffset + 12) / 24) * this.canvas.width;

      // Get base color and convert from HSL to hex
      const baseColorHSL = this.getZoneColor(zone);
      const baseColor = this.hslToHex(baseColorHSL);

      // Apply day/night gradient if TimeZoneEngine available
      let finalColor = baseColor;
      if (this.timeZoneEngine) {
        const localTime = this.timeZoneEngine.getCurrentTime(zone.id);
        const hour = localTime.getUTCHours();
        const minute = localTime.getUTCMinutes();
        const gradientColor = this.calculateDayNightColor(hour, minute);

        // Blend base color with gradient (60% opacity)
        finalColor = this.blendColors(baseColor, gradientColor, 0.6);
      }

      // Draw zone rectangle
      this.ctx.fillStyle = finalColor;
      this.ctx.fillRect(
        x - zoneWidth / 2,
        this.canvas.height * 0.3,
        zoneWidth,
        this.canvas.height * 0.4
      );

      // Draw zone label with stroke for better visibility
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';

      // Draw text stroke (outline)
      this.ctx.strokeStyle = this.theme === 'dark' ? '#000000' : '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(zone.abbreviation, x, this.canvas.height * 0.5 + 5);

      // Draw text fill
      this.ctx.fillStyle = this.theme === 'dark' ? '#e8e8e8' : '#1a1a1a';
      this.ctx.fillText(zone.abbreviation, x, this.canvas.height * 0.5 + 5);
    });
  }

  private getZoneColor(zone: TimeZone): string {
    // Map offset range [-720, 720] to hue [0, 360] and normalize
    const hue = (((zone.offset + 720) / 1440) * 360) % 360;
    return `hsl(${hue}, 40%, 70%)`;
  }

  getZoneAtPosition(x: number, y: number): TimeZone | null {
    // Check if clicked position is within a zone
    const zoneWidth = this.canvas.width / 24;

    for (const zone of this.timeZones) {
      const hourOffset = zone.offset / 60;
      const zoneX = ((hourOffset + 12) / 24) * this.canvas.width;
      const zoneLeft = zoneX - zoneWidth / 2;
      const zoneRight = zoneX + zoneWidth / 2;
      const zoneTop = this.canvas.height * 0.3;
      const zoneBottom = this.canvas.height * 0.7;

      if (x >= zoneLeft && x <= zoneRight && y >= zoneTop && y <= zoneBottom) {
        return zone;
      }
    }

    return null;
  }

  private calculateDayNightColor(hour: number, minute: number): string {
    const decimalHour = hour + minute / 60;

    // Adjust colors for dark mode
    const nightColor = this.theme === 'dark' ? '#0a0f1a' : '#1a2332';
    const dayColor = this.theme === 'dark' ? '#e8e0c7' : '#fef3c7';
    const dawnColor = '#fbbf24'; // Keep same for both themes

    if (decimalHour >= 20 || decimalHour < 6) {
      // Night
      return nightColor;
    } else if (decimalHour >= 6 && decimalHour < 8) {
      // Dawn (gradient)
      const progress = (decimalHour - 6) / 2; // 0 to 1
      return this.interpolateColor(nightColor, dawnColor, progress);
    } else if (decimalHour >= 8 && decimalHour < 18) {
      // Day
      return dayColor;
    } else {
      // Dusk (gradient)
      const progress = (decimalHour - 18) / 2; // 0 to 1
      return this.interpolateColor(dayColor, nightColor, progress);
    }
  }

  private interpolateColor(
    color1: string,
    color2: string,
    progress: number
  ): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * progress);
    const g = Math.round(c1.g + (c2.g - c1.g) * progress);
    const b = Math.round(c1.b + (c2.b - c1.b) * progress);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { r: 0, g: 0, b: 0 };
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  private hslToHex(hsl: string): string {
    const match = /hsl\(([\d.]+),\s*(\d+)%,\s*(\d+)%\)/.exec(hsl);
    if (!match) {
      console.warn(`Invalid HSL color: ${hsl}`);
      return '#000000';
    }

    const hue = parseFloat(match[1]) % 360;
    const h = hue / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const rHex = Math.round(r * 255).toString(16).padStart(2, '0');
    const gHex = Math.round(g * 255).toString(16).padStart(2, '0');
    const bHex = Math.round(b * 255).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  private blendColors(
    baseColor: string,
    overlayColor: string,
    opacity: number
  ): string {
    const base = this.hexToRgb(baseColor);
    const overlay = this.hexToRgb(overlayColor);

    const r = Math.round(base.r * (1 - opacity) + overlay.r * opacity);
    const g = Math.round(base.g * (1 - opacity) + overlay.g * opacity);
    const b = Math.round(base.b * (1 - opacity) + overlay.b * opacity);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Draw time zones using geographic polygons with accurate boundaries.
   * Each zone is filled with its color (offset-based + day/night gradient).
   */
  private drawGeographicMap(): void {
    // Safety check (should be guaranteed by render() but be defensive)
    if (!this.mapGeometry) return;

    this.timeZones.forEach((zone) => {
      // Find boundary data for this zone
      const boundary = this.mapGeometry!.find(b => b.zoneId === zone.id);
      if (!boundary) {
        console.warn(`No boundary data for zone: ${zone.id}`);
        return;
      }

      // Calculate zone color (existing logic)
      const baseColorHSL = this.getZoneColor(zone);
      const baseColor = this.hslToHex(baseColorHSL);

      // Apply day/night gradient if TimeZoneEngine available
      let finalColor = baseColor;
      if (this.timeZoneEngine) {
        const localTime = this.timeZoneEngine.getCurrentTime(zone.id);
        const hour = localTime.getUTCHours();
        const minute = localTime.getUTCMinutes();
        const gradientColor = this.calculateDayNightColor(hour, minute);
        finalColor = this.blendColors(baseColor, gradientColor, 0.6);
      }

      // Draw all polygons for this zone
      this.ctx.fillStyle = finalColor;
      boundary.polygons.forEach(polygon => {
        this.drawPolygon(polygon.coordinates);
      });

      // Draw zone label at representative point
      this.drawZoneLabel(zone);
    });
  }

  /**
   * Draw a single polygon on the canvas.
   * Converts geographic coordinates to canvas pixels using projection.
   *
   * @param coordinates Array of [longitude, latitude] pairs
   */
  private drawPolygon(coordinates: [number, number][]): void {
    if (coordinates.length < 3) {
      console.warn('Invalid polygon: less than 3 points');
      return;
    }

    this.ctx.beginPath();

    coordinates.forEach((coord, index) => {
      const [lon, lat] = coord;
      const { x, y } = MapProjection.projectToCanvas(
        lon,
        lat,
        this.canvas.width,
        this.canvas.height
      );

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Draw zone label at the zone's representative point.
   * Uses existing zone.coordinates (from timezones.json).
   *
   * @param zone TimeZone with coordinates for label placement
   */
  private drawZoneLabel(zone: TimeZone): void {
    const { x, y } = MapProjection.projectToCanvas(
      zone.coordinates.lon,
      zone.coordinates.lat,
      this.canvas.width,
      this.canvas.height
    );

    // Draw label with stroke for visibility (existing technique)
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';

    // Stroke (outline)
    this.ctx.strokeStyle = this.theme === 'dark' ? '#000000' : '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(zone.abbreviation, x, y);

    // Fill
    this.ctx.fillStyle = this.theme === 'dark' ? '#e8e8e8' : '#1a1a1a';
    this.ctx.fillText(zone.abbreviation, x, y);
  }
}
