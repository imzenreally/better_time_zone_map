export interface AppState {
  pinnedZoneIds: string[];
  searchQuery: string;
  theme: 'light' | 'dark';
  clockTickerHandle: number | null;
  panelCollapsed: boolean;
}

export const DEFAULT_APP_STATE: AppState = {
  pinnedZoneIds: [],
  searchQuery: '',
  theme: 'light',
  clockTickerHandle: null,
  panelCollapsed: false,
};
