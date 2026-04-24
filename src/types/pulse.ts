export interface PulsePlace {
  placeId?: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  hours?: string;
  phone?: string;
}

export interface PulseHeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface PulseCategoryCount {
  category: string;
  count: number;
}

export interface PulseDensity {
  totalNearby300m: number;
  sameCategoryNearby300m: number;
  totalNearby1km: number;
  heatmapPoints: PulseHeatmapPoint[];
  categoryBreakdown: PulseCategoryCount[];
}

export interface PulseCompetitor {
  placeId?: string;
  name: string;
  category: string;
  distanceMeters: number;
  lat: number;
  lng: number;
  rating?: number;
  address?: string;
}

export interface PulseNearestTransit {
  name: string;
  walkingMinutes: number;
  walkingDistanceMeters: number;
  lat: number;
  lng: number;
}

export interface PulseAccessibility {
  nearestMrt?: PulseNearestTransit;
  score: number;
}

export interface PulseSummary {
  text: string;
  generatedAt: string;
  model?: string;
}

export interface PulseReportMeta {
  fetchedAt: string;
  durationMs: number;
  generatedSummary: boolean;
}

export interface PulseReport {
  place: PulsePlace;
  density: PulseDensity;
  competitors: PulseCompetitor[];
  accessibility: PulseAccessibility;
  summary: PulseSummary;
  meta: PulseReportMeta;
}

export interface PulseRequest {
  placeId?: string;
  lat: number;
  lng: number;
  name?: string;
  country?: string;
}

export interface PlaceSearchResult {
  placeId?: string;
  name: string;
  category?: string;
  address?: string;
  lat: number;
  lng: number;
}

export interface PlaceSearchResponse {
  results: PlaceSearchResult[];
}
