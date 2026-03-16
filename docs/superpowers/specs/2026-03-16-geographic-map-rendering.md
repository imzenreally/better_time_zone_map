# Geographic Map Rendering - Design Specification

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Date:** 2026-03-16
**Status:** Approved
**Goal:** Replace simple rectangle time zone visualization with accurate geographical map rendering showing actual time zone boundaries.

## Overview

The current implementation uses simple vertical rectangles positioned by UTC offset to represent time zones. This works functionally but doesn't show geographical reality—users can't see where zones actually are on the map. This spec adds proper geographical rendering with actual world map shapes and accurate time zone boundary polygons.

**Implementation Approach:** Progressive enhancement in two phases
- **Phase A**: Geographic map rendering (detailed boundaries, Miller projection)
- **Phase B**: Pan/zoom interactions (full interactive controls)

This allows shipping the geographical map immediately while deferring complex interactions to a follow-up phase.

## Architecture

### Phase A: Geographic Map Rendering

Replace rectangle-based rendering with polygon-based geographical rendering while maintaining all existing features (search, pinning, day/night gradients, dark mode).

**What changes:**
- Add map-geometry.json with time zone boundary polygons
- Add MapProjection class for Miller Cylindrical coordinate conversion
- Update MapRenderer to draw polygons instead of rectangles
- Update click detection to use point-in-polygon testing

**What stays the same:**
- Color calculation and day/night gradients
- Search functionality
- Pinned zones panel
- Theme system
- Clock updates
- All existing UIController logic

### Phase B: Pan/Zoom Interactions

Add full interactive map controls allowing users to pan around the world and zoom into specific regions.

**Additions:**
- Viewport state (center position, zoom level)
- Mouse drag handlers for panning
- Scroll wheel handlers for zooming
- Canvas transform stack for rendering at different scales
- Reset button to return to default view

---

## Data Structures

### Map Geometry File

**File:** `src/data/map-geometry.json`
**Size target:** 300-500KB (after simplification)
**Source:** timezone-boundary-builder GeoJSON (simplified)

```json
{
  "version": "2024.1",
  "source": "timezone-boundary-builder",
  "simplified": true,
  "simplificationTolerance": 0.01,
  "boundaries": [
    {
      "zoneId": "America/New_York",
      "polygons": [
        {
          "coordinates": [
            [-74.006, 40.7128],
            [-73.935, 40.730],
            [-73.900, 40.715]
          ]
        }
      ]
    }
  ]
}
```

**Structure:**
- `version`: Data version for cache invalidation
- `source`: Attribution to timezone-boundary-builder
- `simplified`: Boolean indicating if polygons were simplified
- `simplificationTolerance`: Tolerance value used for simplification
- `boundaries`: Array of time zone boundaries
  - `zoneId`: IANA time zone identifier (matches timezones.json)
  - `polygons`: Array of polygons (some zones split by date line)
    - `coordinates`: Array of [longitude, latitude] pairs

**Simplification strategy:**
1. Download full GeoJSON from timezone-boundary-builder GitHub repo
2. Use Turf.js `simplify()` with tolerance ~0.01 degrees
3. Test rendering quality vs file size trade-off
4. Maintain recognizable shapes at default zoom level
5. Handle multi-polygon zones (Russia, Alaska crossing date line)

### TypeScript Interfaces

**Already defined in Geography.ts:**
```typescript
export interface TimeZoneBoundary {
  zoneId: string;
  polygons: Polygon[];
}

export interface Polygon {
  coordinates: [number, number][]; // [lon, lat]
}
```

**New interface for map geometry file:**
```typescript
export interface MapGeometry {
  version: string;
  source: string;
  simplified: boolean;
  simplificationTolerance?: number;
  boundaries: TimeZoneBoundary[];
}
```

### AppState Updates (Phase B)

```typescript
interface AppState {
  // ... existing fields
  mapViewport: {
    centerLon: number;  // -180 to 180
    centerLat: number;  // -85 to 85 (Miller bounds)
    zoomLevel: number;  // 0.5 (zoomed out) to 10 (zoomed in)
  };
}
```

