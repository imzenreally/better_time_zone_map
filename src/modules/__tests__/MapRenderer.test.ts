import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapRenderer } from '../MapRenderer';
import type { TimeZone } from '../../types/TimeZone';

const mockZones: TimeZone[] = [
  {
    id: 'Test/Zone',
    name: 'Test Zone',
    abbreviation: 'TST',
    offset: 0,
    countries: ['XX'],
    majorCities: ['Test City'],
    coordinates: { lat: 0, lon: 0 },
  },
];

describe('MapRenderer - Day/Night Gradients', () => {
  let canvas: HTMLCanvasElement;
  let renderer: MapRenderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Mock canvas context
    const mockContext = {
      fillStyle: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
      font: '',
      textAlign: '',
    };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext as any);

    renderer = new MapRenderer(canvas, mockZones, { width: 800, height: 600 });
  });

  it('should return night color for hour 3', () => {
    const color = (renderer as any).calculateDayNightColor(3, 0);
    expect(color).toBe('#1a2332');
  });

  it('should return day color for hour 12', () => {
    const color = (renderer as any).calculateDayNightColor(12, 0);
    expect(color).toBe('#fef3c7');
  });

  it('should return dawn gradient color for hour 7', () => {
    const color = (renderer as any).calculateDayNightColor(7, 0);
    // Should be between night and day colors
    expect(color).not.toBe('#1a2332');
    expect(color).not.toBe('#fef3c7');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should return dusk gradient color for hour 19', () => {
    const color = (renderer as any).calculateDayNightColor(19, 0);
    // Should be between day and night colors
    expect(color).not.toBe('#fef3c7');
    expect(color).not.toBe('#1a2332');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should interpolate color correctly', () => {
    const color = (renderer as any).interpolateColor('#000000', '#ffffff', 0.5);
    expect(color.toLowerCase()).toBe('#808080'); // Middle gray (127.5 rounds to 128)
  });

  it('should parse hex color to RGB', () => {
    const rgb = (renderer as any).hexToRgb('#ff00ff');
    expect(rgb).toEqual({ r: 255, g: 0, b: 255 });
  });
});

describe('MapRenderer - Color Conversion', () => {
  let canvas: HTMLCanvasElement;
  let renderer: MapRenderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    const mockContext = {
      fillRect: vi.fn(),
      fillText: vi.fn(),
    } as any;
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext);

    canvas.width = 800;
    canvas.height = 600;
    renderer = new MapRenderer(canvas, mockZones, { width: 800, height: 600 });
  });

  it('should convert HSL to hex correctly', () => {
    const hex = (renderer as any).hslToHex('hsl(180, 40%, 70%)');
    expect(hex).toBe('#94d1d1');
  });

  it('should handle decimal hue values', () => {
    const hex = (renderer as any).hslToHex('hsl(262.5, 40%, 70%)');
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    expect(hex).not.toBe('#000000');
  });

  it('should handle invalid HSL gracefully', () => {
    const hex = (renderer as any).hslToHex('invalid');
    expect(hex).toBe('#000000');
  });

  it('should handle grayscale colors (zero saturation)', () => {
    const hex = (renderer as any).hslToHex('hsl(0, 0%, 50%)');
    expect(hex).toBe('#808080');
  });

  it('should normalize hue values over 360', () => {
    // Hue 390 should be same as hue 30
    const hex1 = (renderer as any).hslToHex('hsl(390, 40%, 70%)');
    const hex2 = (renderer as any).hslToHex('hsl(30, 40%, 70%)');
    expect(hex1).toBe(hex2);
  });
});
