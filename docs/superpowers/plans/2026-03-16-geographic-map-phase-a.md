# Geographic Map Rendering - Phase A Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace simple rectangle time zone visualization with accurate geographical map rendering using real time zone boundary polygons and Miller Cylindrical projection.

**Architecture:** Add MapProjection class for coordinate conversion, load GeoJSON time zone boundaries from timezone-boundary-builder, update MapRenderer to draw polygons instead of rectangles, maintain fallback to rectangle rendering if geometry fails to load.

**Tech Stack:** TypeScript, Canvas API, Miller Cylindrical projection, timezone-boundary-builder GeoJSON data, Turf.js (for simplification), Vitest (testing)

**Spec Reference:** `docs/superpowers/specs/2026-03-16-geographic-map-rendering.md`

---

## File Structure

**New files:**
- `src/modules/MapProjection.ts` - Miller Cylindrical coordinate projection (stateless utility)
- `src/modules/MapProjection.test.ts` - Unit tests for projection math
- `src/types/MapGeometry.ts` - Type definitions for map geometry data
- `src/data/map-geometry.json` - Simplified GeoJSON time zone boundary polygons (~300-500KB)
  - Note: This is a large data file but acceptable to commit directly since:
    - It's essential application data (not generated artifacts)
    - Size is optimized through simplification (< 1MB target)
    - Changes infrequently (updated only when timezone boundaries change)
- `scripts/simplify-geometry.js` - One-time script to download and simplify GeoJSON

**Modified files:**
- `src/modules/DataManager.ts` - Add loadMapGeometry() method
- `src/modules/MapRenderer.ts` - Add geographic rendering, polygon drawing, point-in-polygon detection
- `src/modules/UIController.ts` - Wire up geometry loading and pass to MapRenderer

**Existing files (reference only):**
- `src/types/Geography.ts` - Already has TimeZoneBoundary and Polygon interfaces
- `src/data/timezones.json` - Existing time zone data with coordinates for labels

---

## Task 1: Create MapProjection Class

**Files:**
- Create: `src/modules/MapProjection.ts`
- Create: `src/modules/MapProjection.test.ts`

### Step 1: Write failing test for forward projection

- [ ] **Create test file**

```typescript
// src/modules/MapProjection.test.ts
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
});
```

- [ ] **Run test to verify it fails**

```bash
npm test -- MapProjection.test.ts
```

Expected output:
```
FAIL src/modules/MapProjection.test.ts
  ● Test suite failed to run
    Cannot find module './MapProjection'
```

### Step 2: Implement MapProjection class with forward projection

- [ ] **Create MapProjection.ts**

```typescript
// src/modules/MapProjection.ts

/**
 * MapProjection handles coordinate transformation between geographic (lat/lon)
 * and canvas pixel coordinates using Miller Cylindrical projection.
 *
 * Miller Cylindrical provides a good balance between shape accuracy and
 * polar distortion, suitable for world overview maps.
 */
export class MapProjection {
  // Miller projection Y axis range (approximately -2.3 to 2.3)
  private static readonly MILLER_Y_MAX = 2.3;

  /**
   * Project geographic coordinates to canvas pixel coordinates.
   *
   * @param lon Longitude in degrees (-180 to 180)
   * @param lat Latitude in degrees (-90 to 90)
   * @param canvasWidth Width of canvas in pixels
   * @param canvasHeight Height of canvas in pixels
   * @returns Canvas coordinates {x, y}
   */
  projectToCanvas(
    lon: number,
    lat: number,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    // Convert degrees to radians
    const lonRad = (lon * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;

    // Miller Cylindrical projection formulas
    const x = lonRad;
    const y = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * latRad));

    // Map projection coordinates to canvas pixels
    // X: -π to π → 0 to canvasWidth
    const canvasX = ((x + Math.PI) / (2 * Math.PI)) * canvasWidth;

    // Y: MILLER_Y_MAX to -MILLER_Y_MAX → 0 to canvasHeight
    // (Inverted because canvas Y increases downward)
    const canvasY =
      ((MapProjection.MILLER_Y_MAX - y) / (2 * MapProjection.MILLER_Y_MAX)) *
      canvasHeight;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Unproject canvas pixel coordinates to geographic coordinates.
   *
   * @param canvasX Canvas X coordinate
   * @param canvasY Canvas Y coordinate
   * @param canvasWidth Width of canvas in pixels
   * @param canvasHeight Height of canvas in pixels
   * @returns Geographic coordinates {lon, lat}
   */
  unproject(
    canvasX: number,
    canvasY: number,
    canvasWidth: number,
    canvasHeight: number
  ): { lon: number; lat: number } {
    // Convert canvas pixels to projection coordinates
    const x = ((canvasX / canvasWidth) * 2 * Math.PI) - Math.PI;
    const y = MapProjection.MILLER_Y_MAX -
      ((canvasY / canvasHeight) * 2 * MapProjection.MILLER_Y_MAX);

    // Inverse Miller Cylindrical projection
    const lonRad = x;
    const latRad = 2.5 * (Math.atan(Math.exp(y / 1.25)) - Math.PI / 4);

    // Convert radians to degrees
    const lon = (lonRad * 180) / Math.PI;
    const lat = (latRad * 180) / Math.PI;

    return { lon, lat };
  }
}
```

