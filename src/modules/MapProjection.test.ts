import { describe, it, expect } from 'vitest';
import { MapProjection } from './MapProjection';

describe('MapProjection', () => {
  const canvasWidth = 1000;
  const canvasHeight = 500;

  describe('projectToCanvas', () => {
    it('should project prime meridian and equator to canvas center', () => {
      const result = MapProjection.projectToCanvas(0, 0, canvasWidth, canvasHeight);

      expect(result.x).toBeCloseTo(canvasWidth / 2, 1);
      expect(result.y).toBeCloseTo(canvasHeight / 2, 1);
    });

    it('should project -180 longitude to left edge', () => {
      const result = MapProjection.projectToCanvas(-180, 0, canvasWidth, canvasHeight);

      expect(result.x).toBeCloseTo(0, 1);
    });

    it('should project +180 longitude to right edge', () => {
      const result = MapProjection.projectToCanvas(180, 0, canvasWidth, canvasHeight);

      expect(result.x).toBeCloseTo(canvasWidth, 1);
    });

    it('should project known location: New York (-74, 40.7)', () => {
      const result = MapProjection.projectToCanvas(-74, 40.7, canvasWidth, canvasHeight);

      // NYC should be in western hemisphere, northern part
      expect(result.x).toBeLessThan(canvasWidth / 2); // West of prime meridian
      expect(result.y).toBeLessThan(canvasHeight / 2); // North of equator
    });

    it('should project northern extreme latitude (+90°)', () => {
      const result = MapProjection.projectToCanvas(0, 90, canvasWidth, canvasHeight);

      // Should project to top of canvas
      expect(result.x).toBeCloseTo(canvasWidth / 2, 1);
      expect(result.y).toBeCloseTo(0, 0);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeLessThanOrEqual(canvasHeight);
    });

    it('should project southern extreme latitude (-90°)', () => {
      const result = MapProjection.projectToCanvas(0, -90, canvasWidth, canvasHeight);

      // Should project to bottom of canvas
      expect(result.x).toBeCloseTo(canvasWidth / 2, 1);
      expect(result.y).toBeCloseTo(canvasHeight, 0);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeLessThanOrEqual(canvasHeight);
    });

    it('should project southern hemisphere location (-30, -45)', () => {
      const result = MapProjection.projectToCanvas(-30, -45, canvasWidth, canvasHeight);

      // Should be west of prime meridian and south of equator
      expect(result.x).toBeLessThan(canvasWidth / 2);
      expect(result.y).toBeGreaterThan(canvasHeight / 2);
    });
  });

  describe('unproject', () => {
    it('should unproject canvas center to equator and prime meridian', () => {
      const result = MapProjection.unproject(
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

      const canvas = MapProjection.projectToCanvas(
        originalLon,
        originalLat,
        canvasWidth,
        canvasHeight
      );

      const geo = MapProjection.unproject(
        canvas.x,
        canvas.y,
        canvasWidth,
        canvasHeight
      );

      expect(geo.lon).toBeCloseTo(originalLon, 1);
      expect(geo.lat).toBeCloseTo(originalLat, 1);
    });

    it('should round-trip extreme northern latitude (+89°)', () => {
      const originalLon = 0;
      const originalLat = 89;

      const canvas = MapProjection.projectToCanvas(
        originalLon,
        originalLat,
        canvasWidth,
        canvasHeight
      );

      const geo = MapProjection.unproject(
        canvas.x,
        canvas.y,
        canvasWidth,
        canvasHeight
      );

      expect(geo.lon).toBeCloseTo(originalLon, 1);
      expect(geo.lat).toBeCloseTo(originalLat, 0);
    });

    it('should round-trip extreme southern latitude (-89°)', () => {
      const originalLon = 0;
      const originalLat = -89;

      const canvas = MapProjection.projectToCanvas(
        originalLon,
        originalLat,
        canvasWidth,
        canvasHeight
      );

      const geo = MapProjection.unproject(
        canvas.x,
        canvas.y,
        canvasWidth,
        canvasHeight
      );

      expect(geo.lon).toBeCloseTo(originalLon, 1);
      expect(geo.lat).toBeCloseTo(originalLat, 0);
    });
  });
});
