import {
  HobbyAlert,
  HistoricalDataPoint,
  MarineConditions,
  AviationConditions,
} from "@/types/subscription";

export const mockHistoricalData: HistoricalDataPoint[] = [
  { date: "Feb 6", high: 61, low: 49, precip: 0.0, avgHumidity: 68 },
  { date: "Feb 7", high: 63, low: 51, precip: 0.12, avgHumidity: 72 },
  { date: "Feb 8", high: 58, low: 47, precip: 0.45, avgHumidity: 81 },
  { date: "Feb 9", high: 55, low: 45, precip: 0.78, avgHumidity: 88 },
  { date: "Feb 10", high: 57, low: 46, precip: 0.22, avgHumidity: 76 },
  { date: "Feb 11", high: 60, low: 48, precip: 0.0, avgHumidity: 70 },
  { date: "Feb 12", high: 64, low: 52, precip: 0.0, avgHumidity: 65 },
  { date: "Feb 13", high: 67, low: 54, precip: 0.0, avgHumidity: 72 },
];

export const mockHistoricalMonthly: { month: string; avgHigh: number; avgLow: number; totalPrecip: number }[] = [
  { month: "Jan", avgHigh: 57, avgLow: 46, totalPrecip: 4.5 },
  { month: "Feb", avgHigh: 60, avgLow: 48, totalPrecip: 4.0 },
  { month: "Mar", avgHigh: 63, avgLow: 50, totalPrecip: 3.2 },
  { month: "Apr", avgHigh: 65, avgLow: 51, totalPrecip: 1.5 },
  { month: "May", avgHigh: 66, avgLow: 53, totalPrecip: 0.7 },
  { month: "Jun", avgHigh: 69, avgLow: 55, totalPrecip: 0.2 },
  { month: "Jul", avgHigh: 68, avgLow: 56, totalPrecip: 0.0 },
  { month: "Aug", avgHigh: 69, avgLow: 57, totalPrecip: 0.1 },
  { month: "Sep", avgHigh: 72, avgLow: 57, totalPrecip: 0.2 },
  { month: "Oct", avgHigh: 70, avgLow: 55, totalPrecip: 1.1 },
  { month: "Nov", avgHigh: 63, avgLow: 50, totalPrecip: 2.5 },
  { month: "Dec", avgHigh: 57, avgLow: 46, totalPrecip: 4.3 },
];

export const mockMarineConditions: MarineConditions = {
  waveHeight: 4.2,
  wavePeriod: 12,
  swellDirection: "WNW",
  seaTemp: 54,
  tideStatus: "Incoming",
  nextTide: "High at 3:42 PM",
  visibility: 8,
  windGust: 22,
};

export const mockAviationConditions: AviationConditions = {
  metar: "KSFO 131756Z 24012G18KT 10SM FEW025 SCT045 16/09 A3012",
  flightCategory: "VFR",
  ceilingFt: 4500,
  visibilitySM: 10,
  windShear: false,
  turbulence: "light",
  icingRisk: "none",
  densityAltitude: 320,
};

export const mockHobbyAlerts: HobbyAlert[] = [
  {
    id: "cigar",
    name: "Cigar Smoking",
    icon: "Cigarette",
    description: "Ideal conditions for an outdoor cigar session",
    conditions: [
      { label: "Humidity", ideal: "60-70%", current: "72%", met: false },
      { label: "Wind", ideal: "< 8 mph", current: "12 mph", met: false },
      { label: "Temperature", ideal: "65-80°F", current: "62°F", met: false },
      { label: "Precipitation", ideal: "0%", current: "10%", met: true },
    ],
    currentStatus: "fair",
    statusMessage: "Wind is a bit high, humidity slightly above ideal",
  },
  {
    id: "drone",
    name: "Drone Flying",
    icon: "Plane",
    description: "Safe conditions for recreational drone operation",
    conditions: [
      { label: "Wind Speed", ideal: "< 15 mph", current: "12 mph", met: true },
      { label: "Wind Gusts", ideal: "< 20 mph", current: "18 mph", met: true },
      { label: "Visibility", ideal: "> 3 mi", current: "10 mi", met: true },
      { label: "Precipitation", ideal: "0%", current: "10%", met: true },
    ],
    currentStatus: "good",
    statusMessage: "Good flying conditions, watch for afternoon gusts",
  },
  {
    id: "photography",
    name: "Golden Hour Photography",
    icon: "Camera",
    description: "Optimal light conditions for outdoor photography",
    conditions: [
      { label: "Cloud Cover", ideal: "20-60%", current: "40%", met: true },
      { label: "Visibility", ideal: "> 5 mi", current: "10 mi", met: true },
      { label: "Humidity", ideal: "< 80%", current: "72%", met: true },
      { label: "Wind", ideal: "< 15 mph", current: "12 mph", met: true },
    ],
    currentStatus: "perfect",
    statusMessage: "Excellent conditions — partial clouds make dramatic skies",
  },
  {
    id: "stargazing",
    name: "Stargazing",
    icon: "Star",
    description: "Clear skies for astronomical observation",
    conditions: [
      { label: "Cloud Cover", ideal: "< 20%", current: "40%", met: false },
      { label: "Moon Phase", ideal: "New/Crescent", current: "Waning Gibbous", met: false },
      { label: "Humidity", ideal: "< 60%", current: "72%", met: false },
      { label: "Light Pollution", ideal: "Low", current: "Moderate", met: false },
    ],
    currentStatus: "poor",
    statusMessage: "Too much cloud cover and moonlight tonight",
  },
  {
    id: "surfing",
    name: "Surfing",
    icon: "Waves",
    description: "Wave and wind conditions for surfing",
    conditions: [
      { label: "Wave Height", ideal: "3-6 ft", current: "4.2 ft", met: true },
      { label: "Wave Period", ideal: "> 10s", current: "12s", met: true },
      { label: "Wind", ideal: "Offshore < 10", current: "12 WSW", met: false },
      { label: "Water Temp", ideal: "> 55°F", current: "54°F", met: false },
    ],
    currentStatus: "good",
    statusMessage: "Solid swell, onshore wind is slightly unfavorable",
  },
  {
    id: "running",
    name: "Outdoor Running",
    icon: "Footprints",
    description: "Comfortable conditions for distance running",
    conditions: [
      { label: "Temperature", ideal: "45-65°F", current: "62°F", met: true },
      { label: "Humidity", ideal: "< 70%", current: "72%", met: false },
      { label: "Wind", ideal: "< 12 mph", current: "12 mph", met: true },
      { label: "Air Quality", ideal: "Good", current: "Good", met: true },
    ],
    currentStatus: "good",
    statusMessage: "Great running weather, humidity barely above ideal",
  },
];