- [ ] **Run test to verify it passes**

```bash
npm test -- MapProjection.test.ts
```

Expected output:
```
PASS src/modules/MapProjection.test.ts
  MapProjection
    projectToCanvas
      ✓ should project prime meridian and equator to canvas center
      ✓ should project -180 longitude to left edge
      ✓ should project +180 longitude to right edge
      ✓ should project known location: New York (-74, 40.7)

Test Suites: 1 passed, 1 total
```

### Step 3: Add tests for inverse projection

- [ ] **Add unproject tests**

```typescript
// Add to src/modules/MapProjection.test.ts

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
```

- [ ] **Run tests to verify they pass**

```bash
npm test -- MapProjection.test.ts
```

Expected: All 6 tests pass (4 forward + 2 inverse)

### Step 4: Commit MapProjection

- [ ] **Commit**

```bash
git add src/modules/MapProjection.ts src/modules/MapProjection.test.ts
git commit -m "feat: add MapProjection class with Miller Cylindrical projection

- Forward projection: lon/lat to canvas x/y
- Inverse projection: canvas x/y to lon/lat
- 6 unit tests covering edge cases and round-trip conversion
- MILLER_Y_MAX constant for projection bounds"
```

---

## Task 2: Add MapGeometry Type Definitions

**Files:**
- Create: `src/types/MapGeometry.ts`

### Step 1: Create MapGeometry types

- [ ] **Create type file**

```typescript
// src/types/MapGeometry.ts
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
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build
```

Expected: No type errors, build succeeds

### Step 2: Commit type definitions

- [ ] **Commit**

```bash
git add src/types/MapGeometry.ts
git commit -m "feat: add MapGeometry type definition

- Defines structure for map-geometry.json
- Includes version, source attribution, and simplification metadata
- References existing TimeZoneBoundary type from Geography.ts"
```

---

## Task 3: Acquire and Prepare Map Geometry Data

**Files:**
- Create: `scripts/simplify-geometry.js` (temporary script)
- Create: `src/data/map-geometry.json`

### Step 1: Install Turf.js for simplification

- [ ] **Install Turf dependency**

```bash
npm install --save-dev @turf/turf
```

### Step 2: Create simplification script

- [ ] **Create script**

