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
  /** 0-1 score combining category match, name match, distance, and rating.
   *  Higher = more directly competitive to the business type. */
  relevance?: number;
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

export type PulseSectionTone = 'positive' | 'neutral' | 'warning' | 'danger';

export interface PulseSummarySection {
  title: string;
  body: string;
  tone?: PulseSectionTone;
}

export interface PulseSummaryVerdict {
  label: string;
  tone: PulseSectionTone;
}

export interface PulseSummary {
  /** Concatenation of verdict + sections — preserved for share/export + backward compat. */
  text: string;
  /** Optional headline verdict shown above sections (scout mode always sets this). */
  verdict?: PulseSummaryVerdict;
  /** Ordered content sections rendered as discrete blocks in the UI. */
  sections: PulseSummarySection[];
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

export interface ScoutParse {
  businessType: string;
  categoryKeywords: string[];
  locationQuery: string;
  intent: 'scout' | 'analyze' | 'compare';
}

export interface ScoutAnalysis {
  businessType: string;
  anchorName: string;
  locationQuery: string;
  competitorRadiusKm: number;
  totalCompetitorsFound: number;
  competitorsShown: number;
  categoryKeywords: string[];
}

export interface ScoutRequest {
  prompt: string;
  country?: string;
}

export interface ScoutResponse {
  report: PulseReport;
  parse: ScoutParse;
  analysis: ScoutAnalysis;
}
