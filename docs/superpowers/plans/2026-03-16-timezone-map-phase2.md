# Better Time Zone Map - Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live clock updates, pinned zones comparison panel, search functionality, day/night gradients, and dark mode support to the time zone visualization.

**Architecture:** Introduce AppState for centralized state management. UIController evolves into state manager coordinating new components (PinnedZonesPanel, SearchBar, ThemeToggle). MapRenderer enhanced with day/night gradient calculations. Follow TDD throughout.

**Tech Stack:** TypeScript, Vite, Canvas API, Vitest, CSS variables for theming

**Spec:** `docs/superpowers/specs/2026-03-16-timezone-map-phase2-design.md`

---

## File Structure

### New Files

```
src/
├── modules/
│   ├── PinnedZonesPanel.ts       # Sidebar with pinned zone cards
│   ├── SearchBar.ts               # Top bar search with dropdown
│   └── ThemeToggle.ts             # Dark mode toggle button
├── styles/
│   ├── pinned-panel.css           # Panel-specific styles
│   ├── search.css                 # Search-specific styles
│   └── theme.css                  # Theme definitions (CSS variables)
```

### Modified Files

```
src/
├── types/
│   └── AppState.ts                # Add AppState interface
├── modules/
│   ├── UIController.ts            # State management, ticker, coordination
│   └── MapRenderer.ts             # Day/night gradients, theme support
├── main.ts                        # Initialize new components
├── styles/
│   └── main.css                   # CSS variables, theme classes
index.html                         # Add containers for new components
```

---

## Chunk 1: Foundation and Global Clock Ticker

### Task 1: Add AppState Type Definition

**Files:**
- Modify: `src/types/AppState.ts` (entire file)

- [ ] **Step 1: Write AppState interface**

```typescript
export interface AppState {
  pinnedZoneIds: string[];
  searchQuery: string;
  theme: 'light' | 'dark';
  clockTickerHandle: number | null;
}

export const DEFAULT_APP_STATE: AppState = {
  pinnedZoneIds: [],
  searchQuery: '',
  theme: 'light',
  clockTickerHandle: null,
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/AppState.ts
git commit -m "feat: add AppState type definition for Phase 2"
```

---

### Task 2: Implement Global Clock Ticker in UIController

**Files:**
- Modify: `src/modules/UIController.ts` (add state, ticker methods)
- Test: `src/modules/__tests__/UIController.test.ts` (new file)

- [ ] **Step 1: Write failing test for clock ticker**

Create `src/modules/__tests__/UIController.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UIController } from '../UIController';

describe('UIController - Clock Ticker', () => {
  let canvas: HTMLCanvasElement;
  let tooltip: HTMLElement;
  let controller: UIController;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    tooltip = document.createElement('div');
    controller = new UIController(canvas, tooltip);
  });

  afterEach(() => {
    controller.stopClockTicker();
  });

  it('should start clock ticker and store handle', () => {
    vi.useFakeTimers();

    controller.startClockTicker();

    expect(controller['state'].clockTickerHandle).not.toBeNull();

    vi.useRealTimers();
  });

  it('should stop clock ticker and clear handle', () => {
    vi.useFakeTimers();

    controller.startClockTicker();
    controller.stopClockTicker();

    expect(controller['state'].clockTickerHandle).toBeNull();

    vi.useRealTimers();
  });

  it('should call updateAllTimes every second', () => {
    vi.useFakeTimers();
    const updateSpy = vi.spyOn(controller as any, 'updateAllTimes');

    controller.startClockTicker();

    vi.advanceTimersByTime(1000);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(updateSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test UIController.test.ts`
Expected: FAIL - "state" property does not exist, methods undefined

- [ ] **Step 3: Add state and ticker methods to UIController**

Modify `src/modules/UIController.ts`:

```typescript
import { DataManager } from './DataManager';
import { TimeZoneEngine } from './TimeZoneEngine';
import { MapRenderer } from './MapRenderer';
import type { TimeZone } from '../types/TimeZone';
import type { AppState } from '../types/AppState';
import { DEFAULT_APP_STATE } from '../types/AppState';

export class UIController {
  private canvas: HTMLCanvasElement;
  private tooltip: HTMLElement;
  private dataManager: DataManager | null = null;
  private timeZoneEngine: TimeZoneEngine | null = null;
  private mapRenderer: MapRenderer | null = null;
  private timeZones: TimeZone[] | null = null;
  private state: AppState;

  constructor(canvas: HTMLCanvasElement, tooltip: HTMLElement) {
    this.canvas = canvas;
    this.tooltip = tooltip;
    this.state = { ...DEFAULT_APP_STATE };
  }

  async initialize(): Promise<void> {
    try {
      // Step 1: Load time zone data
      this.dataManager = new DataManager();
      this.timeZones = await this.dataManager.loadTimeZones();

      // Step 2: Initialize TimeZoneEngine
      this.timeZoneEngine = new TimeZoneEngine(this.timeZones);

      // Step 3: Initialize MapRenderer with canvas dimensions
      const { width, height } = this.getCanvasDimensions();
      this.mapRenderer = new MapRenderer(this.canvas, this.timeZones, {
        width,
        height,
      });

      // Step 4: Render the map
      this.mapRenderer.render();

      // Step 5: Set up event listeners
      this.setupEventListeners();

      // Step 6: Start clock ticker
      this.startClockTicker();

      console.log('UIController initialized successfully');
    } catch (error) {
      console.error('Failed to initialize UIController:', error);
      throw error;
    }
  }

  startClockTicker(): void {
    // Clear any existing ticker
    if (this.state.clockTickerHandle !== null) {
      clearInterval(this.state.clockTickerHandle);
    }

    // Start new ticker (1000ms interval)
    const handle = setInterval(() => {
      this.updateAllTimes();
    }, 1000);

    this.state.clockTickerHandle = handle;
  }

  stopClockTicker(): void {
    if (this.state.clockTickerHandle !== null) {
      clearInterval(this.state.clockTickerHandle);
      this.state.clockTickerHandle = null;
    }
  }

  private updateAllTimes(): void {
    // Update tooltip if visible
    if (this.tooltip && !this.tooltip.classList.contains('hidden')) {
      const zoneId = this.tooltip.dataset.zoneId;
      if (zoneId && this.timeZoneEngine) {
        this.updateTooltipTime(zoneId);
      }
    }

    // TODO: Update pinned zones panel when implemented
  }

  private updateTooltipTime(zoneId: string): void {
    if (!this.timeZoneEngine) return;

    const zone = this.timeZones?.find((z) => z.id === zoneId);
    if (!zone) return;

    const currentTime = this.timeZoneEngine.getCurrentTime(zoneId);
    const hours = currentTime.getUTCHours();
    const minutes = currentTime.getUTCMinutes();
    const seconds = currentTime.getUTCSeconds();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const timeElement = this.tooltip.querySelector('.tooltip-time');
    if (timeElement) {
      timeElement.textContent = timeString;
    }
  }

  // ... rest of existing methods
}
```

