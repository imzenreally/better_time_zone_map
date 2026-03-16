# Better Time Zone Map

An interactive world map showing real-time information for all time zones with accurate geographic boundaries.

## Features

### Phase 1 - MVP ✅
- ✅ Interactive map with clickable time zones
- ✅ Real-time clock display for any zone
- ✅ Hover tooltips showing zone information
- ✅ UTC offset display
- ✅ DST status detection
- ✅ Pin up to 10 favorite time zones
- ✅ Live updating clocks (1-second refresh)
- ✅ Search by city or country
- ✅ Day/night gradient overlay
- ✅ Dark mode support

### Phase A - Geographic Map Rendering ✅
- ✅ **Accurate time zone boundaries** from timezone-boundary-builder dataset
- ✅ **Miller Cylindrical projection** for balanced world map display
- ✅ **Point-in-polygon click detection** for precise zone selection
- ✅ **Multi-polygon support** for zones split by the International Date Line
- ✅ **418 time zones** with 1,162 boundary polygons
- ✅ **Optimized data** - 976KB simplified GeoJSON (from 153MB source)
- ✅ **Graceful fallback** to rectangle rendering if data unavailable

## Tech Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Canvas API** - High-performance rendering
- **Vitest** - Unit testing (65 tests across 9 test files)
- **Miller Cylindrical Projection** - Geographic coordinate transformation
- **Ray Casting Algorithm** - Accurate point-in-polygon detection

## Data Sources

- **Time Zone Data:** IANA Time Zone Database via custom dataset
- **Geographic Boundaries:** [timezone-boundary-builder](https://github.com/evansiroky/timezone-boundary-builder) (2024b release)
- **Simplification:** Turf.js with 0.21° tolerance (reduced from 153MB to 976KB)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Testing

```bash
npm test
```

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── main.ts                  # Entry point
├── modules/
│   ├── TimeZoneEngine.ts    # Time calculations & DST logic
│   ├── MapRenderer.ts       # Canvas rendering with geographic projection
│   ├── MapProjection.ts     # Miller Cylindrical coordinate transformation
│   ├── DataManager.ts       # Data loading (timezones + map geometry)
│   ├── UIController.ts      # Application coordination
│   ├── PinnedZonesPanel.ts  # Pinned zones sidebar
│   ├── SearchBar.ts         # City/country search
│   └── ThemeToggle.ts       # Dark/light mode toggle
├── types/
│   ├── TimeZone.ts          # Time zone data structures
│   ├── Geography.ts         # Geographic boundary types
│   ├── MapGeometry.ts       # Map data container types
│   └── AppState.ts          # Application state
├── data/
│   ├── timezones.json       # Time zone metadata (32 zones)
│   └── map-geometry.json    # Geographic boundaries (418 zones, 976KB)
└── styles/                  # CSS modules
```

## Development Roadmap

- [x] **Phase 1:** MVP Foundation (time zone display, tooltips, DST detection)
- [x] **Phase 2:** Core Features (day/night overlay, pinned zones, search, themes)
- [x] **Phase A:** Geographic Map Rendering (accurate boundaries, projection, click detection)
- [ ] **Phase B:** Pan & Zoom Interactions (viewport transformation, mouse controls)
- [ ] **Phase 3:** Data Integration (CIA Factbook, additional metadata)
- [ ] **Phase 4:** Polish & Optimization (performance tuning, accessibility)

## License

TBD
