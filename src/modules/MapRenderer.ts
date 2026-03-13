import type { TimeZone } from '../types/TimeZone';

export interface MapRendererOptions {
  width: number;
  height: number;
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timeZones: TimeZone[];

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

      // Draw zone rectangle
      this.ctx.fillStyle = this.getZoneColor(zone);
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
      this.ctx.fillText(
        zone.abbreviation,
        x,
        this.canvas.height * 0.5 + 5
      );
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
}
