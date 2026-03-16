import { describe, it, expect } from 'vitest';
import { MapProjection } from './MapProjection';

describe('MapProjection', () => {
  const projection = new MapProjection();
  const canvasWidth = 1000;
  const canvasHeight = 500;

  describe('projectToCanvas', () => {
    it('should project prime meridian and equator to canvas center', () => {
      const result = projection.projectToCanvas(0, 0, canvasWidth, canvasHeight);

      expect(result.x).toBeCloseTo(canvasWidth / 2, 1);
      expect(result.y).toBeCloseTo(canvasHeight / 2, 1);
    });

    it('should project -180 longitude to left edge', () => {
      const result = projection.projectToCanvas(-180, 0, canvasWidth, canvasHeight);

      expect(result.x).toBeCloseTo(0, 1);
    });

    it('should project +180 longitude to right edge', () => {
      const result = projection.projectToCanvas(180, 0, canvasWidth, canvasHeight);

      expect(result.x).toBeCloseTo(canvasWidth, 1);
    });

    it('should project known location: New York (-74, 40.7)', () => {
      const result = projection.projectToCanvas(-74, 40.7, canvasWidth, canvasHeight);

      // NYC should be in western hemisphere, northern part
      expect(result.x).toBeLessThan(canvasWidth / 2); // West of prime meridian
      expect(result.y).toBeLessThan(canvasHeight / 2); // North of equator
    });
  });

  describe('unproject', () => {
    it('should unproject canvas center to equator and prime meridian', () => {
      const result = projection.unproject(
        canvasWidth / 2,
        canvasHeight / 2,
        canvasWidth,
        canvasHeight
      );

      expect(result.lon).toBeCloseTo(0, 1);
      expect(result.lat).toBeCloseTo(0, 1);
    });

    it('should round-trip: project then unproject', () => {
      const originalLon = -74;
      const originalLat = 40.7;

      const canvas = projection.projectToCanvas(
        originalLon,
        originalLat,
        canvasWidth,
        canvasHeight
      );

      const geo = projection.unproject(
        canvas.x,
        canvas.y,
        canvasWidth,
        canvasHeight
      );

      expect(geo.lon).toBeCloseTo(originalLon, 1);
      expect(geo.lat).toBeCloseTo(originalLat, 1);
    });
  });
});