```javascript
// scripts/simplify-geometry.js
import fs from 'fs';
import path from 'path';
import https from 'https';
import * as turf from '@turf/turf';

const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/evansiroky/timezone-boundary-builder/master/dist/combined-with-oceans.json';

const OUTPUT_PATH = 'src/data/map-geometry.json';

/**
 * Download timezone boundary GeoJSON from timezone-boundary-builder repo
 */
function downloadGeoJSON() {
  return new Promise((resolve, reject) => {
    console.log('Downloading timezone boundaries...');

    https.get(GITHUB_RAW_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`Downloaded ${json.features.length} time zones`);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Simplify polygon coordinates to reduce file size
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {number} tolerance - Simplification tolerance in degrees
 */
function simplifyGeoJSON(geojson, tolerance = 0.01) {
  console.log('Simplifying geometries...');

  const simplified = {
    ...geojson,
    features: geojson.features.map((feature, i) => {
      if (i % 50 === 0) {
        console.log(`  Processed ${i}/${geojson.features.length}`);
      }

      try {
        return turf.simplify(feature, { tolerance, highQuality: false });
      } catch (e) {
        console.warn(`Warning: Failed to simplify ${feature.properties.tzid}: ${e.message}`);
        return feature;
      }
    })
  };

  console.log('Simplification complete');
  return simplified;
}

/**
 * Convert GeoJSON to our MapGeometry format
 * @param {Object} geojson - Simplified GeoJSON FeatureCollection
 */
function convertToMapGeometry(geojson) {
  console.log('Converting to MapGeometry format...');

  const boundaries = geojson.features.map(feature => {
    const zoneId = feature.properties.tzid;
    const geometry = feature.geometry;

    let polygons = [];

    if (geometry.type === 'Polygon') {
      // Single polygon
      polygons = [{
        coordinates: geometry.coordinates[0] // Outer ring only
      }];
    } else if (geometry.type === 'MultiPolygon') {
      // Multiple polygons (zones split by date line, etc.)
      polygons = geometry.coordinates.map(poly => ({
        coordinates: poly[0] // Outer ring of each polygon
      }));
    }

    return {
      zoneId,
      polygons
    };
  });

  const mapGeometry = {
    version: '2024.1',
    source: 'timezone-boundary-builder',
    simplified: true,
    simplificationTolerance: 0.01,
    boundaries
  };

  console.log(`Converted ${boundaries.length} time zones`);
  return mapGeometry;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Download
    const geojson = await downloadGeoJSON();

    // Simplify
    const simplified = simplifyGeoJSON(geojson, 0.01);

    // Convert
    const mapGeometry = convertToMapGeometry(simplified);

    // Write output
    const output = JSON.stringify(mapGeometry, null, 2);
    fs.writeFileSync(OUTPUT_PATH, output);

    const sizeMB = (output.length / 1024 / 1024).toFixed(2);
    console.log(`\nWrote ${OUTPUT_PATH} (${sizeMB} MB)`);
    console.log(`Boundaries: ${mapGeometry.boundaries.length}`);

    // Verify file size is reasonable
    if (output.length > 1024 * 1024) {
      console.warn('\nWarning: File is larger than 1MB. Consider increasing simplification tolerance.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
```

### Step 3: Run simplification script

- [ ] **Execute script**

```bash
node scripts/simplify-geometry.js
```

Expected output:
```
Downloading timezone boundaries...
Downloaded 425 time zones
Simplifying geometries...
  Processed 0/425
  Processed 50/425
  ...
  Processed 400/425
Simplification complete
Converting to MapGeometry format...
Converted 425 time zones

Wrote src/data/map-geometry.json (0.45 MB)
Boundaries: 425
```

### Step 4: Verify geometry file structure

- [ ] **Check first zone in file**

```bash
head -50 src/data/map-geometry.json
```

Expected: Valid JSON with version, source, boundaries array

### Step 5: Commit map geometry data

- [ ] **Commit**

```bash
git add src/data/map-geometry.json
git commit -m "data: add simplified time zone boundary geometry

- 425 time zones from timezone-boundary-builder
- Simplified with 0.01 degree tolerance (~450KB)
- MultiPolygon support for zones split by date line
- Includes version and source attribution"
```

### Step 6: Clean up temporary script (optional)

**Note:** This step is optional. The script can be kept for future geometry updates.

If removing the script:
```bash
rm scripts/simplify-geometry.js
npm uninstall --save-dev @turf/turf
git add scripts/simplify-geometry.js package.json package-lock.json
git commit -m "chore: remove one-time geometry simplification script"
```

---

## Task 4: Update DataManager to Load Map Geometry

**Files:**
- Modify: `src/modules/DataManager.ts`

### Step 1: Add import for MapGeometry type

- [ ] **Add import**

```typescript
// At top of src/modules/DataManager.ts
import type { MapGeometry } from '../types/MapGeometry';
import type { TimeZoneBoundary } from '../types/Geography';
```

### Step 2: Add mapGeometry property

- [ ] **Add property to DataManager class**

```typescript
// In DataManager class
export class DataManager {
  private timeZones: TimeZone[] | null = null;
  private mapGeometry: TimeZoneBoundary[] | null = null; // NEW

  // ... existing methods
}
```

### Step 3: Write test for loadMapGeometry

- [ ] **Create/update DataManager.test.ts**