Also add cleanup to existing code:

```typescript
  private setupEventListeners(): void {
    // ... existing listeners

    // Cleanup ticker on window unload
    window.addEventListener('beforeunload', () => {
      this.stopClockTicker();
    });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test UIController.test.ts`
Expected: PASS (all tests passing)

- [ ] **Step 5: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/modules/UIController.ts src/modules/__tests__/UIController.test.ts
git commit -m "feat: add global clock ticker to UIController

- Adds AppState to UIController
- Implements startClockTicker() and stopClockTicker()
- Updates tooltip times every second
- Cleans up interval on window unload
- Full test coverage for ticker lifecycle"
```

---

## Chunk 2: Pinned Zones Panel

### Task 3: Implement PinnedZonesPanel Component

**Files:**
- Create: `src/modules/PinnedZonesPanel.ts`
- Test: `src/modules/__tests__/PinnedZonesPanel.test.ts`

- [ ] **Step 1: Write failing tests for PinnedZonesPanel**

Create `src/modules/__tests__/PinnedZonesPanel.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PinnedZonesPanel } from '../PinnedZonesPanel';
import { TimeZoneEngine } from '../TimeZoneEngine';
import type { TimeZone } from '../../types/TimeZone';

const mockZones: TimeZone[] = [
  {
    id: 'America/New_York',
    name: 'Eastern Standard Time',
    abbreviation: 'EST',
    offset: -300,
    countries: ['US'],
    majorCities: ['New York'],
    coordinates: { lat: 40.7128, lon: -74.006 },
  },
];

