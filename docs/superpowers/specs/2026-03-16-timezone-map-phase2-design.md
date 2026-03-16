# Better Time Zone Map - Phase 2 Design Specification

**Date:** 2026-03-16
**Status:** Draft
**Phase:** 2 - Core Features
**Prerequisites:** Phase 1 MVP complete (v0.1.0)

## Overview

Phase 2 transforms the basic time zone visualization into a fully interactive exploration tool. Building on Phase 1's foundation (3 time zones with hover tooltips and click interactions), Phase 2 adds live clock updates, a pinned zones comparison panel, search functionality, day/night visual indicators, and dark mode support.

## Goals

1. **Live Updates** - Real-time clock updates across all visible times (1-second precision)
2. **Zone Comparison** - Pin multiple zones to compare times side-by-side
3. **Discoverability** - Search functionality to find zones quickly
4. **Visual Context** - Day/night gradients showing solar time in each zone
5. **Accessibility** - Dark mode for comfortable extended viewing

## Architecture Changes

### New State Management Layer

Phase 1 had UIController coordinating modules but no centralized state. Phase 2 introduces **AppState** as single source of truth.

**AppState interface:**
```typescript
interface AppState {
  pinnedZoneIds: string[];        // Array of zone IDs pinned by user
  searchQuery: string;             // Current search filter text
  theme: 'light' | 'dark';        // Theme preference
  clockTickerHandle: number | null; // setInterval handle for cleanup
}
```

**State persistence:**
- `pinnedZoneIds` and `theme` saved to localStorage
- Restored on page load for continuity
- Search query is session-only (not persisted)

### Enhanced UIController

UIController evolves from simple coordinator to state manager:

**New responsibilities:**
- Holds AppState instance
- Provides state update methods (addPinnedZone, removePinnedZone, setTheme, etc.)
- Notifies components when state changes
- Manages global clock ticker lifecycle

**State update pattern:**
```typescript
updateState(partial: Partial<AppState>): void {
  Object.assign(this.state, partial);
  this.notifyComponents();
  this.persistState();
}
```

### New Components

Three new UI components, each with single responsibility:

1. **PinnedZonesPanel** - Sidebar with pinned zone cards
2. **SearchBar** - Top bar with dropdown results
3. **ThemeToggle** - Dark mode switch button

### Data Flow

```
User Action → UIController.updateState() → Components re-render
```

Example: User clicks zone
1. MapRenderer detects click, calls `uiController.addPinnedZone(zoneId)`
2. UIController updates state.pinnedZoneIds
3. UIController calls `pinnedZonesPanel.render()` and `mapRenderer.highlightPinnedZones()`
4. State persisted to localStorage

---

## Feature 1: Global Clock Ticker

### Purpose

Update all visible times every second instead of only on-demand during hover.

### Implementation

**UIController.startClockTicker()**
```typescript
startClockTicker(): void {
  // Clear any existing ticker
  if (this.state.clockTickerHandle) {
    clearInterval(this.state.clockTickerHandle);
  }

  // Start new ticker (1000ms interval)
  const handle = setInterval(() => {
    this.updateAllTimes();
  }, 1000);

  this.state.clockTickerHandle = handle;
}
```

**UIController.updateAllTimes()**
```typescript
private updateAllTimes(): void {
  // Update tooltip if visible
  if (this.tooltip && !this.tooltip.classList.contains('hidden')) {
    const zoneId = this.tooltip.dataset.zoneId;
    if (zoneId) {
      this.updateTooltipTime(zoneId);
    }
  }

  // Update pinned zones panel
  if (this.pinnedZonesPanel) {
    this.pinnedZonesPanel.updateTimes();
  }
}
```

**Cleanup:**
```typescript
stopClockTicker(): void {
  if (this.state.clockTickerHandle) {
    clearInterval(this.state.clockTickerHandle);
    this.state.clockTickerHandle = null;
  }
}

// Called on window unload
window.addEventListener('beforeunload', () => {
  this.stopClockTicker();
});
```