```typescript
// Add to src/modules/DataManager.test.ts (or create if doesn't exist)
import { describe, it, expect, beforeEach } from 'vitest';
import { DataManager } from './DataManager';

describe('DataManager - Map Geometry', () => {
  let dataManager: DataManager;

  beforeEach(() => {
    dataManager = new DataManager();
  });

  it('should load map geometry from JSON file', async () => {
    const geometry = await dataManager.loadMapGeometry();

    expect(geometry).toBeDefined();
    expect(Array.isArray(geometry)).toBe(true);
    expect(geometry.length).toBeGreaterThan(0);
  });

  it('should return boundaries with valid structure', async () => {
    const geometry = await dataManager.loadMapGeometry();
    const firstBoundary = geometry[0];

    expect(firstBoundary).toHaveProperty('zoneId');
    expect(firstBoundary).toHaveProperty('polygons');
    expect(Array.isArray(firstBoundary.polygons)).toBe(true);
    expect(firstBoundary.polygons[0]).toHaveProperty('coordinates');
  });

  it('should handle missing geometry file gracefully', async () => {
    // Save original fetch
    const originalFetch = global.fetch;

    // Mock fetch to simulate file not found
    global.fetch = async () => {
      throw new Error('File not found');
    };

    const geometry = await dataManager.loadMapGeometry();

    expect(geometry).toEqual([]);

    // Restore original fetch
    global.fetch = originalFetch;
  });
});
```

- [ ] **Run test to verify it fails**

```bash
npm test -- DataManager.test.ts
```

Expected: Tests fail with "loadMapGeometry is not a function"

### Step 4: Implement loadMapGeometry method

- [ ] **Add method to DataManager**

```typescript
// Add to DataManager class

/**
 * Load map geometry (time zone boundary polygons) from JSON file.
 * Used for geographic rendering of time zones.
 *
 * @returns Array of time zone boundaries, or empty array if loading fails
 */
async loadMapGeometry(): Promise<TimeZoneBoundary[]> {
  try {
    const response = await fetch('/src/data/map-geometry.json');

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data: MapGeometry = await response.json();

    // Validate structure
    if (!data.boundaries || !Array.isArray(data.boundaries)) {
      throw new Error('Invalid map geometry format: missing boundaries array');
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
```

### Step 5: Run tests to verify they pass

- [ ] **Run tests**

```bash
npm test -- DataManager.test.ts
```

Expected: All tests pass, including new map geometry tests

### Step 6: Commit DataManager updates

- [ ] **Commit**

```bash
git add src/modules/DataManager.ts src/modules/DataManager.test.ts
git commit -m "feat: add map geometry loading to DataManager

- loadMapGeometry() fetches and validates map-geometry.json
- Returns empty array on failure (graceful fallback)
- Validates zone IDs against existing timezones
- getZoneBoundary() query method
- Unit tests for loading and error handling"
```

---

## Task 5: Update MapRenderer with Geographic Rendering

**Files:**
- Modify: `src/modules/MapRenderer.ts`

### Step 1: Add imports and properties

- [ ] **Add imports**

```typescript
// At top of src/modules/MapRenderer.ts
import { MapProjection } from './MapProjection';
import type { TimeZoneBoundary, Polygon } from '../types/Geography';
```

- [ ] **Add properties to MapRenderer class**

```typescript
export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timeZones: TimeZone[];
  private timeZoneEngine: TimeZoneEngine | null = null;
  private theme: 'light' | 'dark' = 'light';

  // NEW: Geographic rendering support
  private mapGeometry: TimeZoneBoundary[] | null = null;
  private projection: MapProjection;

  constructor(canvas: HTMLCanvasElement, timeZones: TimeZone[], options: MapRendererOptions) {
    this.canvas = canvas;
    this.timeZones = timeZones;
    this.projection = new MapProjection(); // NEW

    // ... rest of existing constructor
  }
}
```

### Step 2: Add setMapGeometry method

- [ ] **Add setter method**

```typescript
// Add to MapRenderer class

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
```

### Step 3: Update render() to dispatch between modes

- [ ] **Update render method**

```typescript
// Replace existing render() method

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
```

### Step 4: Implement drawGeographicMap method

- [ ] **Add new rendering method**

```typescript
// Add to MapRenderer class

/**
 * Draw time zones using geographic polygons with accurate boundaries.
 * Each zone is filled with its color (offset-based + day/night gradient).
 */
private drawGeographicMap(): void {
  // Safety check (should be guaranteed by render() but be defensive)
  if (!this.mapGeometry) return;

  this.timeZones.forEach((zone) => {
    // Find boundary data for this zone
    const boundary = this.mapGeometry.find(b => b.zoneId === zone.id);
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
    const { x, y } = this.projection.projectToCanvas(
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
  const { x, y } = this.projection.projectToCanvas(
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
```

