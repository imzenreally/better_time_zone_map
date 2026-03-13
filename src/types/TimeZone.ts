export interface TimeZone {
  id: string; // IANA identifier (e.g., "America/New_York")
  name: string; // Display name (e.g., "Eastern Standard Time")
  abbreviation: string; // Current abbreviation (e.g., "EST" or "EDT")
  offset: number; // Minutes from UTC (e.g., -300 for UTC-5)
  dstOffset?: number; // Offset during DST if applicable
  dstRules?: {
    start: string; // DST start rule
    end: string; // DST end rule
    observes: boolean; // Whether zone observes DST
  };
  countries: string[]; // ISO country codes using this zone
  majorCities: string[]; // Major cities in this zone
  coordinates: {
    lat: number;
    lon: number;
  };
  quirks?: string[]; // Educational notes
}

export interface DSTTransition {
  date: Date;
  type: 'start' | 'end';
  offsetBefore: number;
  offsetAfter: number;
}
