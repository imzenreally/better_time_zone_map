import type { TimeZone } from '../types/TimeZone';
import type { TimeZoneEngine } from './TimeZoneEngine';

export interface MapRendererOptions {
  width: number;
  height: number;
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timeZones: TimeZone[];
  private timeZoneEngine: TimeZoneEngine | null = null;

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

  render(): void {
    // Clear canvas
    this.ctx.fillStyle = '#e8f4f8';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw simple world map representation (rectangles for time zones)
    this.drawSimpleMap();
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

      // Get base color
      const baseColor = this.getZoneColor(zone);

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

      // Draw zone label
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(zone.abbreviation, x, this.canvas.height * 0.5 + 5);
    });
  }

  private getZoneColor(zone: TimeZone): string {
    // Simple color based on offset
    const hue = ((zone.offset + 720) / 1440) * 360; // 0-360 degrees
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

    if (decimalHour >= 20 || decimalHour < 6) {
      // Night
      return '#1a2332';
    } else if (decimalHour >= 6 && decimalHour < 8) {
      // Dawn (gradient)
      const progress = (decimalHour - 6) / 2; // 0 to 1
      return this.interpolateColor('#1a2332', '#fbbf24', progress);
    } else if (decimalHour >= 8 && decimalHour < 18) {
      // Day
      return '#fef3c7';
    } else {
      // Dusk (gradient)
      const progress = (decimalHour - 18) / 2; // 0 to 1
      return this.interpolateColor('#fef3c7', '#1a2332', progress);
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
}