### Step 5: Test visual rendering

- [ ] **Manual test - Start dev server**

```bash
npm run dev
```

- [ ] **Visual verification checklist**

Open http://localhost:5173 and verify:
- ✅ World map visible (continents/oceans recognizable)
- ✅ Time zones colored by offset (rainbow across map)
- ✅ Day/night gradients visible on zones
- ✅ Zone abbreviations visible and positioned in correct regions
- ✅ Dark mode toggle works (background + text contrast)
- ✅ No console errors about missing boundaries

### Step 6: Commit geographic rendering

- [ ] **Commit**

```bash
git add src/modules/MapRenderer.ts
git commit -m "feat: add geographic map rendering to MapRenderer

- Add MapProjection instance for coordinate conversion
- setMapGeometry() to provide boundary polygons
- drawGeographicMap() renders zones as actual polygons
- drawPolygon() converts lat/lon to canvas coordinates
- drawZoneLabel() positions labels using projection
- Maintains fallback to drawSimpleMap() if geometry unavailable
- Uses existing color and gradient logic"
```

---

## Task 6: Update Click Detection with Point-in-Polygon

**Files:**
- Modify: `src/modules/MapRenderer.ts`

### Step 1: Write test for point-in-polygon algorithm

- [ ] **Create MapRenderer.test.ts (or add to existing)**

```typescript
// src/modules/MapRenderer.test.ts
import { describe, it, expect } from 'vitest';
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
```

- [ ] **Run test to verify it fails**

```bash
npm test -- MapRenderer.test.ts
```

Expected: Tests fail with "isPointInPolygon is not a function"

### Step 2: Implement point-in-polygon algorithm

- [ ] **Add method to MapRenderer**

```typescript
// Add to MapRenderer class

/**
 * Test if a geographic point is inside a polygon using ray casting algorithm.
 *
 * @param lon Point longitude
 * @param lat Point latitude
 * @param coordinates Polygon coordinates [[lon, lat], ...]
 * @returns true if point is inside polygon
 */
private isPointInPolygon(
  lon: number,
  lat: number,
  coordinates: [number, number][]
): boolean {
  let inside = false;

  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i];
    const [xj, yj] = coordinates[j];

    // Ray casting: cast horizontal ray from point to right
    // Count intersections with polygon edges
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}
```

### Step 3: Run tests to verify they pass

- [ ] **Run tests**

```bash
npm test -- MapRenderer.test.ts
```

Expected: All point-in-polygon tests pass

### Step 4: Update getZoneAtPosition to use polygon detection

- [ ] **Replace getZoneAtPosition method**

```typescript
// Replace existing getZoneAtPosition method

/**
 * Determine which time zone is at the given canvas position.
 * Uses point-in-polygon testing for geographic rendering,
 * falls back to rectangle detection for simple rendering.
 *
 * @param canvasX Canvas X coordinate (pixels)
 * @param canvasY Canvas Y coordinate (pixels)
 * @returns TimeZone at position, or null if none
 */
getZoneAtPosition(canvasX: number, canvasY: number): TimeZone | null {
  // Use geographic detection if geometry available
  if (this.mapGeometry && this.mapGeometry.length > 0) {
    return this.getZoneAtPositionGeographic(canvasX, canvasY);
  }

  // Fallback to rectangle detection
  return this.getZoneAtPositionSimple(canvasX, canvasY);
}

/**
 * Geographic zone detection using point-in-polygon testing.
 */
private getZoneAtPositionGeographic(
  canvasX: number,
  canvasY: number
): TimeZone | null {
  // Convert canvas position to geographic coordinates
  const { lon, lat } = this.projection.unproject(
    canvasX,
    canvasY,
    this.canvas.width,
    this.canvas.height
  );

  // Test each zone's polygons
  for (const zone of this.timeZones) {
    const boundary = this.mapGeometry!.find(b => b.zoneId === zone.id);
    if (!boundary) continue;

    // Test each polygon in this zone
    for (const polygon of boundary.polygons) {
      if (this.isPointInPolygon(lon, lat, polygon.coordinates)) {
        return zone;
      }
    }
  }

  return null;
}

/**
 * Simple rectangle-based zone detection (fallback).
 * This is the EXISTING logic from drawSimpleMap(), extracted into a method.
 * No changes to the algorithm - just refactored for reuse.
 */
private getZoneAtPositionSimple(
  canvasX: number,
  canvasY: number
): TimeZone | null {
  // This logic already exists in the codebase - we're just extracting it
  const zoneWidth = this.canvas.width / 24;

  for (const zone of this.timeZones) {
    const hourOffset = zone.offset / 60;
    const zoneX = ((hourOffset + 12) / 24) * this.canvas.width;
    const zoneLeft = zoneX - zoneWidth / 2;
    const zoneRight = zoneX + zoneWidth / 2;
    const zoneTop = this.canvas.height * 0.3;
    const zoneBottom = this.canvas.height * 0.7;

    if (
      canvasX >= zoneLeft &&
      canvasX <= zoneRight &&
      canvasY >= zoneTop &&
      canvasY <= zoneBottom
    ) {
      return zone;
    }
  }

  return null;
}
```