### Performance Considerations

- Only updates DOM elements that are currently visible
- If tooltip hidden and no zones pinned, ticker runs but does no work (minimal CPU)
- With 3 zones, updating every second is negligible
- Future optimization: throttle updates when tab not visible (Page Visibility API)

### Testing

- Verify times update every second in tooltip and pinned panel
- Verify ticker stops on cleanup (no memory leaks)
- Verify times stay synchronized (no drift)

---

## Feature 2: Pinned Zones Panel

### Purpose

Persistent sidebar showing live clocks for user-selected time zones, enabling multi-zone comparison.

### Layout

**Desktop (>1024px):**
- Fixed right sidebar, 300px wide
- Always visible
- Stacked vertical list of pinned zone cards
- Scrollable if more than 5-6 zones pinned

**Tablet (768-1024px):**
- Collapsible sidebar
- Toggle button (hamburger icon) to show/hide
- Slides in from right with animation
- Overlays map when open

**Mobile (<768px):**
- Full-screen overlay when opened
- Close button in top-right
- Bottom navigation button to open

### Zone Card Structure

Each pinned zone displays:
- **Zone name** (large, bold) - e.g., "Eastern Standard Time"
- **Current time** (extra large, monospace) - e.g., "14:23:45"
- **Current date** (small) - e.g., "Sunday, March 16, 2026"
- **UTC offset** (subtle) - e.g., "UTC-5" or "GMT-5"
- **Unpin button** (X icon, top-right corner)

**Card styling:**
- White background (light mode) / dark surface (dark mode)
- Subtle shadow for depth
- 8px border-radius
- 12px padding
- 8px gap between cards

### State Management

**AppState.pinnedZoneIds:**
- Array of zone IDs (IANA identifiers)
- Example: `["America/New_York", "Europe/London", "Asia/Tokyo"]`
- Max 10 pinned zones (prevent overflow/performance issues)
- Persisted to localStorage key: `tzmap_pinned_zones`

**Adding a zone:**
```typescript
addPinnedZone(zoneId: string): void {
  if (this.state.pinnedZoneIds.includes(zoneId)) {
    // Already pinned, do nothing (or unpin if toggle behavior desired)
    return;
  }

  if (this.state.pinnedZoneIds.length >= 10) {
    alert('Maximum 10 zones can be pinned');
    return;
  }

  this.updateState({
    pinnedZoneIds: [...this.state.pinnedZoneIds, zoneId]
  });
}
```

**Removing a zone:**
```typescript
removePinnedZone(zoneId: string): void {
  this.updateState({
    pinnedZoneIds: this.state.pinnedZoneIds.filter(id => id !== zoneId)
  });
}
```

### Interaction Flow

**Pinning a zone:**
1. User clicks zone bar on map
2. MapRenderer calls `uiController.addPinnedZone(zoneId)`
3. UIController updates state
4. PinnedZonesPanel re-renders with new card
5. MapRenderer highlights pinned zone (thicker border)

**Unpinning a zone:**
1. User clicks X button on zone card
2. PinnedZonesPanel calls `uiController.removePinnedZone(zoneId)`
3. UIController updates state
4. Card removed from panel
5. Highlight removed from map

**Empty state:**
- When no zones pinned, show placeholder:
  - Icon (📍)
  - Text: "Click on zones to pin them here"
  - Subtext: "Compare times across multiple zones"

### Component Structure

**PinnedZonesPanel class:**
```typescript
class PinnedZonesPanel {
  private container: HTMLElement;
  private uiController: UIController;
  private timeZoneEngine: TimeZoneEngine;

  constructor(container: HTMLElement, uiController: UIController, timeZoneEngine: TimeZoneEngine);

  render(): void;                          // Render all pinned zones
  updateTimes(): void;                     // Update times (called by ticker)
  private renderPinnedZone(zone: TimeZone): HTMLElement; // Single card
  private handleUnpin(zoneId: string): void;             // Unpin handler
  private renderEmptyState(): HTMLElement;               // Empty state
}
```

