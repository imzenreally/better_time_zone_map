# Better Time Zone Map - Design Specification

**Date:** 2026-03-13
**Status:** Approved
**Target Platform:** Web (HTML/Canvas), Future: iOS native app

## Overview

An interactive world map showing real-time information for all time zones, designed as both a personal reference tool and educational resource. The application displays current times, GMT/UTC offsets, DST status, and integrates CIA World Factbook data to provide rich geographic context.

## Goals

1. **Personal Reference Tool** - Quick, at-a-glance time zone information for checking current times across the world
2. **Educational Resource** - Highlight time zone quirks, unusual offsets, DST complexity, and historical oddities
3. **Fully Interactive** - Support hover, click, search, zoom, and multi-zone comparison
4. **Offline-First** - Work without internet connection, but stay current when online
5. **Future iOS App** - Design with clean separation to facilitate native iOS port

## Visual Design

### Style: Minimal & Modern

- Clean gradients with subtle transparency
- Focus on data clarity and readability
- Professional appearance suitable for reference use
- Map regions use muted colors that transition based on day/night cycle
- Smooth animations for all interactions

### Color Palette

**Light Mode:**
- Background: `#f8f9fa`
- Surface: `#ffffff`
- Primary gradient: `#667eea → #764ba2`
- Text: `#1a1a1a`
- Subtle text: `#666666`

**Dark Mode:**
- Background: `#0f0f0f`
- Surface: `#1e1e1e`
- Primary gradient: `#8b9aed → #9b6ec2`
- Text: `#e8e8e8`
- Subtle text: `#a0a0a0`

### Typography

- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Monospace for time: `"SF Mono", Monaco, "Courier New", monospace`
- Large times: 32-40px regular weight
- Zone labels: 12-14px medium weight
- Body text: 13-15px regular weight

## Architecture

### Technology Stack

- **TypeScript** - Type safety for complex logic and data structures
- **Vite** - Fast development server and build tool
- **Canvas API** - Custom rendering with full visual control
- **LocalStorage** - Offline data caching and user preferences
- **ESLint + Prettier** - Code quality and formatting
- **Vitest** - Unit testing for time zone calculations

### Project Structure