**Default viewport:**
```typescript
DEFAULT_APP_STATE.mapViewport = {
  centerLon: 0,    // Prime meridian
  centerLat: 0,    // Equator
  zoomLevel: 1     // World view
};
```

---

## Map Projection

### Miller Cylindrical Projection

**Why Miller?**
- Better shape representation than Equirectangular
- Less polar distortion than Mercator
- Familiar appearance to users
- Good compromise for world overview

**Projection Formulas:**

```typescript
class MapProjection {
  /**
   * Project geographic coordinates to canvas pixel coordinates
   * Using Miller Cylindrical projection
   */
  projectToCanvas(
    lon: number,      // Longitude: -180 to 180
    lat: number,      // Latitude: -90 to 90
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    // Convert degrees to radians
    const lonRad = lon * Math.PI / 180;
    const latRad = lat * Math.PI / 180;

    // Miller Cylindrical projection
    const x = lonRad;
    const y = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * latRad));

    // Miller Y range is approximately -2.3 to 2.3
    const MILLER_Y_MAX = 2.3;

    // Map to canvas coordinates
    // X: -π to π → 0 to canvasWidth
    const canvasX = (x + Math.PI) / (2 * Math.PI) * canvasWidth;

    // Y: 2.3 to -2.3 → 0 to canvasHeight (inverted for canvas)
    const canvasY = (MILLER_Y_MAX - y) / (2 * MILLER_Y_MAX) * canvasHeight;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Inverse projection: canvas pixel to geographic coordinates
   * Used for click detection and viewport calculations
   */
  unproject(
    canvasX: number,
    canvasY: number,
    canvasWidth: number,
    canvasHeight: number
  ): { lon: number; lat: number } {
    const MILLER_Y_MAX = 2.3;

    // Convert canvas to projection coordinates
    const x = (canvasX / canvasWidth) * 2 * Math.PI - Math.PI;
    const y = MILLER_Y_MAX - (canvasY / canvasHeight) * 2 * MILLER_Y_MAX;

    // Inverse Miller projection
    const lonRad = x;
    const latRad = 2.5 * (Math.atan(Math.exp(y / 1.25)) - Math.PI / 4);

    // Convert radians to degrees
    const lon = lonRad * 180 / Math.PI;
    const lat = latRad * 180 / Math.PI;

    return { lon, lat };
  }
}
```

**Implementation as separate class:**
- Single responsibility: coordinate transformation
- Stateless: no viewport state (Phase A)
- Reusable: MapRenderer and UIController can both use
- Testable: pure functions, easy to unit test

---

## MapRenderer Updates

### Phase A: Geographic Rendering

**New properties:**
```typescript
class MapRenderer {
  private mapGeometry: TimeZoneBoundary[] | null = null;
  private projection: MapProjection;

  constructor(canvas: HTMLCanvasElement, timeZones: TimeZone[], options: MapRendererOptions) {
    // ... existing constructor
    this.projection = new MapProjection();
  }

  setMapGeometry(geometry: TimeZoneBoundary[]): void {
    this.mapGeometry = geometry;
  }
}
```

**Updated render method:**
```typescript
render(): void {
  // Clear canvas
  this.ctx.fillStyle = this.theme === 'dark' ? '#0a0a0a' : '#e8f4f8';
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

  if (!this.mapGeometry) {
    // Fallback to rectangle rendering if geometry not loaded
    this.drawSimpleMap();
    return;
  }

  // Draw geographic map
  this.drawGeographicMap();
}
```

**New drawGeographicMap method:**
```typescript
private drawGeographicMap(): void {
  // Draw each time zone as polygons
  this.timeZones.forEach(zone => {
    const boundary = this.mapGeometry!.find(b => b.zoneId === zone.id);
    if (!boundary) {
      console.warn(`No boundary data for zone: ${zone.id}`);
      return;
    }

    // Calculate zone color (existing logic)
    const baseColorHSL = this.getZoneColor(zone);
    const baseColor = this.hslToHex(baseColorHSL);

    // Apply day/night gradient if available
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
    this.drawZoneLabel(zone, boundary);
  });
}
```