### HTML Structure

```html
<div id="pinned-zones-panel" class="pinned-zones-panel">
  <div class="panel-header">
    <h2>Pinned Zones</h2>
    <button class="panel-toggle" aria-label="Toggle panel">⇄</button>
  </div>
  <div class="panel-content">
    <!-- Zone cards or empty state -->
  </div>
</div>
```

### CSS Classes

- `.pinned-zones-panel` - Container
- `.panel-header` - Header with title and toggle
- `.panel-content` - Scrollable content area
- `.zone-card` - Individual pinned zone
- `.zone-card-header` - Zone name + unpin button
- `.zone-card-time` - Large time display
- `.zone-card-meta` - Date and offset
- `.empty-state` - Placeholder when no zones pinned

### Testing

- Verify zones can be pinned/unpinned
- Verify max 10 zones enforced
- Verify times update every second
- Verify persistence across page reloads
- Verify responsive behavior on different screen sizes

---

## Feature 3: Day/Night Gradients

### Purpose

Provide visual indication of local solar time in each zone through color gradients.

### Time-to-Color Mapping

Calculate local time hour (as decimal) and map to gradient:

**Night (0-6, 20-24):** Deep blue `#1a2332`

**Dawn (6-8):**
- Linear gradient from deep blue → golden yellow `#fbbf24`
- Creates sunrise effect

**Day (8-18):**
- Light yellow/white `#fef3c7`
- Peak brightness at noon

**Dusk (18-20):**
- Linear gradient from light → orange `#fb923c` → deep blue
- Creates sunset effect

### Calculation Algorithm

```typescript
calculateDayNightColor(zoneId: string): string {
  const localTime = this.timeZoneEngine.getCurrentTime(zoneId);
  const hour = localTime.getUTCHours(); // Remember: UTC fields = local time
  const minute = localTime.getUTCMinutes();
  const decimalHour = hour + (minute / 60);

  if (decimalHour >= 20 || decimalHour < 6) {
    // Night
    return '#1a2332';
  } else if (decimalHour >= 6 && decimalHour < 8) {
    // Dawn (gradient)
    const progress = (decimalHour - 6) / 2; // 0 to 1
    return interpolateColor('#1a2332', '#fbbf24', progress);
  } else if (decimalHour >= 8 && decimalHour < 18) {
    // Day
    return '#fef3c7';
  } else {
    // Dusk (gradient)
    const progress = (decimalHour - 18) / 2; // 0 to 1
    return interpolateColor('#fef3c7', '#1a2332', progress);
  }
}
```

### Implementation in MapRenderer

**renderZone() enhancement:**
```typescript
private renderZone(zone: TimeZone, x: number, width: number): void {
  // Calculate base color (existing logic)
  const baseColor = this.getZoneColor(zone);

  // Calculate day/night overlay
  const overlayColor = this.calculateDayNightColor(zone.id);

  // Blend colors (multiply blend mode)
  const blendedColor = this.blendColors(baseColor, overlayColor, 0.6);

  // Draw zone bar with blended color
  this.ctx.fillStyle = blendedColor;
  this.ctx.fillRect(x, 0, width, this.canvas.height);
}
```

**Color interpolation helper:**
```typescript
private interpolateColor(color1: string, color2: string, progress: number): string {
  // Parse hex colors
  const c1 = this.hexToRgb(color1);
  const c2 = this.hexToRgb(color2);

  // Interpolate RGB channels
  const r = Math.round(c1.r + (c2.r - c1.r) * progress);
  const g = Math.round(c1.g + (c2.g - c1.g) * progress);
  const b = Math.round(c1.b + (c2.b - c1.b) * progress);

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
```

### Update Frequency

