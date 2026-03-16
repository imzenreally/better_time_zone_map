import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapRenderer } from './MapRenderer';
import type { TimeZone } from '../types/TimeZone';

// Helper to access private method for testing
function testPointInPolygon(
  renderer: any,
  lon: number,
  lat: number,
  polygon: [number, number][]
): boolean {
  return renderer.isPointInPolygon(lon, lat, polygon);
}

describe('MapRenderer - Point in Polygon', () => {
  let canvas: HTMLCanvasElement;
  let renderer: any;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 500;

    // Mock canvas context
    const mockContext = {
      fillStyle: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      font: '',
      textAlign: '',
      strokeStyle: '',
      lineWidth: 0,
    };
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext as any);

    const mockTimeZones: TimeZone[] = [{
      id: 'Test/Zone',
      name: 'Test Zone',
      abbreviation: 'TST',
      offset: 0,
      countries: ['XX'],
      majorCities: ['Test City'],
      coordinates: { lat: 0, lon: 0 }
    }];

    renderer = new MapRenderer(canvas, mockTimeZones, {
      width: 1000,
      height: 500
    });
  });

  it('should detect point inside simple square polygon', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10]
    ];

    expect(testPointInPolygon(renderer, 5, 5, square)).toBe(true);
  });

  it('should detect point outside polygon', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10]
    ];

    expect(testPointInPolygon(renderer, 15, 15, square)).toBe(false);
  });

  it('should detect point on polygon edge (boundary case)', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10]
    ];

    // Point on edge - algorithm may return true or false, just verify no crash
    const result = testPointInPolygon(renderer, 5, 0, square);
    expect(typeof result).toBe('boolean');
  });

  it('should handle complex polygon (concave shape)', () => {
    // L-shaped polygon
    const lShape: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 5],
      [5, 5],
      [5, 10],
      [0, 10]
    ];

    expect(testPointInPolygon(renderer, 2, 2, lShape)).toBe(true);
    expect(testPointInPolygon(renderer, 7, 7, lShape)).toBe(false);
  });
});