**Draw polygon helper:**
```typescript
private drawPolygon(coordinates: [number, number][]): void {
  if (coordinates.length < 3) return; // Invalid polygon

  this.ctx.beginPath();

  coordinates.forEach((coord, index) => {
    const [lon, lat] = coord;
    const { x, y } = this.projection.projectToCanvas(
      lon, lat,
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
```

**Zone label positioning:**
```typescript
private drawZoneLabel(zone: TimeZone, boundary: TimeZoneBoundary): void {
  // Option 1: Use zone.coordinates (existing representative point)
  const { x, y } = this.projection.projectToCanvas(
    zone.coordinates.lon,
    zone.coordinates.lat,
    this.canvas.width,
    this.canvas.height
  );

  // Draw label with stroke for visibility (existing code)
  this.ctx.font = '12px sans-serif';
  this.ctx.textAlign = 'center';

  // Stroke
  this.ctx.strokeStyle = this.theme === 'dark' ? '#000000' : '#ffffff';
  this.ctx.lineWidth = 3;
  this.ctx.strokeText(zone.abbreviation, x, y);

  // Fill
  this.ctx.fillStyle = this.theme === 'dark' ? '#e8e8e8' : '#1a1a1a';
  this.ctx.fillText(zone.abbreviation, x, y);
}
```

### Updated Click Detection

**Replace getZoneAtPosition with point-in-polygon:**
```typescript
getZoneAtPosition(canvasX: number, canvasY: number): TimeZone | null {
  if (!this.mapGeometry) {
    // Fallback to rectangle detection
    return this.getZoneAtPositionSimple(canvasX, canvasY);
  }

  // Convert canvas position to geographic coordinates
  const { lon, lat } = this.projection.unproject(
    canvasX, canvasY,
    this.canvas.width, this.canvas.height
  );

  // Test each zone's polygons
  for (const zone of this.timeZones) {
    const boundary = this.mapGeometry.find(b => b.zoneId === zone.id);
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

private isPointInPolygon(
  lon: number,
  lat: number,
  coordinates: [number, number][]
): boolean {
  // Ray casting algorithm
  let inside = false;

  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i];
    const [xj, yj] = coordinates[j];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}
```

### Fallback Support

**Keep existing drawSimpleMap:**
```typescript
private drawSimpleMap(): void {
  // Existing rectangle-based rendering
  // Used if map-geometry.json fails to load
  // Ensures app remains functional
  const zoneWidth = this.canvas.width / 24;
  // ... rest of existing code
}
```

---

## DataManager Updates

### Load Map Geometry

**New method:**
```typescript
async loadMapGeometry(): Promise<TimeZoneBoundary[]> {
  try {
    const response = await fetch('/src/data/map-geometry.json');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data: MapGeometry = await response.json();

    // Validate structure
    if (!data.boundaries || !Array.isArray(data.boundaries)) {
      throw new Error('Invalid map geometry format');
    }

    // Validate zone IDs match existing timezones
    const validZoneIds = new Set(this.timeZones.map(z => z.id));
    const invalidZones = data.boundaries.filter(
      b => !validZoneIds.has(b.zoneId)
    );

    if (invalidZones.length > 0) {
      console.warn('Map geometry contains unknown zones:',
        invalidZones.map(z => z.zoneId));
    }

    return data.boundaries;
  } catch (error) {
    console.error('Failed to load map geometry:', error);
    // Return empty array - app will use fallback rendering
    return [];
  }
}
```

**Query method:**
```typescript
getZoneBoundary(zoneId: string): TimeZoneBoundary | null {
  if (!this.mapGeometry) return null;
  return this.mapGeometry.find(b => b.zoneId === zoneId) || null;
}
```

---

## Phase B: Pan/Zoom Interactions

### Viewport Transform Rendering

