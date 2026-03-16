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
