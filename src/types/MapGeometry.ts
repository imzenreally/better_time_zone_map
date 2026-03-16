import type { TimeZoneBoundary } from './Geography';

/**
 * Complete map geometry file structure.
 * Contains time zone boundary polygons for geographic rendering.
 */
export interface MapGeometry {
  /** Data version for cache invalidation */
  version: string;

  /** Attribution to data source */
  source: string;

  /** Whether polygons have been simplified */
  simplified: boolean;

  /** Simplification tolerance if simplified (degrees) */
  simplificationTolerance?: number;

  /** Array of time zone boundaries with polygon coordinates */
  boundaries: TimeZoneBoundary[];
}