**Updated drawGeographicMap:**
```typescript
private drawGeographicMap(): void {
  this.ctx.save();

  if (this.viewport) {
    // Apply viewport transform
    this.applyViewportTransform();
  }

  // Draw polygons (same code as Phase A)
  this.timeZones.forEach(zone => {
    // ... drawing code
  });

  this.ctx.restore();
}

private applyViewportTransform(): void {
  const { centerLon, centerLat, zoomLevel } = this.viewport;

  // Project center to canvas coordinates (at zoom 1)
  const centerCanvas = this.projection.projectToCanvas(
    centerLon, centerLat,
    this.canvas.width, this.canvas.height
  );

  // Transform: translate to center, then scale
  this.ctx.translate(
    this.canvas.width / 2 - centerCanvas.x * zoomLevel,
    this.canvas.height / 2 - centerCanvas.y * zoomLevel
  );
  this.ctx.scale(zoomLevel, zoomLevel);
}
```

### UIController Event Handlers

**Pan handling:**
```typescript
private isPanning = false;
private lastPanX = 0;
private lastPanY = 0;

private setupPanListeners(): void {
  this.canvas.addEventListener('mousedown', (e) => {
    this.isPanning = true;
    this.lastPanX = e.clientX;
    this.lastPanY = e.clientY;
    this.canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!this.isPanning) return;

    const deltaX = e.clientX - this.lastPanX;
    const deltaY = e.clientY - this.lastPanY;

    this.lastPanX = e.clientX;
    this.lastPanY = e.clientY;

    // Convert pixel delta to geographic delta
    this.panViewport(deltaX, deltaY);
  });

  window.addEventListener('mouseup', () => {
    this.isPanning = false;
    this.canvas.style.cursor = 'grab';
  });
}

private panViewport(deltaX: number, deltaY: number): void {
  const { zoomLevel } = this.state.mapViewport;

  // Convert pixel movement to geographic degrees
  // Scale by zoom level (higher zoom = smaller geographic movement)
  const lonDelta = -(deltaX / this.canvas.width) * 360 / zoomLevel;
  const latDelta = (deltaY / this.canvas.height) * 180 / zoomLevel;

  this.state.mapViewport.centerLon =
    this.clampLon(this.state.mapViewport.centerLon + lonDelta);
  this.state.mapViewport.centerLat =
    this.clampLat(this.state.mapViewport.centerLat + latDelta);

  this.persistViewport();
  if (this.mapRenderer) {
    this.mapRenderer.render();
  }
}
```

**Zoom handling:**
```typescript
private setupZoomListeners(): void {
  this.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    // Zoom in/out based on wheel direction
    const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;

    this.zoomViewport(zoomDelta, e.clientX, e.clientY);
  });
}

private zoomViewport(factor: number, mouseX: number, mouseY: number): void {
  const oldZoom = this.state.mapViewport.zoomLevel;
  const newZoom = this.clampZoom(oldZoom * factor);

  if (newZoom === oldZoom) return; // Hit zoom limit

  // Zoom toward mouse position (keeps mouse point stationary)
  const rect = this.canvas.getBoundingClientRect();
  const canvasX = mouseX - rect.left;
  const canvasY = mouseY - rect.top;

  // TODO: Adjust center to keep mouse position fixed
  // This requires more complex math - can implement in follow-up

  this.state.mapViewport.zoomLevel = newZoom;

  this.persistViewport();
  if (this.mapRenderer) {
    this.mapRenderer.render();
  }
}

private clampZoom(zoom: number): number {
  return Math.max(0.5, Math.min(10, zoom));
}

private clampLon(lon: number): number {
  // Wrap around at 180/-180
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

private clampLat(lat: number): number {
  // Clamp to Miller bounds
  return Math.max(-85, Math.min(85, lat));
}
```

**Reset button:**
```typescript
resetViewport(): void {
  this.state.mapViewport = {
    centerLon: 0,
    centerLat: 0,
    zoomLevel: 1
  };

  this.persistViewport();
  if (this.mapRenderer) {
    this.mapRenderer.render();
  }
}
```

---

## Testing Strategy

### Phase A Testing