- Gradients recalculate every second (tied to clock ticker)
- Canvas redraws with new colors
- Creates subtle animation as zones transition through day/night
- With only 3 zones, redrawing every second is performant

### Dark Mode Adjustments

In dark mode, adjust gradient colors for better contrast:
- Night: Even darker (`#0a0f1a`)
- Day: Softer white (`#e8e0c7`)
- Gradients use same interpolation but with adjusted endpoints

### Performance Considerations

- Color calculations are simple math (no complex rendering)
- Canvas redraw every second: ~60 operations (3 zones × 20 canvas calls)
- Negligible CPU usage on modern hardware
- Future optimization: If zone count increases, throttle updates to every 5-10 seconds

### Testing

- Verify gradients change throughout the day
- Verify smooth transitions at dawn/dusk boundaries
- Verify colors appropriate for light/dark modes
- Visual test: manually set times and verify expected colors

---

## Feature 4: Search Functionality

### Purpose

Enable users to quickly find and select time zones by searching for zone names, major cities, or countries.

### UI Layout

**Search bar:**
- Fixed at top of viewport
- Full width (with margins: 40px left/right on desktop)
- Height: 48px
- z-index: 100 (above map, below dropdown)

**Input field:**
- Placeholder: "Search time zones (city, country, or zone name)..."
- Left icon: 🔍 (search icon)
- Right icon: ✕ (clear button, appears when text entered)
- Font size: 16px (prevents zoom on mobile)

**Dropdown results:**
- Appears below search bar (no gap)
- Max height: 400px (scrollable if more results)
- Max 10 results visible before scrolling
- Shadow for depth
- Background: white (light mode) / dark surface (dark mode)

### Search Algorithm

**Searchable fields:**
- `zone.name` (e.g., "Eastern Standard Time")
- `zone.majorCities[]` (e.g., ["New York", "Miami", "Detroit"])
- `zone.countries[]` (e.g., ["US"])
- `zone.id` (e.g., "America/New_York")

**Matching logic:**
```typescript
filterZones(query: string): TimeZone[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();

  return this.timeZones
    .map(zone => ({
      zone,
      score: this.calculateSearchScore(zone, lowerQuery)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.zone);
}

private calculateSearchScore(zone: TimeZone, query: string): number {
  let score = 0;

  // Exact name match (highest score)
  if (zone.name.toLowerCase() === query) score += 100;

  // Name starts with query
  else if (zone.name.toLowerCase().startsWith(query)) score += 50;

  // Name contains query
  else if (zone.name.toLowerCase().includes(query)) score += 25;

  // City exact match
  if (zone.majorCities.some(city => city.toLowerCase() === query)) score += 80;

  // City starts with query
  else if (zone.majorCities.some(city => city.toLowerCase().startsWith(query))) score += 40;

  // City contains query
  else if (zone.majorCities.some(city => city.toLowerCase().includes(query))) score += 20;

  // Country match
  if (zone.countries.some(country => country.toLowerCase().includes(query))) score += 15;

  // Zone ID match
  if (zone.id.toLowerCase().includes(query)) score += 10;

  return score;
}
```

### Interaction Flow

**Typing:**
1. User types in search box
2. Input debounced (300ms) to avoid excessive filtering
3. Results filtered and sorted by relevance
4. Dropdown appears with results (or "No results found")

**Keyboard navigation:**
- Arrow up/down: Navigate results (highlight)
- Enter: Select highlighted result
- ESC: Close dropdown, clear search

**Mouse interaction:**
- Hover: Highlight result
- Click: Select result

**Selecting a result:**
1. SearchBar calls `uiController.selectZone(zoneId)`
2. UIController adds zone to pinned zones (if not already pinned)
3. UIController triggers map scroll to that zone (future: if map supports scrolling)
4. Search input cleared, dropdown closed

**Clear button:**
- Appears when text entered
- Clicking clears input and closes dropdown

### Component Structure