### Step 5: Manual test click detection

- [ ] **Test in browser**

With dev server running:
1. Click various points on the map
2. Verify correct zone detected (tooltip shows correct zone name)
3. Test clicking on different continents
4. Test clicking oceans (should return null, no tooltip)
5. Test clicking small zones (islands, narrow regions)

### Step 6: Commit click detection

- [ ] **Commit**

```bash
git add src/modules/MapRenderer.ts src/modules/MapRenderer.test.ts
git commit -m "feat: add point-in-polygon click detection for geographic map

- Implement ray casting algorithm for point-in-polygon testing
- getZoneAtPosition() dispatches between geographic and simple modes
- getZoneAtPositionGeographic() uses unproject + polygon testing
- Maintains getZoneAtPositionSimple() as fallback
- Unit tests for polygon detection algorithm
- Handles multi-polygon zones correctly"
```

---

## Task 7: Integrate Map Geometry in UIController

**Files:**
- Modify: `src/modules/UIController.ts`

### Step 1: Load map geometry during initialization

- [ ] **Update initialize() method**

```typescript
// In UIController.initialize() method
// Add after loading time zones and before initializing MapRenderer

async initialize(): Promise<void> {
  try {
    // Step 1: Load time zone data
    this.dataManager = new DataManager();
    this.timeZones = await this.dataManager.loadTimeZones();

    // Step 2: Initialize TimeZoneEngine
    this.timeZoneEngine = new TimeZoneEngine(this.timeZones);

    // Step 2.3: Load map geometry for geographic rendering (NEW)
    const mapGeometry = await this.dataManager.loadMapGeometry();
    console.log(`Loaded map geometry: ${mapGeometry.length} zones`);

    // Step 2.5: Load persisted pinned zones
    this.loadPinnedZones();

    // ... rest of existing initialization
```

### Step 2: Pass geometry to MapRenderer

- [ ] **Update MapRenderer initialization**

```typescript
// In UIController.initialize() method
// Find where MapRenderer is created and add geometry

// Step 3: Initialize MapRenderer with canvas dimensions
const { width, height } = this.getCanvasDimensions();
this.mapRenderer = new MapRenderer(this.canvas, this.timeZones, {
  width,
  height,
});

// Set TimeZoneEngine reference
this.mapRenderer.setTimeZoneEngine(this.timeZoneEngine);

// NEW: Set map geometry for geographic rendering
if (mapGeometry.length > 0) {
  this.mapRenderer.setMapGeometry(mapGeometry);
} else {
  console.warn('No map geometry loaded - using fallback rectangle rendering');
}
```

- [ ] **Add mapGeometry property**

```typescript
// Add property to UIController class
export class UIController {
  private canvas: HTMLCanvasElement;
  private tooltip: HTMLElement;
  private dataManager: DataManager | null = null;
  private timeZoneEngine: TimeZoneEngine | null = null;
  private mapRenderer: MapRenderer | null = null;
  // ... other properties
  private mapGeometry: TimeZoneBoundary[] = []; // NEW
```

- [ ] **Cache geometry in initialize() method**

```typescript
// In UIController.initialize() after loading geometry:
const mapGeometry = await this.dataManager.loadMapGeometry();
this.mapGeometry = mapGeometry; // Cache for resize handler
console.log(`Loaded map geometry: ${mapGeometry.length} zones`);
```

### Step 4: Update handleWindowResize to restore geometry

- [ ] **Update resize handler to use cached geometry**

