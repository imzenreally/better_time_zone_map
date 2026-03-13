export interface AppState {
  selectedZones: string[]; // Pinned time zones for comparison
  hoveredZone: string | null;
  searchQuery: string;
  viewMode: 'map' | 'info'; // Toggle between views
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

export const DEFAULT_APP_STATE: AppState = {
  selectedZones: [],
  hoveredZone: null,
  searchQuery: '',
  viewMode: 'map',
  mapViewport: {
    centerX: 0,
    centerY: 0,
    zoom: 1,
  },
  showDayNightOverlay: true,
  clockFormat: '24h',
  offsetNotation: 'UTC',
  theme: 'light',
};