**SearchBar class:**
```typescript
class SearchBar {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private dropdown: HTMLElement;
  private uiController: UIController;
  private timeZones: TimeZone[];

  constructor(container: HTMLElement, uiController: UIController, timeZones: TimeZone[]);

  render(): void;                                    // Create search UI
  private handleInput(query: string): void;          // Debounced input handler
  private filterZones(query: string): TimeZone[];    // Search logic
  private renderResults(zones: TimeZone[]): void;    // Dropdown rendering
  private selectZone(zone: TimeZone): void;          // Selection handler
  private clearSearch(): void;                        // Clear input
  private closeDropdown(): void;                      // Hide dropdown
}
```

### HTML Structure

```html
<div id="search-bar" class="search-bar">
  <div class="search-input-wrapper">
    <span class="search-icon">🔍</span>
    <input
      type="text"
      class="search-input"
      placeholder="Search time zones..."
      autocomplete="off"
      spellcheck="false"
    />
    <button class="search-clear hidden" aria-label="Clear search">✕</button>
  </div>
  <div class="search-dropdown hidden">
    <!-- Results rendered here -->
  </div>
</div>
```

### CSS Classes

- `.search-bar` - Container
- `.search-input-wrapper` - Input with icons
- `.search-input` - Text input
- `.search-icon` - Left search icon
- `.search-clear` - Right clear button
- `.search-dropdown` - Results dropdown
- `.search-result` - Individual result item
- `.search-result-highlighted` - Keyboard-selected result
- `.search-no-results` - Empty state

### Debouncing

```typescript
private debounceTimer: number | null = null;

private handleInput(query: string): void {
  if (this.debounceTimer) {
    clearTimeout(this.debounceTimer);
  }

  this.debounceTimer = setTimeout(() => {
    const results = this.filterZones(query);
    this.renderResults(results);
  }, 300);
}
```

### Performance

- With 3 zones: Search is instant
- With ~400 zones (future): Client-side filtering still fast (<10ms)
- Debouncing prevents excessive filtering during typing
- Max 10 results prevents rendering bottleneck

### Testing

- Verify search finds zones by name, city, country
- Verify debouncing works (no lag during typing)
- Verify keyboard navigation (arrows, enter, ESC)
- Verify selecting result pins zone and clears search
- Verify "No results found" for invalid queries

---

## Feature 5: Dark Mode Toggle

### Purpose

Provide a dark theme for comfortable viewing in low-light conditions.

### UI Element

**Toggle button:**
- Location: Top-right corner of viewport
- Position: Fixed (stays visible when scrolling, if scrolling added)
- Icon: ☀️ (sun) in dark mode, 🌙 (moon) in light mode
- Size: 44×44px (touch-friendly)
- Tooltip on hover: "Switch to dark mode" / "Switch to light mode"

**Animation:**
- Smooth icon transition (fade out/in, 200ms)
- Theme colors transition smoothly (0.3s ease)

### Theme Definitions

**Light mode (current):**
```css
:root {
  --bg-primary: #f8f9fa;
  --bg-surface: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border: #e0e0e0;
  --shadow: rgba(0, 0, 0, 0.15);
}
```

**Dark mode:**
```css
:root {
  --bg-primary: #0f0f0f;
  --bg-surface: #1e1e1e;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --border: #2a2a2a;
  --shadow: rgba(0, 0, 0, 0.5);
}
```

**Component-specific adjustments:**
- Zone bars: Slightly brighter in dark mode for better visibility
- Gradients: Adjusted endpoints (darker night, softer day)
- Pinned panel: Dark surface with subtle border
- Search dropdown: Dark surface with subtle shadow
- Tooltip: Dark surface in dark mode

### Implementation

