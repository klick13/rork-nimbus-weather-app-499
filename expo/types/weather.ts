export type TempUnit = "F" | "C";

export interface WeatherCondition {
  id: string;
  main: string;
  description: string;
  icon: string;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: WeatherCondition;
  precipChance: number;
}

export interface DailyForecast {
  day: string;
  date: string;
  high: number;
  low: number;
  condition: WeatherCondition;
  precipChance: number;
}

export interface WeatherDetails {
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  uvIndex: number;
  visibility: number;
  pressure: number;
  dewPoint: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAlert {
  id: string;
  type: "warning" | "watch" | "advisory";
  title: string;
  description: string;
  severity: "extreme" | "severe" | "moderate" | "minor";
  startTime: string;
  endTime: string;
}

export interface LocationWeather {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  currentTemp: number;
  condition: WeatherCondition;
  high: number;
  low: number;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  details: WeatherDetails;
  alerts?: WeatherAlert[];
  lastUpdated: string;
  isCurrentLocation: boolean;
}
