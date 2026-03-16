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
    }, 1000) as unknown as number;

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

  private getCanvasDimensions(): { width: number; height: number } {
    // Use window dimensions for responsive canvas
    const width = window.innerWidth;
    const height = window.innerHeight;
    return { width, height };
  }

  private setupEventListeners(): void {
    // Mouse move for hover effects and tooltip
    this.canvas.addEventListener('mousemove', (event) => {
      this.handleMouseMove(event);
    });

    // Mouse leave to hide tooltip
    this.canvas.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });

    // Click to show zone details
    this.canvas.addEventListener('click', (event) => {
      this.handleCanvasClick(event);
    });

    // Window resize to recreate renderer
    window.addEventListener('resize', () => {
      this.handleWindowResize();
    });

    // Cleanup ticker on window unload
    window.addEventListener('beforeunload', () => {
      this.stopClockTicker();
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.mapRenderer || !this.timeZoneEngine) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Get zone at cursor position
    const zone = this.mapRenderer.getZoneAtPosition(x, y);

    if (zone) {
      this.showTooltip(zone, event);
    } else {
      this.hideTooltip();
    }
  }

  private handleCanvasClick(event: MouseEvent): void {
    if (!this.mapRenderer) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Get zone at click position
    const zone = this.mapRenderer.getZoneAtPosition(x, y);

    if (zone) {
      this.showZoneDetails(zone);
    }
  }

  private showTooltip(zone: TimeZone, event: MouseEvent): void {
    if (!this.timeZoneEngine) {
      return;
    }

    try {
      // Get current time in this zone
      const time = this.timeZoneEngine.getCurrentTime(zone.id);

      // Format time as HH:MM:SS
      const hours = String(time.getUTCHours()).padStart(2, '0');
      const minutes = String(time.getUTCMinutes()).padStart(2, '0');
      const seconds = String(time.getUTCSeconds()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}:${seconds}`;

      // Clear and rebuild tooltip with safe DOM methods
      this.tooltip.textContent = '';

      // Store zone ID for live updates
      this.tooltip.dataset.zoneId = zone.id;

      const content = document.createElement('div');
      content.className = 'tooltip-content';

      const zoneName = document.createElement('div');
      zoneName.className = 'tooltip-zone-name';
      zoneName.textContent = zone.name;
      content.appendChild(zoneName);

      const timeDiv = document.createElement('div');
      timeDiv.className = 'tooltip-time';
      timeDiv.textContent = timeStr;
      content.appendChild(timeDiv);

      const offsetDiv = document.createElement('div');
      offsetDiv.className = 'tooltip-offset';
      offsetDiv.textContent = `UTC${zone.offset >= 0 ? '+' : ''}${(zone.offset / 60).toFixed(1)}`;
      content.appendChild(offsetDiv);

      this.tooltip.appendChild(content);

      // Position tooltip near cursor
      const rect = this.canvas.getBoundingClientRect();
      const tooltipX = event.clientX - rect.left + 10;
      const tooltipY = event.clientY - rect.top + 10;

      this.tooltip.style.left = `${tooltipX}px`;
      this.tooltip.style.top = `${tooltipY}px`;
      this.tooltip.classList.remove('hidden');
    } catch (error) {
      console.error('Error showing tooltip:', error);
    }
  }

  private hideTooltip(): void {
    this.tooltip.classList.add('hidden');
  }

  private showZoneDetails(zone: TimeZone): void {
    if (!this.timeZoneEngine) {
      return;
    }

    try {
      // Get current time in this zone
      const time = this.timeZoneEngine.getCurrentTime(zone.id);

      // Format time
      const hours = String(time.getUTCHours()).padStart(2, '0');
      const minutes = String(time.getUTCMinutes()).padStart(2, '0');
      const seconds = String(time.getUTCSeconds()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}:${seconds}`;

      // Get offset
      const offset = this.timeZoneEngine.getOffset(zone.id, new Date());
      const offsetHours = Math.floor(offset / 60);
      const offsetMinutes = Math.abs(offset % 60);
      const offsetStr =
        offsetMinutes > 0
          ? `UTC${offset >= 0 ? '+' : ''}${offsetHours}:${String(offsetMinutes).padStart(2, '0')}`
          : `UTC${offset >= 0 ? '+' : ''}${offsetHours}`;

      // Get DST status
      const isDST = this.timeZoneEngine.isDST(zone.id, new Date());
      const dstStr = isDST ? ' (DST)' : '';

      // Create detailed message
      const details = `
Zone: ${zone.name}
ID: ${zone.id}
Abbreviation: ${zone.abbreviation}
Current Time: ${timeStr}${dstStr}
Offset: ${offsetStr}
Major Cities: ${zone.majorCities.join(', ')}
Countries: ${zone.countries.join(', ')}
      `.trim();

      alert(details);
    } catch (error) {
      console.error('Error showing zone details:', error);
      alert(`Error loading details for ${zone.name}`);
    }
  }

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

      // Re-render the map
      this.mapRenderer.render();

      console.log(`Canvas resized to ${width}x${height}`);
    } catch (error) {
      console.error('Error handling window resize:', error);
    }
  }
}