**State management:**
```typescript
interface AppState {
  theme: 'light' | 'dark';
}

setTheme(theme: 'light' | 'dark'): void {
  this.updateState({ theme });
  this.applyTheme();
}

private applyTheme(): void {
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${this.state.theme}`);

  // Notify components that need to adjust
  if (this.mapRenderer) {
    this.mapRenderer.setTheme(this.state.theme);
  }
}
```

**CSS structure:**
```css
/* Default (light mode) */
body.theme-light {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

/* Dark mode override */
body.theme-dark {
  --bg-primary: #0f0f0f;
  --bg-surface: #1e1e1e;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --border: #2a2a2a;
  --shadow: rgba(0, 0, 0, 0.5);
}

/* Smooth transitions */
body {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.pinned-zones-panel,
.search-bar,
.tooltip {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

**MapRenderer theme adjustments:**
```typescript
setTheme(theme: 'light' | 'dark'): void {
  this.theme = theme;
  this.render(); // Re-render with adjusted colors
}

private getZoneColor(zone: TimeZone): string {
  // Base colors
  const baseColors = {
    'America/New_York': '#4a90e2',
    'Europe/London': '#50c878',
    'Asia/Tokyo': '#ff7f50'
  };

  const color = baseColors[zone.id] || '#888888';

  // Brighten colors in dark mode
  if (this.theme === 'dark') {
    return this.adjustBrightness(color, 1.2); // 20% brighter
  }

  return color;
}
```

**Persistence:**
```typescript
// Save to localStorage
localStorage.setItem('tzmap_theme', this.state.theme);

// Load on initialization
const savedTheme = localStorage.getItem('tzmap_theme') as 'light' | 'dark' | null;
if (savedTheme) {
  this.setTheme(savedTheme);
}
```

### Component Structure

**ThemeToggle class:**
```typescript
class ThemeToggle {
  private button: HTMLButtonElement;
  private uiController: UIController;

  constructor(uiController: UIController);

  render(): void;                     // Create toggle button
  private handleToggle(): void;       // Click handler
  updateIcon(theme: 'light' | 'dark'): void; // Update button icon
}
```

### HTML Structure

```html
<button
  id="theme-toggle"
  class="theme-toggle"
  aria-label="Toggle dark mode"
  title="Switch to dark mode"
>
  🌙
</button>
```

### Accessibility

- Button has proper `aria-label`
- Keyboard accessible (Tab to focus, Enter/Space to activate)
- Focus indicator visible
- Tooltip explains action

### Testing

- Verify theme switches correctly
- Verify smooth transitions (no flashing)
- Verify all components update colors
- Verify persistence across page reloads
- Verify map gradients adjust for dark mode
- Test readability in both modes

---

## File Structure Changes

### New Files

```
src/
├── modules/
│   ├── PinnedZonesPanel.ts       # NEW: Sidebar component
│   ├── SearchBar.ts               # NEW: Search component
│   └── ThemeToggle.ts             # NEW: Theme switch
├── styles/
│   ├── main.css                   # Modified: add CSS variables
│   ├── pinned-panel.css           # NEW: Panel styles
│   ├── search.css                 # NEW: Search styles
│   └── theme.css                  # NEW: Theme definitions
└── types/
    └── AppState.ts                # Modified: add new state fields
```

### Modified Files

- **src/modules/UIController.ts** - State management, ticker, component coordination
- **src/modules/MapRenderer.ts** - Day/night gradients, theme support, pinned highlights
- **src/main.ts** - Initialize new components
- **index.html** - Add containers for panel, search, toggle
- **src/styles/main.css** - CSS variables, theme classes

---

## Implementation Order

Build features in dependency order:

### Task 1: Global Clock Ticker (Foundation)
- Add ticker to UIController
- Implement updateAllTimes()
- Add cleanup on unmount
- Test: Times update every second

### Task 2: Pinned Zones Panel
- Create PinnedZonesPanel component
- Add state management (pinnedZoneIds)
- Implement add/remove pin functionality
- Connect to ticker for live updates
- Add localStorage persistence
- Test: Pins persist, times update

### Task 3: Day/Night Gradients
- Add color calculation to MapRenderer
- Implement interpolation logic
- Connect to ticker for updates
- Test: Gradients change with time

### Task 4: Search Functionality
- Create SearchBar component
- Implement search algorithm
- Add keyboard navigation
- Connect to pin functionality
- Test: Search finds zones, selecting pins

### Task 5: Dark Mode Toggle
- Create ThemeToggle component
- Define CSS variables for themes
- Add theme application logic
- Adjust MapRenderer for dark mode
- Add localStorage persistence
- Test: Theme switches, persists

---

## Testing Strategy

### Unit Tests

**New tests:**
- `UIController.test.ts` - State updates, ticker lifecycle
- `PinnedZonesPanel.test.ts` - Add/remove pins, max limit
- `SearchBar.test.ts` - Search algorithm scoring
- `MapRenderer.test.ts` - Day/night color calculation, interpolation

**Test scenarios:**
- Clock ticker updates every second
- Pinned zones persist to localStorage
- Search scores zones correctly
- Day/night colors calculated accurately
- Theme switches applied correctly

### Manual Testing

**Integration tests:**
- Pin multiple zones, verify sidebar shows all
- Search for zone, verify it pins and highlights
- Switch theme, verify all components update
- Reload page, verify pins and theme persist
- Wait 1 minute, verify times update continuously

**Visual tests:**
- Verify gradients smooth at dawn/dusk transitions
- Verify dark mode readable and comfortable
- Verify responsive layout on mobile/tablet
- Verify animations smooth (no jank)

### Performance Testing

- Monitor CPU usage with ticker running
- Verify no memory leaks (ticker cleanup)
- Test with 10 pinned zones (max load)
- Profile Canvas redraw time

---

## Success Criteria

**Functional:**
- ✅ All times update every second across UI
- ✅ Users can pin up to 10 zones
- ✅ Search finds zones by name, city, country
- ✅ Day/night gradients reflect local solar time
- ✅ Dark mode works across all components
- ✅ Pins and theme persist across page reloads

**Performance:**
- ✅ Clock updates smooth (no lag or jank)
- ✅ Search results appear within 100ms
- ✅ Theme switch completes within 300ms
- ✅ No memory leaks from ticker

**Usability:**
- ✅ Pinned panel intuitive (clear how to add/remove)
- ✅ Search keyboard navigation works
- ✅ Dark mode comfortable for extended viewing
- ✅ Responsive design works on all screen sizes

**Maintainability:**
- ✅ New components follow Phase 1 patterns
- ✅ State management centralized in UIController
- ✅ CSS variables enable easy theming
- ✅ Tests cover critical functionality

---

## Risks and Mitigations

**Risk:** Clock ticker causes performance issues
- **Mitigation:** Only update visible elements, throttle if tab not active

**Risk:** Too many pinned zones cause UI overflow
- **Mitigation:** Enforce max 10 zones, make panel scrollable

**Risk:** Search slow with many zones
- **Mitigation:** Debounce input (300ms), limit results to 10

**Risk:** Theme switch feels jarring
- **Mitigation:** CSS transitions (0.3s ease) for smooth change

**Risk:** LocalStorage quota exceeded
- **Mitigation:** Only store IDs and theme (minimal data)

---

## Future Enhancements (Out of Scope)

**Not included in Phase 2, but designed to support:**
- Drag-to-reorder pinned zones
- Export pinned zones to share/bookmark
- Keyboard shortcuts (e.g., "/" to focus search)
- Time zone offset from user's local time
- "Compare to my time" feature
- Custom zone labels/nicknames

---

## Conclusion

Phase 2 transforms the basic Phase 1 MVP into a fully interactive time zone exploration tool. By adding live updates, zone comparison, search, visual context, and dark mode, we create a practical utility that users will want to keep open. The incremental implementation approach allows each feature to be tested independently before integration, reducing risk while maintaining steady progress toward the Phase 2 deliverable: a fully interactive map with time zone exploration.