```typescript
// In UIController.handleWindowResize() method

private handleWindowResize(): void {
  if (!this.mapRenderer || !this.timeZones) {
    return;
  }

  try {
    // Get new canvas dimensions
    const { width, height } = this.getCanvasDimensions();

    // Recreate renderer with new dimensions
    this.mapRenderer = new MapRenderer(this.canvas, this.timeZones, {
      width,
      height,
    });

    // Restore TimeZoneEngine reference
    if (this.timeZoneEngine) {
      this.mapRenderer.setTimeZoneEngine(this.timeZoneEngine);
    }

    // Restore map geometry from cache
    if (this.mapGeometry.length > 0) {
      this.mapRenderer.setMapGeometry(this.mapGeometry);
    }

    // Set theme
    this.mapRenderer.setTheme(this.state.theme);

    // Re-render the map
    this.mapRenderer.render();

    console.log(`Canvas resized to ${width}x${height}`);
  } catch (error) {
    console.error('Error handling window resize:', error);
  }
}
```

### Step 5: Test full integration

- [ ] **Manual integration test**

```bash
npm run dev
```

Test checklist:
- ✅ App loads without errors
- ✅ Geographic map renders (not rectangles)
- ✅ All 32 time zones visible
- ✅ Colors and gradients work
- ✅ Search works (click result → map shows zone)
- ✅ Pinning works (click zone → adds to panel)
- ✅ Dark mode toggle works
- ✅ Clock updates every second
- ✅ Resize window → map redraws correctly
- ✅ Click detection accurate

### Step 6: Commit UIController integration

- [ ] **Commit**

```bash
git add src/modules/UIController.ts
git commit -m "feat: integrate map geometry loading in UIController

- Load map geometry during initialization
- Pass geometry to MapRenderer via setMapGeometry()
- Cache geometry for window resize handling
- Graceful fallback if geometry loading fails
- Full integration with existing features (search, pinning, themes)"
```

---

## Task 8: End-to-End Visual Verification and Testing

**Files:**
- None (manual testing only)

### Step 1: Run all unit tests

- [ ] **Execute test suite**

```bash
npm test
```

Expected: All tests pass
- MapProjection tests (6 tests)
- DataManager tests (3+ tests)
- MapRenderer tests (4+ polygon tests)
- Existing tests still pass

### Step 2: Comprehensive visual testing

- [ ] **Start dev server**

```bash
npm run dev
```

- [ ] **Test geographic rendering**

Visual checklist:
- ✅ Continents recognizable (Africa, Americas, Europe, Asia, Australia)
- ✅ Oceans properly separated
- ✅ Time zones colored appropriately (rainbow of offsets)
- ✅ Alaska and Russia show as multi-polygon (split by date line)
- ✅ Small islands visible (New Zealand, Hawaii, Japan)
- ✅ Zone labels positioned correctly over their regions

- [ ] **Test day/night gradients**

Checklist:
- ✅ Gradients apply to geographic polygons (not rectangles)
- ✅ Sunrise/sunset colors blend with base colors
- ✅ Night zones appear darker
- ✅ Day zones appear brighter
- ✅ Gradients update every minute

- [ ] **Test dark mode**

Checklist:
- ✅ Toggle to dark mode (black background)
- ✅ Map still visible with good contrast
- ✅ Zone labels readable (white with black stroke)
- ✅ Panel and search bar styled correctly
- ✅ Toggle back to light mode works

- [ ] **Test search functionality**

Checklist:
- ✅ Search for "New York" → finds EST zone
- ✅ Search for "Tokyo" → finds JST zone
- ✅ Search for "London" → finds GMT zone
- ✅ Click search result → zone highlighted (tooltip appears)
- ✅ Search for city not in data → "No results"

- [ ] **Test pinning zones**

Checklist:
- ✅ Click zone on map → adds to pinned panel
- ✅ Pinned zone shows live updating time
- ✅ Pin multiple zones (up to 10)
- ✅ Unpin zone (× button) → removes from panel
- ✅ Pinned zones persist across page reload

- [ ] **Test click detection accuracy**

Click these locations and verify correct zone detected:
- ✅ Click New York City area → EST
- ✅ Click London area → GMT
- ✅ Click Tokyo area → JST
- ✅ Click Mumbai area → IST
- ✅ Click Sydney area → AEDT
- ✅ Click Atlantic Ocean → no zone (no tooltip)
- ✅ Click small island (Iceland, New Zealand) → correct zone

