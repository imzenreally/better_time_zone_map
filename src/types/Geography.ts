export interface TimeZoneBoundary {
  zoneId: string; // Links to TimeZone.id
  polygons: Polygon[]; // Array for split zones
}

export interface Polygon {
  coordinates: [number, number][]; // [longitude, latitude] pairs
}

export interface CountryData {
  code: string; // ISO country code
  name: string;
  capital: string;
  population: number;
  area: number; // km²
  languages: string[];
  government: string;
  currency: string;
  timeZones: string[]; // References to TimeZone.id
  geography?: string; // Brief description
  lastUpdated: string; // ISO date
}
