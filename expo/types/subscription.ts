export type SubscriptionTier = "free" | "pro";

export interface ProFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: ProFeatureCategory;
  isPro: boolean;
}

export type ProFeatureCategory =
  | "historical"
  | "radar"
  | "marine"
  | "aviation"
  | "hobby";

export interface HobbyAlert {
  id: string;
  name: string;
  icon: string;
  description: string;
  conditions: HobbyCondition[];
  currentStatus: "perfect" | "good" | "fair" | "poor";
  statusMessage: string;
}

export interface HobbyCondition {
  label: string;
  ideal: string;
  current: string;
  met: boolean;
}

export interface HistoricalDataPoint {
  date: string;
  high: number;
  low: number;
  precip: number;
  avgHumidity: number;
}

export interface MarineConditions {
  waveHeight: number;
  wavePeriod: number;
  swellDirection: string;
  seaTemp: number;
  tideStatus: string;
  nextTide: string;
  visibility: number;
  windGust: number;
}

export interface AviationConditions {
  metar: string;
  flightCategory: "VFR" | "MVFR" | "IFR" | "LIFR";
  ceilingFt: number;
  visibilitySM: number;
  windShear: boolean;
  turbulence: "none" | "light" | "moderate" | "severe";
  icingRisk: "none" | "light" | "moderate" | "severe";
  densityAltitude: number;
}

export interface AirQualityData {
  usAqi: number;
  pm25: number;
  pm10: number;
  ozone: number;
  no2: number;
  so2: number;
  co: number;
  grassPollen: number;
  birchPollen: number;
  ragweedPollen: number;
  alderPollen: number;
}
