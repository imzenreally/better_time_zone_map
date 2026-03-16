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
    // Clear container safely
    this.container.textContent = '';

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