```
better_time_zone_map/
├── src/
│   ├── main.ts                    # Entry point
│   ├── modules/
│   │   ├── TimeZoneEngine.ts      # Time calculations, DST logic
│   │   ├── MapRenderer.ts         # Canvas drawing, visual effects
│   │   ├── DataManager.ts         # Data loading, caching, updates
│   │   └── UIController.ts        # User interactions, state management
│   ├── types/
│   │   ├── TimeZone.ts            # Time zone data structures
│   │   ├── Geography.ts           # Map/country data structures
│   │   └── AppState.ts            # Application state types
│   ├── data/
│   │   ├── timezones.json         # Bundled IANA tz database
│   │   ├── world-factbook.json    # CIA factbook subset
│   │   └── map-geometry.json      # Time zone boundary polygons
│   └── styles/
│       └── main.css
├── public/
│   └── index.html
├── docs/
│   └── superpowers/specs/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Module Design

#### TimeZoneEngine
Pure logic module with no UI dependencies (easily portable to Swift).

**Responsibilities:**
- Calculate current time for any zone accounting for DST
- Determine offsets from GMT/UTC
- Identify DST status and transition dates
- Handle unusual offsets (UTC+5:30, UTC+5:45, UTC+12:45, etc.)
- Provide educational information about time zone quirks

**Key Methods:**
```typescript
class TimeZoneEngine {
  getCurrentTime(zoneId: string): Date
  getOffset(zoneId: string, date: Date): number
  isDST(zoneId: string, date: Date): boolean
  getDSTTransitions(zoneId: string, year: number): DSTTransition[]
  getZoneQuirks(zoneId: string): string[]
}
```

#### MapRenderer
Handles all Canvas drawing and visual effects.

**Responsibilities:**
- Draw world map with time zone boundaries
- Apply gradient overlays for day/night visualization
- Handle pan/zoom interactions with smooth animations
- Render hover highlights and selection indicators
- Calculate solar position for each zone

**Rendering Strategy:**
- **Base layer**: World map (redrawn on zoom/pan only)
- **Day/night layer**: Gradient overlay (updates every 60 seconds)
- **Interaction layer**: Hover/selection (redraws on mouse move)
- Dirty rectangle optimization for performance
- RequestAnimationFrame for 60fps interactions

**Day/Night Visualization:**
- Calculate solar position based on current UTC time and longitude
- Apply gradient: golden yellow (noon) → orange (sunset) → deep blue (night) → light blue (dawn)
- Smooth transitions every minute
- In dark mode, night regions blend dramatically with background

#### DataManager
Orchestrates data loading, caching, and updates.

**Responsibilities:**
- Load bundled JSON data on startup
- Check for updates from remote manifest when online
- Cache updated data in localStorage
- Provide query interface (search by country, city, coordinates)
- Merge time zone data with CIA Factbook information
- Validate data integrity

**Update Mechanism:**
1. Check `manifest.json` on GitHub Pages for latest versions
2. Compare with cached version in localStorage
3. Download updates if newer versions available
4. Fall back to bundled data if offline or update fails
5. Always functional offline

#### UIController
Coordinates module interactions and manages application state.

**Responsibilities:**
- Initialize and wire up all modules
- Handle user inputs (click, hover, search, keyboard shortcuts)
- Manage application state (selected zones, view mode, preferences)
- Update info panels and tooltips
- Persist user preferences to localStorage
- Coordinate smooth transitions between views

**Event Flow:**
```
User Action → UIController → Module(s) → State Update → UI Refresh
```

## Data Structures

### TimeZone Interface
```typescript
interface TimeZone {
  id: string;                    // IANA identifier (e.g., "America/New_York")
  name: string;                  // Display name (e.g., "Eastern Standard Time")
  abbreviation: string;          // Current abbreviation (e.g., "EST" or "EDT")
  offset: number;                // Minutes from UTC (e.g., -300 for UTC-5)
  dstOffset?: number;            // Offset during DST if applicable
  dstRules?: {
    start: string;               // DST start rule
    end: string;                 // DST end rule
    observes: boolean;           // Whether zone observes DST
  };
  countries: string[];           // ISO country codes using this zone
  majorCities: string[];         // Major cities in this zone
  coordinates: {
    lat: number;
    lon: number;
  };
  quirks?: string[];            // Educational notes
}
```

### Map Geometry
```typescript
interface TimeZoneBoundary {
  zoneId: string;               // Links to TimeZone.id
  polygons: Polygon[];          // Array for split zones
}