**Manual visual verification:**
- Load app, verify world map visible (not rectangles)
- Check all 32 time zones render correctly
- Verify colors match previous implementation
- Test day/night gradients still work
- Check dark mode rendering
- Test search - clicking result should highlight zone
- Test pinning - should work with new polygons
- Verify labels readable and positioned well

**Click detection:**
- Click various points on map
- Verify correct zone detected
- Test edge cases (small zones, split zones)
- Test ocean areas (should return null)

**Performance:**
- Profile render time with detailed polygons
- Test on low-end devices if possible
- Verify no noticeable lag on interactions

### Phase B Testing

**Pan interactions:**
- Drag map in all directions
- Verify smooth movement
- Test edge cases (panning past poles)
- Verify click detection still works while panned

**Zoom interactions:**
- Scroll wheel in/out
- Test zoom limits (0.5x to 10x)
- Verify map stays centered during zoom
- Test interaction responsiveness

**Combined:**
- Pan then zoom
- Zoom then pan
- Reset and verify return to default
- Verify persistence across page reloads

---

## Performance Considerations

### Phase A

**Polygon rendering cost:**
- 32 zones × ~100-500 points per zone = ~3,200-16,000 points
- Canvas drawing is fast, but redraw every second for clock updates
- Monitor FPS, may need optimization

**Potential optimizations (if needed):**
1. **Off-screen canvas**: Pre-render static geography to buffer
2. **Dirty rectangles**: Only redraw changed zones
3. **Level of detail**: Use simplified polygons at world view
4. **WebGL**: Switch to WebGL for GPU-accelerated rendering

### Phase B

**Transform overhead:**
- Canvas transform stack is efficient
- Full redraw on pan/zoom is acceptable for this scale
- requestAnimationFrame ensures smooth 60fps

**Future optimization:**
- Tile-based rendering for extreme zoom levels
- Viewport culling (don't draw off-screen polygons)

---

## Error Handling

**Map geometry loading failure:**
- Log error to console
- Fall back to rectangle rendering (drawSimpleMap)
- Show subtle indicator to user? (optional)

**Projection errors:**
- Validate coordinate ranges before projection
- Clamp out-of-bounds values
- Don't crash if invalid coordinates encountered

**Polygon rendering errors:**
- Skip invalid polygons (< 3 points)
- Log warnings for debugging
- Continue rendering other zones

---

## Migration Path

**Phase A rollout:**
1. Add map-geometry.json to repo
2. Update DataManager to load geometry
3. Update MapRenderer with new methods
4. Keep fallback to rectangles
5. Test thoroughly
6. Deploy

**Phase B rollout:**
1. Add viewport state to AppState
2. Add pan/zoom event handlers
3. Update MapRenderer transform logic
4. Add reset button to UI
5. Test interactions
6. Deploy

**Rollback safety:**
- Fallback rendering ensures app never breaks
- Can disable map geometry loading if issues
- Phase B is additive - can revert if needed

---

## Success Criteria

**Phase A:**
- ✅ World map renders with recognizable continent shapes
- ✅ All 32 time zones visible and correctly colored
- ✅ Day/night gradients work on geographic map
- ✅ Click detection accurate for all zones
- ✅ Search and pinning work correctly
- ✅ Performance acceptable (no visible lag)
- ✅ Fallback works if geometry fails to load

**Phase B:**
- ✅ Pan works smoothly in all directions
- ✅ Zoom works smoothly (0.5x to 10x range)
- ✅ Interactions feel responsive (60fps)
- ✅ Click detection works at any zoom/pan state
- ✅ Reset button returns to default view
- ✅ Viewport persists across page reloads

---

## Conclusion

This progressive enhancement approach adds geographical reality to the time zone map while maintaining all existing functionality. Phase A delivers the core visualization improvement, while Phase B adds interactive exploration capabilities. The fallback rendering ensures reliability, and the modular design keeps complexity manageable.

The Miller Cylindrical projection provides a good balance between accuracy and familiarity, and the polygon-based rendering sets the foundation for future enhancements like zoom-dependent detail levels or additional geographic overlays.
