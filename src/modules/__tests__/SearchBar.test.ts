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