interface Polygon {
  coordinates: [number, number][]; // [longitude, latitude] pairs
}
```

### Country Data (CIA Factbook)
```typescript
interface CountryData {
  code: string;                 // ISO country code
  name: string;
  capital: string;
  population: number;
  area: number;                 // km²
  languages: string[];
  government: string;
  currency: string;
  timeZones: string[];          // References to TimeZone.id
  geography?: string;           // Brief description
  lastUpdated: string;          // ISO date
}
```

### Application State
```typescript
interface AppState {
  selectedZones: string[];      // Pinned time zones for comparison
  hoveredZone: string | null;
  searchQuery: string;
  viewMode: 'map' | 'info';     // Toggle between views
  mapViewport: {
    centerX: number;
    centerY: number;
    zoom: number;
  };
  showDayNightOverlay: boolean;
  clockFormat: '12h' | '24h';
  offsetNotation: 'UTC' | 'GMT' | 'both';
  theme: 'light' | 'dark';
}
```

## User Interactions

### Map Exploration

**Hover:**
- Mouse over time zone region
- Show tooltip with zone name, current time, offset
- Subtle brightening of hovered region

**Click:**
- Click region to pin it to comparison panel
- Can pin multiple zones simultaneously
- Visual indicator on map for pinned zones

**Pan/Zoom:**
- Click-drag to pan map
- Scroll wheel to zoom in/out
- Smooth animations for all movements
- Standard map controls

**Day/Night Overlay:**
- Real-time gradient showing solar position
- Updates every 60 seconds
- Toggle on/off in settings

### Search Functionality

- Search box at top of interface
- Accepts: city names, country names, time zone identifiers
- As-you-type filtering with dropdown results
- Click result → map flies to location and highlights zone
- Search history saved in localStorage
- Keyboard navigation (arrows, enter)

### Pinned Zones Panel

- Appears on right side (desktop) when zones are pinned
- Shows live clocks for each pinned zone
- Displays: zone name, current time, date, offset, DST status
- Click "×" to unpin a zone
- Drag to reorder (future enhancement)
- Responsive: collapses to bottom drawer on tablet, overlay on mobile

### Info Mode

- Toggle button to switch between "Time Zone View" and "Country Info View"
- In Info Mode: clicking a country opens detailed panel
- Info panel shows:
  - Country flag
  - Capital city
  - Population
  - Languages spoken
  - Time zones used
  - Geography notes
  - Time zone quirks specific to that country
- Time zone data still visible alongside country info

### Educational Quirks

**Quirk Categories:**
1. **Unusual Offsets** - Zones not on the hour (UTC+5:30, +5:45, +12:45)
2. **DST Complexity** - Countries with complex or no DST rules
3. **Historical Oddities** - Zones that changed, political vs solar time
4. **Practical Weirdness** - China's single zone, date line quirks

**Display:**
- Indicator badges on map for zones with quirks
- Click badge to see explanation in tooltip or panel
- "Quirk of the Day" feature highlighting random interesting fact

### Settings Panel

- Clock format: 12h vs 24h
- Offset notation: UTC, GMT, or both
- Day/night overlay: on/off
- Show seconds in time display: yes/no
- Theme: light/dark mode toggle
- All settings persist in localStorage

## Data Sources

### Time Zone Data
- **IANA Time Zone Database** (tzdata) - authoritative source
- Convert to JSON format with build script
- Include ~400 time zones with full DST rules
- Map geometry from **timezone-boundary-builder** GeoJSON
- Simplify polygons for file size optimization

### CIA World Factbook
- Parse public domain CIA World Factbook data (JSON/XML)
- Curate subset of ~50 most relevant fields per country
- Initial bundle: ~250 countries/territories
- Target: keep total bundle under 2MB for fast loading

### Update Hosting
Host `manifest.json` on GitHub Pages:
```json
{
  "timeZones": {
    "version": "2026.1",
    "url": "https://username.github.io/tz-data/timezones-2026.1.json",
    "size": 450000
  },
  "factbook": {
    "version": "2026-03",
    "url": "https://username.github.io/tz-data/factbook-2026-03.json",
    "size": 800000
  }
}
```

## Error Handling

### Data Loading Failures
- **Bundled data fails**: Show error message, cannot proceed
- **Online update fails**: Silent fallback to bundled data, show "offline mode" indicator
- **Cached data corrupt**: Clear localStorage, reload from bundle

### Time Calculation Errors
- Validate zone IDs before calculations
- Graceful fallback to UTC if zone data missing
- Log errors to console, don't crash app

### Canvas Rendering Issues
- Check Canvas API support on load
- Show fallback message for unsupported browsers
- Catch rendering exceptions, attempt recovery

### Search/Query Failures
- Empty results: "No results found" message
- Invalid coordinates: clamp to valid ranges
- Network timeout: show timeout message with retry button

## Performance Optimization

- **Debounce** search input (300ms)
- **Throttle** map pan/zoom (60fps max)
- **Lazy load** CIA Factbook data when Info Mode activated
- **Web Workers** for heavy calculations if needed
- **Canvas optimization**: dirty rectangles, off-screen canvas for static layers
- **Bundle size**: keep initial load under 2MB

## Browser Storage

```
localStorage:
  'tzmap_cached_data'      - Updated time zone data
  'tzmap_user_prefs'       - Settings and pinned zones
  'tzmap_search_history'   - Recent searches
  'tzmap_data_version'     - Version of cached data