- [ ] **Test edge cases**

Checklist:
- ✅ Resize browser window → map redraws correctly
- ✅ Refresh page → map loads correctly
- ✅ Slow network simulation (throttle in DevTools) → fallback works?
- ✅ Disable JavaScript → static page with error message (expected)

### Step 3: Performance check

- [ ] **Open browser DevTools Performance tab**

- [ ] **Profile rendering**

Test:
1. Click "Record" in Performance tab
2. Move mouse around map (triggers render updates)
3. Stop recording after 5 seconds
4. Check FPS (should be close to 60fps)
5. Check render time (should be < 16ms per frame)

Expected: Smooth performance, no dropped frames

- [ ] **Check memory usage**

Test:
1. Open Memory tab
2. Take heap snapshot
3. Use app for 1 minute (search, pin, hover)
4. Take another snapshot
5. Check for memory leaks (retained objects)

Expected: Memory usage stable, no significant leaks

### Step 4: Browser compatibility

- [ ] **Test in multiple browsers** (if available)

Browsers to test:
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari (macOS)
- ✅ Edge

Each browser checklist:
- Map renders correctly
- Click detection works
- No console errors

### Step 5: Document any issues found

- [ ] **Create issues for follow-ups** (if needed)

Note any problems:
- Performance issues on low-end devices
- Visual artifacts in specific browsers
- Click detection accuracy problems
- Missing time zones or incorrect boundaries

### Step 6: Final commit

- [ ] **Commit any bug fixes or adjustments**

```bash
git add -A
git commit -m "test: verify geographic map rendering Phase A

- All unit tests passing
- Visual verification complete across features
- Performance acceptable (60fps rendering)
- Click detection accurate
- Browser compatibility confirmed
- Ready for production"
```

---

## Verification Checklist

Before considering Phase A complete, verify:

**Functionality:**
- ✅ World map renders with recognizable geography
- ✅ All 32 time zones visible and correctly colored
- ✅ Day/night gradients apply to geographic polygons
- ✅ Click detection accurately identifies zones
- ✅ Search finds and highlights zones correctly
- ✅ Pinning works with geographic rendering
- ✅ Dark mode renders properly
- ✅ Fallback to rectangles works if geometry fails

**Code Quality:**
- ✅ MapProjection class with unit tests
- ✅ DataManager loads and validates geometry
- ✅ MapRenderer draws polygons correctly
- ✅ Point-in-polygon algorithm tested
- ✅ UIController integrates all components
- ✅ All existing features still work
- ✅ No console errors or warnings

**Performance:**
- ✅ Initial load < 3 seconds
- ✅ Rendering maintains 60fps
- ✅ No memory leaks
- ✅ Responsive on resize

**Documentation:**
- ✅ Code comments explain complex logic
- ✅ Type definitions clear and complete
- ✅ Commit messages descriptive

---

## Next Steps

After Phase A is complete and verified:

1. **Optional: Performance optimization** (if needed)
   - Off-screen canvas for static geometry
   - Viewport culling for off-screen polygons
   - Level-of-detail (simplified polygons at world view)

2. **Phase B: Pan/Zoom Interactions**
   - Add viewport state to AppState
   - Implement pan event handlers (mouse drag)
   - Implement zoom event handlers (scroll wheel)
   - Apply canvas transforms in render()
   - Add reset button
   - Create separate plan: `2026-03-16-geographic-map-phase-b.md`

3. **Production deployment**
   - Build for production: `npm run build`
   - Test production build
   - Deploy to hosting (Vercel, Netlify, GitHub Pages)

---

## Notes

**Miller Cylindrical Projection:**
- Y range: approximately -2.3 to 2.3 (not infinite like Mercator)
- Good compromise between shape accuracy and distortion
- Latitude bounds: -85° to 85° (polar regions clipped)

**GeoJSON Simplification:**
- Tolerance 0.01 degrees ≈ 1km at equator
- Balance between file size and visual quality
- Can adjust tolerance if file too large/small

**Fallback Rendering:**
- Essential for reliability
- Keeps drawSimpleMap() method unchanged
- App always functional even if geometry fails

**Testing Philosophy:**
- Unit test pure logic (projection, point-in-polygon)
- Manual visual verification for rendering
- Integration testing for end-to-end flow

**Git Strategy:**
- Frequent small commits per component
- Each commit builds on previous (incremental)
- Easy to bisect if issues found
- Clear history for future reference