describe('PinnedZonesPanel', () => {
  let container: HTMLElement;
  let panel: PinnedZonesPanel;
  let mockUIController: any;
  let timeZoneEngine: TimeZoneEngine;

  beforeEach(() => {
    container = document.createElement('div');
    timeZoneEngine = new TimeZoneEngine(mockZones);
    mockUIController = {
      removePinnedZone: vi.fn(),
    };
    panel = new PinnedZonesPanel(container, mockUIController, timeZoneEngine);
  });

  it('should render empty state when no zones pinned', () => {
    panel.render([]);

    const emptyState = container.querySelector('.empty-state');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('Click on zones');
  });

  it('should render pinned zone cards', () => {
    panel.render(['America/New_York']);

    const cards = container.querySelectorAll('.zone-card');
    expect(cards.length).toBe(1);

    const zoneName = container.querySelector('.zone-card-header h3');
    expect(zoneName?.textContent).toContain('Eastern Standard Time');
  });

  it('should render time in HH:MM:SS format', () => {
    panel.render(['America/New_York']);

    const timeElement = container.querySelector('.zone-card-time');
    expect(timeElement?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('should call removePinnedZone when unpin button clicked', () => {
    panel.render(['America/New_York']);

    const unpinButton = container.querySelector('.unpin-button') as HTMLButtonElement;
    unpinButton?.click();

    expect(mockUIController.removePinnedZone).toHaveBeenCalledWith('America/New_York');
  });

  it('should update times when updateTimes() called', () => {
    panel.render(['America/New_York']);

    const timeElement = container.querySelector('.zone-card-time');
    const firstTime = timeElement?.textContent;

    // Wait a bit and update
    setTimeout(() => {
      panel.updateTimes(['America/New_York']);
      const secondTime = timeElement?.textContent;

      // Times should be different (seconds changed)
      expect(secondTime).not.toBe(firstTime);
    }, 1100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test PinnedZonesPanel.test.ts`
Expected: FAIL - PinnedZonesPanel class does not exist

- [ ] **Step 3: Implement PinnedZonesPanel**

Create `src/modules/PinnedZonesPanel.ts`:

```typescript
import type { TimeZoneEngine } from './TimeZoneEngine';
import type { TimeZone } from '../types/TimeZone';

export class PinnedZonesPanel {
  private container: HTMLElement;
  private uiController: any; // Will be fully typed UIController
  private timeZoneEngine: TimeZoneEngine;
  private timeZones: TimeZone[];

  constructor(
    container: HTMLElement,
    uiController: any,
    timeZoneEngine: TimeZoneEngine
  ) {
    this.container = container;
    this.uiController = uiController;
    this.timeZoneEngine = timeZoneEngine;
    this.timeZones = timeZoneEngine['zones']
      ? Array.from(timeZoneEngine['zones'].values())
      : [];
  }

  render(pinnedZoneIds: string[]): void {
    this.container.innerHTML = '';

    if (pinnedZoneIds.length === 0) {
      this.container.appendChild(this.renderEmptyState());
      return;
    }

    const panelContent = document.createElement('div');
    panelContent.className = 'panel-content';

    pinnedZoneIds.forEach((zoneId) => {
      const zone = this.timeZones.find((z) => z.id === zoneId);
      if (zone) {
        panelContent.appendChild(this.renderPinnedZone(zone));
      }
    });

    this.container.appendChild(panelContent);
  }

  updateTimes(pinnedZoneIds: string[]): void {
    pinnedZoneIds.forEach((zoneId) => {
      const timeElement = this.container.querySelector(
        `[data-zone-id="${zoneId}"] .zone-card-time`
      );
      if (timeElement) {
        const currentTime = this.timeZoneEngine.getCurrentTime(zoneId);
        const hours = currentTime.getUTCHours();
        const minutes = currentTime.getUTCMinutes();
        const seconds = currentTime.getUTCSeconds();
        timeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    });
  }

  private renderPinnedZone(zone: TimeZone): HTMLElement {
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.dataset.zoneId = zone.id;

    // Header with zone name and unpin button
    const header = document.createElement('div');
    header.className = 'zone-card-header';

    const name = document.createElement('h3');
    name.textContent = zone.name;
    header.appendChild(name);

    const unpinButton = document.createElement('button');
    unpinButton.className = 'unpin-button';
    unpinButton.textContent = '×';
    unpinButton.title = 'Unpin zone';
    unpinButton.onclick = () => this.handleUnpin(zone.id);
    header.appendChild(unpinButton);

    card.appendChild(header);

    // Current time
    const time = document.createElement('div');
    time.className = 'zone-card-time';
    const currentTime = this.timeZoneEngine.getCurrentTime(zone.id);
    const hours = currentTime.getUTCHours();
    const minutes = currentTime.getUTCMinutes();
    const seconds = currentTime.getUTCSeconds();
    time.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    card.appendChild(time);

    // Meta info (date and offset)
    const meta = document.createElement('div');
    meta.className = 'zone-card-meta';

    const date = document.createElement('div');
    date.className = 'zone-card-date';
    date.textContent = currentTime.toUTCString().split(' ').slice(0, 4).join(' ');
    meta.appendChild(date);

    const offset = document.createElement('div');
    offset.className = 'zone-card-offset';
    const offsetHours = Math.floor(Math.abs(zone.offset) / 60);
    const offsetMins = Math.abs(zone.offset) % 60;
    const sign = zone.offset >= 0 ? '+' : '-';
    offset.textContent = `UTC${sign}${offsetHours}${offsetMins > 0 ? `:${offsetMins}` : ''}`;
    meta.appendChild(offset);

    card.appendChild(meta);

    return card;
  }

  private renderEmptyState(): HTMLElement {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.textContent = '📍';
    emptyState.appendChild(icon);

    const text = document.createElement('p');
    text.textContent = 'Click on zones to pin them here';
    emptyState.appendChild(text);

    const subtext = document.createElement('p');
    subtext.className = 'empty-state-subtext';
    subtext.textContent = 'Compare times across multiple zones';
    emptyState.appendChild(subtext);

    return emptyState;
  }

  private handleUnpin(zoneId: string): void {
    this.uiController.removePinnedZone(zoneId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test PinnedZonesPanel.test.ts`
Expected: PASS (all tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/modules/PinnedZonesPanel.ts src/modules/__tests__/PinnedZonesPanel.test.ts
git commit -m "feat: implement PinnedZonesPanel component

- Renders pinned zone cards with live times
- Shows empty state when no zones pinned
- Handles unpin actions
- Updates times via updateTimes() method
- Full test coverage"
```

---

### Task 4: Add Pinned Panel Styles

**Files:**
- Create: `src/styles/pinned-panel.css`

- [ ] **Step 1: Create pinned panel CSS**

Create `src/styles/pinned-panel.css`:

```css
.pinned-zones-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 300px;
  height: 100vh;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  box-shadow: -2px 0 8px var(--shadow);
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.panel-toggle {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  color: var(--text-secondary);
}

.panel-toggle:hover {
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zone-card {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 4px var(--shadow);
}

.zone-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.zone-card-header h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.unpin-button {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  color: var(--text-secondary);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unpin-button:hover {
  color: var(--text-primary);
  background: var(--border);
  border-radius: 4px;
}

.zone-card-time {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 32px;
  font-weight: 300;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.zone-card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.zone-card-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.zone-card-offset {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  height: 100%;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-state-subtext {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Responsive */
@media (max-width: 1024px) {
  .pinned-zones-panel {
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }

  .pinned-zones-panel.open {
    transform: translateX(0);
  }
}

@media (max-width: 768px) {
  .pinned-zones-panel {
    width: 100%;
  }
}
```

- [ ] **Step 2: Import styles in main.ts**

Modify `src/main.ts`:

```typescript
import { UIController } from './modules/UIController';
import './styles/main.css';
import './styles/pinned-panel.css'; // NEW

document.addEventListener('DOMContentLoaded', async () => {
  // ... existing code
});
```

- [ ] **Step 3: Test visual appearance**

Run: `npm run dev`
Visit: http://localhost:3000
Expected: Styles loaded (verify in dev tools)

- [ ] **Step 4: Commit**

```bash
git add src/styles/pinned-panel.css src/main.ts
git commit -m "style: add pinned zones panel CSS

- Complete styling for panel, cards, empty state
- Responsive behavior for tablet/mobile
- Uses CSS variables for theming"
```

---

### Task 5: Integrate PinnedZonesPanel into UIController

**Files:**
- Modify: `src/modules/UIController.ts` (add panel, pin/unpin methods)
- Modify: `index.html` (add panel container)

- [ ] **Step 1: Add panel container to HTML**

Modify `index.html`:

```html
<body>
  <div id="app">
    <canvas id="mapCanvas"></canvas>
    <div id="tooltip" class="tooltip hidden"></div>
    <div id="pinned-zones-panel" class="pinned-zones-panel"></div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

- [ ] **Step 2: Integrate panel into UIController**

Modify `src/modules/UIController.ts`:

```typescript
import { PinnedZonesPanel } from './PinnedZonesPanel';

export class UIController {
  // ... existing properties
  private pinnedZonesPanel: PinnedZonesPanel | null = null;

  async initialize(): Promise<void> {
    try {
      // ... existing initialization

      // Step 4.5: Initialize PinnedZonesPanel
      const panelContainer = document.getElementById('pinned-zones-panel');
      if (panelContainer && this.timeZoneEngine) {
        this.pinnedZonesPanel = new PinnedZonesPanel(
          panelContainer,
          this,
          this.timeZoneEngine
        );
        this.pinnedZonesPanel.render(this.state.pinnedZoneIds);
      }

      // ... rest of initialization
    }
  }

  private updateAllTimes(): void {
    // Update tooltip if visible
    if (this.tooltip && !this.tooltip.classList.contains('hidden')) {
      const zoneId = this.tooltip.dataset.zoneId;
      if (zoneId && this.timeZoneEngine) {
        this.updateTooltipTime(zoneId);
      }
    }

    // Update pinned zones panel
    if (this.pinnedZonesPanel) {
      this.pinnedZonesPanel.updateTimes(this.state.pinnedZoneIds);
    }
  }

  // Add pin/unpin methods
  addPinnedZone(zoneId: string): void {
    if (this.state.pinnedZoneIds.includes(zoneId)) {
      return; // Already pinned
    }

    if (this.state.pinnedZoneIds.length >= 10) {
      alert('Maximum 10 zones can be pinned');
      return;
    }

    this.state.pinnedZoneIds = [...this.state.pinnedZoneIds, zoneId];
    this.persistPinnedZones();

    if (this.pinnedZonesPanel) {
      this.pinnedZonesPanel.render(this.state.pinnedZoneIds);
    }
  }

  removePinnedZone(zoneId: string): void {
    this.state.pinnedZoneIds = this.state.pinnedZoneIds.filter(
      (id) => id !== zoneId
    );
    this.persistPinnedZones();

    if (this.pinnedZonesPanel) {
      this.pinnedZonesPanel.render(this.state.pinnedZoneIds);
    }
  }

  private persistPinnedZones(): void {
    localStorage.setItem(
      'tzmap_pinned_zones',
      JSON.stringify(this.state.pinnedZoneIds)
    );
  }

  private loadPinnedZones(): void {
    const saved = localStorage.getItem('tzmap_pinned_zones');
    if (saved) {
      try {
        this.state.pinnedZoneIds = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to load pinned zones from localStorage');
      }
    }
  }

  // Call loadPinnedZones in initialize()
  async initialize(): Promise<void> {
    try {
      // ... after data loaded
      this.loadPinnedZones(); // Load persisted pins

      // ... rest of initialization
    }
  }

  // Update click handler to add pin
  private handleCanvasClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (this.mapRenderer) {
      const zone = this.mapRenderer.getZoneAtPosition(x, y);
      if (zone) {
        this.addPinnedZone(zone.id); // NEW: Pin instead of alert
        this.showZoneInfo(zone); // Keep alert for now
      }
    }
  }
}
```

- [ ] **Step 3: Test pinning functionality**

Run: `npm run dev`
Actions:
1. Click on a zone
2. Verify zone appears in right sidebar
3. Verify time updates every second
4. Click X to unpin
5. Reload page, verify pins persist

Expected: All behaviors work

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/modules/UIController.ts index.html
git commit -m "feat: integrate PinnedZonesPanel into UIController

- Add panel initialization
- Connect clock ticker to panel updates
- Implement addPinnedZone/removePinnedZone
- Persist pinned zones to localStorage
- Update click handler to pin zones"
```

---

## Chunk 3: Day/Night Gradients

### Task 6: Add Day/Night Gradient Calculation to MapRenderer

**Files:**
- Modify: `src/modules/MapRenderer.ts` (add gradient logic)
- Test: `src/modules/__tests__/MapRenderer.test.ts` (new file)

- [ ] **Step 1: Write failing tests for gradient calculation**

Create `src/modules/__tests__/MapRenderer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
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
    expect(color.toLowerCase()).toBe('#7f7f7f'); // Middle gray
  });

  it('should parse hex color to RGB', () => {
    const rgb = (renderer as any).hexToRgb('#ff00ff');
    expect(rgb).toEqual({ r: 255, g: 0, b: 255 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test MapRenderer.test.ts`
Expected: FAIL - methods do not exist

- [ ] **Step 3: Implement gradient calculation methods**

Modify `src/modules/MapRenderer.ts`:

```typescript
export class MapRenderer {
  // ... existing properties

  private calculateDayNightColor(hour: number, minute: number): string {
    const decimalHour = hour + minute / 60;

    if (decimalHour >= 20 || decimalHour < 6) {
      // Night
      return '#1a2332';
    } else if (decimalHour >= 6 && decimalHour < 8) {
      // Dawn (gradient)
      const progress = (decimalHour - 6) / 2; // 0 to 1
      return this.interpolateColor('#1a2332', '#fbbf24', progress);
    } else if (decimalHour >= 8 && decimalHour < 18) {
      // Day
      return '#fef3c7';
    } else {
      // Dusk (gradient)
      const progress = (decimalHour - 18) / 2; // 0 to 1
      return this.interpolateColor('#fef3c7', '#1a2332', progress);
    }
  }

  private interpolateColor(
    color1: string,
    color2: string,
    progress: number
  ): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * progress);
    const g = Math.round(c1.g + (c2.g - c1.g) * progress);
    const b = Math.round(c1.b + (c2.b - c1.b) * progress);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { r: 0, g: 0, b: 0 };
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  // ... rest of class
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test MapRenderer.test.ts`
Expected: PASS (all tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/modules/MapRenderer.ts src/modules/__tests__/MapRenderer.test.ts
git commit -m "feat: add day/night gradient calculation to MapRenderer

- Calculates gradient color based on local hour
- Night (0-6, 20-24), Dawn (6-8), Day (8-18), Dusk (18-20)
- Implements color interpolation helpers
- Full test coverage for gradient logic"
```

---

### Task 7: Apply Gradients to Zone Rendering

**Files:**
- Modify: `src/modules/MapRenderer.ts` (update render method)
- Modify: `src/modules/UIController.ts` (trigger re-renders)

- [ ] **Step 1: Update MapRenderer to accept TimeZoneEngine**

Modify `src/modules/MapRenderer.ts`:

```typescript
import type { TimeZoneEngine } from './TimeZoneEngine';

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timeZones: TimeZone[];
  private options: { width: number; height: number };
  private timeZoneEngine: TimeZoneEngine | null = null; // NEW

  constructor(
    canvas: HTMLCanvasElement,
    timeZones: TimeZone[],
    options: { width: number; height: number }
  ) {
    this.canvas = canvas;
    this.timeZones = timeZones;
    this.options = options;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context from canvas');
    }
    this.ctx = ctx;

    this.canvas.width = options.width;
    this.canvas.height = options.height;
  }

  setTimeZoneEngine(engine: TimeZoneEngine): void {
    this.timeZoneEngine = engine;
  }

  // ... existing methods
}
```

- [ ] **Step 2: Update render to apply gradients**

Modify `src/modules/MapRenderer.ts`:

```typescript
  render(): void {
    // Clear canvas
    this.ctx.fillStyle = '#e8f4f8';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw zones with gradients
    this.drawSimpleMap();
  }

  private drawSimpleMap(): void {
    const zoneWidth = this.canvas.width / this.timeZones.length;

    this.timeZones.forEach((zone, index) => {
      const x = index * zoneWidth;

      // Get base color
      const baseColor = this.getZoneColor(zone);

      // Apply day/night gradient if TimeZoneEngine available
      let finalColor = baseColor;
      if (this.timeZoneEngine) {
        const localTime = this.timeZoneEngine.getCurrentTime(zone.id);
        const hour = localTime.getUTCHours();
        const minute = localTime.getUTCMinutes();
        const gradientColor = this.calculateDayNightColor(hour, minute);

        // Blend base color with gradient (60% opacity)
        finalColor = this.blendColors(baseColor, gradientColor, 0.6);
      }

      // Draw zone rectangle
      this.ctx.fillStyle = finalColor;
      this.ctx.fillRect(x, 0, zoneWidth, this.canvas.height);

      // Draw zone label
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '16px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        zone.abbreviation,
        x + zoneWidth / 2,
        this.canvas.height / 2
      );
    });
  }

  private blendColors(
    baseColor: string,
    overlayColor: string,
    opacity: number
  ): string {
    const base = this.hexToRgb(baseColor);
    const overlay = this.hexToRgb(overlayColor);

    const r = Math.round(base.r * (1 - opacity) + overlay.r * opacity);
    const g = Math.round(base.g * (1 - opacity) + overlay.g * opacity);
    const b = Math.round(base.b * (1 - opacity) + overlay.b * opacity);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
```

- [ ] **Step 3: Update UIController to set engine and trigger re-renders**

Modify `src/modules/UIController.ts`:

```typescript
  async initialize(): Promise<void> {
    try {
      // ... existing code

      // Step 3: Initialize MapRenderer with canvas dimensions
      const { width, height } = this.getCanvasDimensions();
      this.mapRenderer = new MapRenderer(this.canvas, this.timeZones, {
        width,
        height,
      });

      // NEW: Set TimeZoneEngine reference
      this.mapRenderer.setTimeZoneEngine(this.timeZoneEngine);

      // ... rest of initialization
    }
  }

  private updateAllTimes(): void {
    // Update tooltip if visible
    if (this.tooltip && !this.tooltip.classList.contains('hidden')) {
      const zoneId = this.tooltip.dataset.zoneId;
      if (zoneId && this.timeZoneEngine) {
        this.updateTooltipTime(zoneId);
      }
    }

    // Update pinned zones panel
    if (this.pinnedZonesPanel) {
      this.pinnedZonesPanel.updateTimes(this.state.pinnedZoneIds);
    }

    // Re-render map with updated gradients
    if (this.mapRenderer) {
      this.mapRenderer.render();
    }
  }
```

- [ ] **Step 4: Test gradients visually**

Run: `npm run dev`
Expected:
- Zone colors change based on time of day
- Gradients update every second
- Dawn/dusk zones show blended colors

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/modules/MapRenderer.ts src/modules/UIController.ts
git commit -m "feat: apply day/night gradients to zone rendering

- MapRenderer blends base colors with gradient overlays
- Gradients update every second via ticker
- 60% opacity blend for subtle effect
- Set TimeZoneEngine reference in MapRenderer"
```

---

## Chunk 4: Search Functionality

### Task 8: Implement SearchBar Component

**Files:**
- Create: `src/modules/SearchBar.ts`
- Test: `src/modules/__tests__/SearchBar.test.ts`

- [ ] **Step 1: Write failing tests for SearchBar**

Create `src/modules/__tests__/SearchBar.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchBar } from '../SearchBar';
import type { TimeZone } from '../../types/TimeZone';

const mockZones: TimeZone[] = [
  {
    id: 'America/New_York',
    name: 'Eastern Standard Time',
    abbreviation: 'EST',
    offset: -300,
    countries: ['US'],
    majorCities: ['New York', 'Miami'],
    coordinates: { lat: 40.7128, lon: -74.006 },
  },
  {
    id: 'Europe/London',
    name: 'Greenwich Mean Time',
    abbreviation: 'GMT',
    offset: 0,
    countries: ['GB'],
    majorCities: ['London'],
    coordinates: { lat: 51.5074, lon: -0.1278 },
  },
];

describe('SearchBar', () => {
  let container: HTMLElement;
  let searchBar: SearchBar;
  let mockUIController: any;

  beforeEach(() => {
    container = document.createElement('div');
    mockUIController = {
      addPinnedZone: vi.fn(),
    };
    searchBar = new SearchBar(container, mockUIController, mockZones);
    searchBar.render();
  });

  it('should render search input', () => {
    const input = container.querySelector('.search-input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toContain('Search');
  });

  it('should filter zones by name', () => {
    const results = (searchBar as any).filterZones('eastern');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('America/New_York');
  });

  it('should filter zones by city', () => {
    const results = (searchBar as any).filterZones('london');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('Europe/London');
  });

  it('should return empty array for no matches', () => {
    const results = (searchBar as any).filterZones('xyz');
    expect(results.length).toBe(0);
  });

  it('should score exact name match highest', () => {
    const score = (searchBar as any).calculateSearchScore(
      mockZones[0],
      'eastern standard time'
    );
    expect(score).toBeGreaterThan(50);
  });

  it('should call addPinnedZone when result selected', () => {
    (searchBar as any).selectZone(mockZones[0]);
    expect(mockUIController.addPinnedZone).toHaveBeenCalledWith('America/New_York');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test SearchBar.test.ts`
Expected: FAIL - SearchBar class does not exist

- [ ] **Step 3: Implement SearchBar**

Create `src/modules/SearchBar.ts`:

```typescript
import type { TimeZone } from '../types/TimeZone';

export class SearchBar {
  private container: HTMLElement;
  private uiController: any; // Will be fully typed UIController
  private timeZones: TimeZone[];
  private input: HTMLInputElement | null = null;
  private dropdown: HTMLElement | null = null;
  private debounceTimer: number | null = null;
  private selectedIndex: number = -1;

  constructor(container: HTMLElement, uiController: any, timeZones: TimeZone[]) {
    this.container = container;
    this.uiController = uiController;
    this.timeZones = timeZones;
  }

  render(): void {
    this.container.className = 'search-bar';

    // Input wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'search-input-wrapper';

    // Search icon
    const icon = document.createElement('span');
    icon.className = 'search-icon';
    icon.textContent = '🔍';
    wrapper.appendChild(icon);

    // Input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'search-input';
    this.input.placeholder = 'Search time zones (city, country, or zone name)...';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.addEventListener('input', (e) =>
      this.handleInput((e.target as HTMLInputElement).value)
    );
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    wrapper.appendChild(this.input);

    // Clear button
    const clearButton = document.createElement('button');
    clearButton.className = 'search-clear hidden';
    clearButton.textContent = '✕';
    clearButton.title = 'Clear search';
    clearButton.addEventListener('click', () => this.clearSearch());
    wrapper.appendChild(clearButton);

    this.container.appendChild(wrapper);

    // Dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'search-dropdown hidden';
    this.container.appendChild(this.dropdown);
  }

  private handleInput(query: string): void {
    // Show/hide clear button
    const clearButton = this.container.querySelector('.search-clear');
    if (clearButton) {
      if (query.trim()) {
        clearButton.classList.remove('hidden');
      } else {
        clearButton.classList.add('hidden');
      }
    }

    // Debounce search
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      const results = this.filterZones(query);
      this.renderResults(results);
    }, 300);
  }

  private filterZones(query: string): TimeZone[] {
    if (!query.trim()) {
      this.closeDropdown();
      return [];
    }

    const lowerQuery = query.toLowerCase();

    return this.timeZones
      .map((zone) => ({
        zone,
        score: this.calculateSearchScore(zone, lowerQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.zone);
  }

  private calculateSearchScore(zone: TimeZone, query: string): number {
    let score = 0;

    const nameLower = zone.name.toLowerCase();

    // Exact name match
    if (nameLower === query) score += 100;
    // Name starts with query
    else if (nameLower.startsWith(query)) score += 50;
    // Name contains query
    else if (nameLower.includes(query)) score += 25;

    // City matches
    if (zone.majorCities.some((city) => city.toLowerCase() === query)) score += 80;
    else if (zone.majorCities.some((city) => city.toLowerCase().startsWith(query)))
      score += 40;
    else if (zone.majorCities.some((city) => city.toLowerCase().includes(query)))
      score += 20;

    // Country match
    if (zone.countries.some((country) => country.toLowerCase().includes(query)))
      score += 15;

    // Zone ID match
    if (zone.id.toLowerCase().includes(query)) score += 10;

    return score;
  }

  private renderResults(results: TimeZone[]): void {
    if (!this.dropdown) return;

    this.dropdown.innerHTML = '';
    this.selectedIndex = -1;

    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.textContent = 'No results found';
      this.dropdown.appendChild(noResults);
      this.dropdown.classList.remove('hidden');
      return;
    }

    results.forEach((zone, index) => {
      const result = document.createElement('div');
      result.className = 'search-result';
      result.dataset.index = index.toString();

      const name = document.createElement('div');
      name.className = 'search-result-name';
      name.textContent = zone.name;
      result.appendChild(name);

      const meta = document.createElement('div');
      meta.className = 'search-result-meta';
      meta.textContent = `${zone.majorCities[0] || ''} • ${zone.id}`;
      result.appendChild(meta);

      result.addEventListener('click', () => this.selectZone(zone));
      result.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateHighlight();
      });

      this.dropdown.appendChild(result);
    });

    this.dropdown.classList.remove('hidden');
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.dropdown || this.dropdown.classList.contains('hidden')) return;

    const results = this.dropdown.querySelectorAll('.search-result');
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
      this.updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.selectedIndex >= 0) {
        const result = results[this.selectedIndex];
        const zoneName = result.querySelector('.search-result-name')?.textContent;
        const zone = this.timeZones.find((z) => z.name === zoneName);
        if (zone) {
          this.selectZone(zone);
        }
      }
    } else if (e.key === 'Escape') {
      this.closeDropdown();
    }
  }

  private updateHighlight(): void {
    if (!this.dropdown) return;

    const results = this.dropdown.querySelectorAll('.search-result');
    results.forEach((result, index) => {
      if (index === this.selectedIndex) {
        result.classList.add('search-result-highlighted');
      } else {
        result.classList.remove('search-result-highlighted');
      }
    });
  }

  private selectZone(zone: TimeZone): void {
    this.uiController.addPinnedZone(zone.id);
    this.clearSearch();
  }

  private clearSearch(): void {
    if (this.input) {
      this.input.value = '';
    }
    this.closeDropdown();

    const clearButton = this.container.querySelector('.search-clear');
    if (clearButton) {
      clearButton.classList.add('hidden');
    }
  }

  private closeDropdown(): void {
    if (this.dropdown) {
      this.dropdown.classList.add('hidden');
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test SearchBar.test.ts`
Expected: PASS (all tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/modules/SearchBar.ts src/modules/__tests__/SearchBar.test.ts
git commit -m "feat: implement SearchBar component

- Search by zone name, city, country, or ID
- Debounced input (300ms)
- Keyboard navigation (arrows, enter, ESC)
- Scores and ranks results
- Max 10 results displayed
- Full test coverage"
```

---

### Task 9: Add Search Bar Styles

**Files:**
- Create: `src/styles/search.css`

- [ ] **Step 1: Create search CSS**

Create `src/styles/search.css`:

```css
.search-bar {
  position: fixed;
  top: 20px;
  left: 40px;
  right: 340px; /* Leave space for pinned panel */
  z-index: 100;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 2px 8px var(--shadow);
  padding: 0 12px;
  height: 48px;
}

.search-icon {
  font-size: 20px;
  margin-right: 8px;
  color: var(--text-secondary);
}

.search-input {
  flex: 1;
  border: none;
  background: none;
  font-size: 16px;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.search-clear {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  color: var(--text-secondary);
  line-height: 1;
}

.search-clear:hover {
  color: var(--text-primary);
}

.search-clear.hidden {
  display: none;
}

.search-dropdown {
  position: absolute;
  top: 56px;
  left: 0;
  right: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow);
  max-height: 400px;
  overflow-y: auto;
}

.search-dropdown.hidden {
  display: none;
}

.search-result {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
}

.search-result:last-child {
  border-bottom: none;
}

.search-result:hover,
.search-result-highlighted {
  background: var(--bg-primary);
}

.search-result-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.search-result-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.search-no-results {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Responsive */
@media (max-width: 1024px) {
  .search-bar {
    right: 40px; /* Full width when panel collapsed */
  }
}

@media (max-width: 768px) {
  .search-bar {
    left: 20px;
    right: 20px;
  }
}
```

- [ ] **Step 2: Import styles in main.ts**

Modify `src/main.ts`:

```typescript
import { UIController } from './modules/UIController';
import './styles/main.css';
import './styles/pinned-panel.css';
import './styles/search.css'; // NEW
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/search.css src/main.ts
git commit -m "style: add search bar CSS

- Complete styling for search input and dropdown
- Keyboard highlight styles
- Responsive behavior
- Uses CSS variables for theming"
```

---

### Task 10: Integrate SearchBar into UIController

**Files:**
- Modify: `src/modules/UIController.ts` (add search bar)
- Modify: `index.html` (add search container)

- [ ] **Step 1: Add search container to HTML**

Modify `index.html`:

```html
<body>
  <div id="app">
    <div id="search-bar"></div>
    <canvas id="mapCanvas"></canvas>
    <div id="tooltip" class="tooltip hidden"></div>
    <div id="pinned-zones-panel" class="pinned-zones-panel"></div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

- [ ] **Step 2: Integrate search bar into UIController**

Modify `src/modules/UIController.ts`:

```typescript
import { SearchBar } from './SearchBar';

export class UIController {
  // ... existing properties
  private searchBar: SearchBar | null = null;

  async initialize(): Promise<void> {
    try {
      // ... existing initialization

      // Step 4.7: Initialize SearchBar
      const searchContainer = document.getElementById('search-bar');
      if (searchContainer) {
        this.searchBar = new SearchBar(searchContainer, this, this.timeZones);
        this.searchBar.render();
      }

      // ... rest of initialization
    }
  }
}
```

- [ ] **Step 3: Test search functionality**

Run: `npm run dev`
Actions:
1. Type "new" in search box
2. Verify dropdown appears with results
3. Use arrow keys to navigate
4. Press Enter to select
5. Verify zone is pinned

Expected: All behaviors work

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/modules/UIController.ts index.html
git commit -m "feat: integrate SearchBar into UIController

- Add search bar initialization
- Connect to pinning functionality
- Render search UI on page load"
```

---

## Chunk 5: Dark Mode Toggle

### Task 11: Add Theme CSS Variables

**Files:**
- Create: `src/styles/theme.css`
- Modify: `src/styles/main.css` (add variables)

- [ ] **Step 1: Create theme CSS**

Create `src/styles/theme.css`:

```css
/* Default theme (light) */
:root {
  --bg-primary: #f8f9fa;
  --bg-surface: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border: #e0e0e0;
  --shadow: rgba(0, 0, 0, 0.15);
}

/* Dark theme */
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
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.tooltip,
.pinned-zones-panel,
.search-bar,
.zone-card,
.search-input-wrapper,
.search-dropdown {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

- [ ] **Step 2: Update main.css to use variables**

Modify `src/styles/main.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  position: relative;
}

#mapCanvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.tooltip {
  position: absolute;
  background: var(--bg-surface);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow);
  pointer-events: none;
  z-index: 1000;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid var(--border);
}

.tooltip.hidden {
  display: none;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
}

.tooltip-zone-name {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.tooltip-time {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 24px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.tooltip-offset {
  color: var(--text-secondary);
  font-size: 12px;
}
```

- [ ] **Step 3: Import theme CSS in main.ts**

Modify `src/main.ts`:

```typescript
import { UIController } from './modules/UIController';
import './styles/theme.css'; // FIRST - defines variables
import './styles/main.css';
import './styles/pinned-panel.css';
import './styles/search.css';
```

- [ ] **Step 4: Test theme variables**

Run: `npm run dev`
Expected: Styles load correctly (no visual change yet)

- [ ] **Step 5: Commit**

```bash
git add src/styles/theme.css src/styles/main.css src/main.ts
git commit -m "style: add CSS variables for theming

- Define light theme variables
- Define dark theme overrides
- Add smooth transitions
- Update components to use variables"
```

---

### Task 12: Implement ThemeToggle Component

**Files:**
- Create: `src/modules/ThemeToggle.ts`
- Test: `src/modules/__tests__/ThemeToggle.test.ts`

- [ ] **Step 1: Write failing tests for ThemeToggle**

Create `src/modules/__tests__/ThemeToggle.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  let mockUIController: any;
  let toggle: ThemeToggle;

  beforeEach(() => {
    mockUIController = {
      setTheme: vi.fn(),
    };
    toggle = new ThemeToggle(mockUIController);
  });

  it('should render toggle button', () => {
    const button = toggle.render();
    expect(button.tagName).toBe('BUTTON');
    expect(button.className).toContain('theme-toggle');
  });

  it('should show moon icon for light mode', () => {
    const button = toggle.render();
    toggle.updateIcon('light');
    expect(button.textContent).toBe('🌙');
    expect(button.title).toContain('dark mode');
  });

  it('should show sun icon for dark mode', () => {
    const button = toggle.render();
    toggle.updateIcon('dark');
    expect(button.textContent).toBe('☀️');
    expect(button.title).toContain('light mode');
  });

  it('should call setTheme when clicked', () => {
    const button = toggle.render();
    toggle.updateIcon('light');
    button.click();
    expect(mockUIController.setTheme).toHaveBeenCalledWith('dark');
  });

  it('should toggle between themes', () => {
    const button = toggle.render();

    toggle.updateIcon('light');
    button.click();
    expect(mockUIController.setTheme).toHaveBeenCalledWith('dark');

    toggle.updateIcon('dark');
    button.click();
    expect(mockUIController.setTheme).toHaveBeenCalledWith('light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test ThemeToggle.test.ts`
Expected: FAIL - ThemeToggle class does not exist

- [ ] **Step 3: Implement ThemeToggle**

Create `src/modules/ThemeToggle.ts`:

```typescript
export class ThemeToggle {
  private uiController: any; // Will be fully typed UIController
  private button: HTMLButtonElement | null = null;
  private currentTheme: 'light' | 'dark' = 'light';

  constructor(uiController: any) {
    this.uiController = uiController;
  }

  render(): HTMLButtonElement {
    this.button = document.createElement('button');
    this.button.id = 'theme-toggle';
    this.button.className = 'theme-toggle';
    this.button.addEventListener('click', () => this.handleToggle());

    return this.button;
  }

  updateIcon(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;

    if (this.button) {
      if (theme === 'light') {
        this.button.textContent = '🌙';
        this.button.setAttribute('aria-label', 'Switch to dark mode');
        this.button.title = 'Switch to dark mode';
      } else {
        this.button.textContent = '☀️';
        this.button.setAttribute('aria-label', 'Switch to light mode');
        this.button.title = 'Switch to light mode';
      }
    }
  }

  private handleToggle(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.uiController.setTheme(newTheme);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test ThemeToggle.test.ts`
Expected: PASS (all tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/modules/ThemeToggle.ts src/modules/__tests__/ThemeToggle.test.ts
git commit -m "feat: implement ThemeToggle component

- Renders toggle button with sun/moon icons
- Toggles between light and dark themes
- Updates icon and label based on current theme
- Full test coverage"
```

---

### Task 13: Add ThemeToggle Styles and Integrate

**Files:**
- Modify: `src/styles/theme.css` (add button styles)
- Modify: `src/modules/UIController.ts` (theme management)
- Modify: `src/modules/MapRenderer.ts` (theme support)
- Modify: `index.html` (add toggle container)

- [ ] **Step 1: Add toggle button styles**

Modify `src/styles/theme.css`:

```css
/* ... existing theme variables

... */

.theme-toggle {
  position: fixed;
  top: 20px;
  right: 320px; /* Left of pinned panel */
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  box-shadow: 0 2px 8px var(--shadow);
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
  transition: transform 0.2s ease;
}

.theme-toggle:hover {
  transform: scale(1.1);
}

.theme-toggle:active {
  transform: scale(0.95);
}

/* Responsive */
@media (max-width: 1024px) {
  .theme-toggle {
    right: 20px;
  }
}
```

- [ ] **Step 2: Add theme management to UIController**

Modify `src/modules/UIController.ts`:

```typescript
import { ThemeToggle } from './ThemeToggle';

export class UIController {
  // ... existing properties
  private themeToggle: ThemeToggle | null = null;

  async initialize(): Promise<void> {
    try {
      // ... existing initialization

      // Load saved theme
      this.loadTheme();

      // Step 4.9: Initialize ThemeToggle
      this.themeToggle = new ThemeToggle(this);
      const toggleButton = this.themeToggle.render();
      this.themeToggle.updateIcon(this.state.theme);
      document.body.appendChild(toggleButton);

      // Apply theme
      this.applyTheme();

      // ... rest of initialization
    }
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.state.theme = theme;
    this.persistTheme();
    this.applyTheme();

    if (this.themeToggle) {
      this.themeToggle.updateIcon(theme);
    }
  }

  private applyTheme(): void {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${this.state.theme}`);

    // Notify MapRenderer
    if (this.mapRenderer) {
      this.mapRenderer.setTheme(this.state.theme);
      this.mapRenderer.render();
    }
  }

  private persistTheme(): void {
    localStorage.setItem('tzmap_theme', this.state.theme);
  }

  private loadTheme(): void {
    const saved = localStorage.getItem('tzmap_theme') as 'light' | 'dark' | null;
    if (saved) {
      this.state.theme = saved;
    }
  }
}
```

- [ ] **Step 3: Add theme support to MapRenderer**

Modify `src/modules/MapRenderer.ts`:

```typescript
export class MapRenderer {
  // ... existing properties
  private theme: 'light' | 'dark' = 'light';

  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
  }

  private getZoneColor(zone: TimeZone): string {
    // Base colors
    const baseColors: Record<string, string> = {
      'America/New_York': '#4a90e2',
      'Europe/London': '#50c878',
      'Asia/Tokyo': '#ff7f50',
    };

    let color = baseColors[zone.id] || '#888888';

    // Brighten colors in dark mode (20% brighter)
    if (this.theme === 'dark') {
      const rgb = this.hexToRgb(color);
      const brightened = {
        r: Math.min(255, Math.round(rgb.r * 1.2)),
        g: Math.min(255, Math.round(rgb.g * 1.2)),
        b: Math.min(255, Math.round(rgb.b * 1.2)),
      };
      color = `#${brightened.r.toString(16).padStart(2, '0')}${brightened.g.toString(16).padStart(2, '0')}${brightened.b.toString(16).padStart(2, '0')}`;
    }

    return color;
  }

  private calculateDayNightColor(hour: number, minute: number): string {
    const decimalHour = hour + minute / 60;

    // Adjust colors for dark mode
    const nightColor = this.theme === 'dark' ? '#0a0f1a' : '#1a2332';
    const dayColor = this.theme === 'dark' ? '#e8e0c7' : '#fef3c7';

    if (decimalHour >= 20 || decimalHour < 6) {
      // Night
      return nightColor;
    } else if (decimalHour >= 6 && decimalHour < 8) {
      // Dawn
      const progress = (decimalHour - 6) / 2;
      return this.interpolateColor(nightColor, '#fbbf24', progress);
    } else if (decimalHour >= 8 && decimalHour < 18) {
      // Day
      return dayColor;
    } else {
      // Dusk
      const progress = (decimalHour - 18) / 2;
      return this.interpolateColor(dayColor, nightColor, progress);
    }
  }
}
```

- [ ] **Step 4: Test theme switching**

Run: `npm run dev`
Actions:
1. Click theme toggle button
2. Verify all colors change
3. Verify map zones adjust brightness
4. Reload page, verify theme persists

Expected: All behaviors work

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/modules/UIController.ts src/modules/MapRenderer.ts src/styles/theme.css
git commit -m "feat: integrate ThemeToggle with theme management

- Add setTheme() to UIController
- Apply theme class to body
- Persist theme to localStorage
- Adjust MapRenderer colors for dark mode
- Theme toggle button styled and positioned"
```

---

## Phase 2 Complete! 🎉

**What Works:**
- ✅ Global clock ticker updating all times every second
- ✅ Pinned zones panel with up to 10 live clocks
- ✅ Day/night gradients showing local solar time
- ✅ Search functionality to find zones quickly
- ✅ Dark mode toggle with smooth transitions
- ✅ All state persisted to localStorage

**Test the App:**
1. Start dev server: `npm run dev`
2. Open http://localhost:3000
3. Search for zones and pin them
4. Watch times and gradients update live
5. Toggle dark mode
6. Reload and verify persistence

**Final Verification:**
- [ ] Run full test suite: `npm test`
- [ ] Run production build: `npm run build`
- [ ] Test in different browsers
- [ ] Verify responsive behavior (tablet, mobile)

**Next Steps (Phase 3):**
- CIA World Factbook data integration
- Info Mode toggle
- Educational quirks system
- Country detail panels