```

## Security Considerations

- Validate all data from external sources
- Sanitize user input in search queries
- Use HTTPS for remote data fetching
- No authentication needed (client-side only)
- CSP headers for production deployment

## Responsive Design

**Desktop (1200px+):**
- Map takes majority of screen
- Pinned panel on right side
- Full search and settings visible

**Tablet (768-1199px):**
- Pinned panel collapses to bottom drawer
- Search bar remains at top
- Touch-friendly controls

**Mobile (< 768px):**
- Full-screen map
- Floating action button for pinned zones overlay
- Simplified search interface
- Touch gestures for pan/zoom

## Development Phases

### Phase 1 - Foundation (MVP)
- Set up Vite + TypeScript project
- Implement TimeZoneEngine with basic calculations
- Create MapRenderer with static world map
- Build UIController for clicking/hovering
- Load bundled time zone data
- Basic styling in light mode

**Deliverable**: Can click on time zones and see current time

### Phase 2 - Core Features
- Add day/night gradient overlay
- Implement pinned zones panel
- Add search functionality
- Implement zoom/pan interactions
- Add dark mode toggle
- Live clock updates

**Deliverable**: Fully interactive map with time zone exploration

### Phase 3 - Data Integration
- Integrate CIA Factbook data
- Build Info Mode toggle
- Create detailed info panels
- Add educational quirks system
- Implement "Quirk of the Day"

**Deliverable**: Rich educational content integrated

### Phase 4 - Polish & Optimization
- Implement update checking/downloading
- Add complete settings panel
- Smooth animations and transitions
- Performance optimization
- Responsive design for all screen sizes
- Cross-browser testing
- Accessibility improvements

**Deliverable**: Production-ready web application

## Testing Strategy

### Unit Tests (Vitest)
- TimeZoneEngine calculations (critical logic)
- DST transition date calculations
- Offset conversions
- Data validation functions

### Manual Testing
- Visual rendering across browsers (Chrome, Firefox, Safari, Edge)
- Interactive features on desktop and mobile
- Verify offline functionality
- Test data update mechanism
- Dark mode rendering
- Performance profiling

### Test Scenarios
- User pins 5+ time zones and compares
- Search for obscure cities/countries
- Disconnect from internet, verify offline mode
- Force localStorage clear, verify recovery
- Test on slow connection for update downloads
- Zoom to extreme levels, test rendering

## iOS Port Considerations

The modular TypeScript architecture is designed for clean translation to Swift/SwiftUI:

**TimeZoneEngine → Swift class**
- Pure logic, no UI dependencies
- TypeScript interfaces → Swift protocols/structs
- Calculations map directly to Foundation Date/TimeZone APIs

**MapRenderer → Core Graphics / SwiftUI**
- Canvas drawing → Core Graphics context
- Animation timing → CADisplayLink
- Gesture recognizers for pan/zoom

**DataManager → Swift service layer**
- localStorage → UserDefaults / Core Data
- Network requests → URLSession
- JSON parsing → Codable

**UIController → SwiftUI coordinator pattern**
- State management → @State, @ObservedObject
- Module coordination → Environment / Dependency injection

## Future Enhancements

**Not in initial scope, but designed to support:**
- User accounts and cross-device sync
- Custom location bookmarks
- Time zone conversion calculator
- Meeting scheduler with zone overlap visualization
- Historical time zone data (how zones changed over time)
- Notification for DST transitions
- Widget for desktop/iOS home screen
- Share functionality (screenshot current view)
- Multi-language support

## Success Criteria

**Functional:**
- ✅ Displays all ~400 time zones accurately
- ✅ Real-time clock updates across all zones
- ✅ Day/night overlay reflects actual solar position
- ✅ Works completely offline with bundled data
- ✅ Updates automatically when online

**Performance:**
- ✅ Initial load under 3 seconds on average connection
- ✅ Smooth 60fps interactions (pan, zoom, hover)
- ✅ Search results appear within 100ms
- ✅ Canvas rendering optimized for low-end devices

**Usability:**
- ✅ Intuitive interface requiring no instructions
- ✅ Responsive design works on all screen sizes
- ✅ Educational content is discoverable and engaging
- ✅ Dark mode is comfortable for extended use

**Maintainability:**
- ✅ Modular architecture with clear separation of concerns
- ✅ Type-safe code with comprehensive interfaces
- ✅ Critical logic covered by unit tests
- ✅ Clear path to iOS port

## Conclusion

This design provides a comprehensive blueprint for building a modern, interactive time zone map that serves as both a practical reference tool and an educational resource. The modular TypeScript architecture ensures maintainability and facilitates the future iOS port, while the offline-first approach with online updates provides the best user experience across all connectivity scenarios.

The minimal modern aesthetic with dark mode support, combined with the dynamic day/night visualization, creates an engaging and visually appealing interface that encourages exploration of the world's time zones and their fascinating quirks.
