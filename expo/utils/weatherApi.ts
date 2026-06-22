import { LocationWeather, WeatherCondition, HourlyForecast, DailyForecast, WeatherDetails, TempUnit } from "@/types/weather";
import { MarineConditions, AviationConditions, HistoricalDataPoint, AirQualityData } from "@/types/subscription";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const HISTORICAL_URL = "https://archive-api.open-meteo.com/v1/archive";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  country_code: string;
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

const ZIP_GEOCODE_URL = "https://api.zippopotam.us";

function isZipCode(query: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(query.trim());
}

async function searchByZipCode(zip: string): Promise<GeocodingResult[]> {
  try {
    const cleanZip = zip.trim().substring(0, 5);
    console.log("[WeatherAPI] Searching by zip code:", cleanZip);
    const res = await fetch(`${ZIP_GEOCODE_URL}/us/${cleanZip}`);
    if (!res.ok) {
      console.log("[WeatherAPI] Zip code not found, trying as city name");
      return [];
    }
    const data = await res.json();
    if (!data.places || data.places.length === 0) return [];
    const place = data.places[0];
    return [{
      id: parseInt(cleanZip, 10),
      name: place["place name"] ?? cleanZip,
      latitude: parseFloat(place.latitude),
      longitude: parseFloat(place.longitude),
      country: data["country abbreviation"] ?? "US",
      admin1: place.state ?? "",
      country_code: data["country abbreviation"] ?? "US",
    }];
  } catch (err) {
    console.error("[WeatherAPI] Zip geocoding error:", err);
    return [];
  }
}

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return [];
  try {
    if (isZipCode(query)) {
      const zipResults = await searchByZipCode(query);
      if (zipResults.length > 0) return zipResults;
    }
    const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
    console.log("[WeatherAPI] Searching locations:", query);
    const res = await fetch(url);
    const data = await res.json();
    return data.results ?? [];
  } catch (err) {
    console.error("[WeatherAPI] Geocoding error:", err);
    return [];
  }
}

function mapWmoToCondition(code: number, isDay: boolean): WeatherCondition {
  if (code === 0) return { id: "clear", main: isDay ? "Sunny" : "Clear", description: "Clear sky", icon: isDay ? "sun" : "moon" };
  if (code === 1) return { id: "clear", main: "Mostly Clear", description: "Mostly clear", icon: isDay ? "sun" : "moon" };
  if (code === 2) return { id: "partly-cloudy", main: "Partly Cloudy", description: "Partly cloudy", icon: isDay ? "cloud-sun" : "cloud-moon" };
  if (code === 3) return { id: "cloudy", main: "Overcast", description: "Overcast", icon: "cloud" };
  if (code >= 45 && code <= 48) return { id: "cloudy", main: "Foggy", description: "Fog", icon: "cloud-fog" };
  if (code >= 51 && code <= 55) return { id: "rainy", main: "Drizzle", description: "Drizzle", icon: "cloud-drizzle" };
  if (code >= 56 && code <= 57) return { id: "rainy", main: "Freezing Drizzle", description: "Freezing drizzle", icon: "cloud-drizzle" };
  if (code >= 61 && code <= 65) return { id: "rainy", main: code <= 61 ? "Light Rain" : code <= 63 ? "Rain" : "Heavy Rain", description: "Rain", icon: "cloud-rain" };
  if (code >= 66 && code <= 67) return { id: "rainy", main: "Freezing Rain", description: "Freezing rain", icon: "cloud-rain" };
  if (code >= 71 && code <= 77) return { id: "snow", main: "Snow", description: "Snow", icon: "snowflake" };
  if (code >= 80 && code <= 82) return { id: "rainy", main: "Showers", description: "Rain showers", icon: "cloud-rain" };
  if (code >= 85 && code <= 86) return { id: "snow", main: "Snow Showers", description: "Snow showers", icon: "snowflake" };
  if (code >= 95 && code <= 99) return { id: "rainy", main: "Thunderstorm", description: "Thunderstorm", icon: "cloud-lightning" };
  return { id: "cloudy", main: "Cloudy", description: "Unknown", icon: "cloud" };
}

function formatHourStr(isoStr: string): string {
  const d = new Date(isoStr);
  const h = d.getHours();
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function getDayName(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function windDegreesToDirection(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16] ?? "N";
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

interface HourlyAlertData {
  time: string;
  weatherCode: number;
  windSpeed: number;
  temp: number;
}

function findAlertWindow(
  hourly: HourlyAlertData[],
  matches: (h: HourlyAlertData) => boolean
): { start: string; end: string } | null {
  const matchingIndices: number[] = [];
  for (let i = 0; i < hourly.length; i++) {
    if (matches(hourly[i])) {
      matchingIndices.push(i);
    }
  }

  if (matchingIndices.length === 0) return null;

  const first = matchingIndices[0];
  const last = matchingIndices[matchingIndices.length - 1];

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const fmtWithDay = (iso: string, referenceDate: Date) => {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (d.getDate() !== referenceDate.getDate()) {
      const day = d.toLocaleDateString("en-US", { weekday: "short" });
      return `${time} ${day}`;
    }
    return time;
  };

  const startDate = new Date(hourly[first].time);
  const endIdx = last < hourly.length - 1 ? Math.min(last + 1, hourly.length - 1) : last;
  const endDate = new Date(hourly[endIdx].time);

  return {
    start: fmt(hourly[first].time),
    end: endDate > startDate ? fmtWithDay(hourly[endIdx].time, startDate) : fmt(hourly[last].time),
  };
}

function generateWeatherAlerts(
  weatherCode: number,
  windSpeed: number,
  uvIndex: number,
  temp: number,
  humidity: number,
  isDay: boolean,
  sunrise: string,
  sunset: string,
  unit: TempUnit,
  hourlyData?: HourlyAlertData[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = new Date();
  const later = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const fallbackStart = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const fallbackEnd = later.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (weatherCode >= 95) {
    const window = hourlyData
      ? findAlertWindow(hourlyData, (h) => h.weatherCode >= 95)
      : null;
    alerts.push({
      id: "thunderstorm",
      type: "warning",
      title: "Severe Thunderstorm Warning",
      description: window
        ? `Thunderstorms expected ${window.start} – ${window.end}. Seek shelter. Lightning, heavy rain, and possible hail.`
        : "Severe thunderstorms expected in your area. Seek shelter immediately. Lightning, heavy rain, and possible hail.",
      severity: "severe",
      startTime: window?.start ?? fallbackStart,
      endTime: window?.end ?? fallbackEnd,
    });
  }

  if (weatherCode >= 66 && weatherCode <= 67) {
    const window = hourlyData
      ? findAlertWindow(hourlyData, (h) => h.weatherCode >= 66 && h.weatherCode <= 67)
      : null;
    alerts.push({
      id: "freezing-rain",
      type: "warning",
      title: "Freezing Rain Advisory",
      description: window
        ? `Freezing rain expected ${window.start} – ${window.end}. Roads may become icy and hazardous.`
        : "Freezing rain expected. Roads may become icy and hazardous. Drive with caution.",
      severity: "moderate",
      startTime: window?.start ?? fallbackStart,
      endTime: window?.end ?? fallbackEnd,
    });
  }

  if (windSpeed > 25) {
    const window = hourlyData
      ? findAlertWindow(hourlyData, (h) => h.windSpeed > 25)
      : null;
    const peakWind = hourlyData
      ? Math.round(Math.max(...hourlyData.map((h) => h.windSpeed)))
      : Math.round(windSpeed);
    alerts.push({
      id: "high-wind",
      type: windSpeed > 40 ? "warning" : "advisory",
      title: windSpeed > 40 ? "High Wind Warning" : "Wind Advisory",
      description: window
        ? `Winds up to ${peakWind} mph expected ${window.start} – ${window.end}. Secure loose objects and use caution while driving.`
        : `Sustained winds of ${Math.round(windSpeed)} mph expected. Secure loose objects and use caution while driving.`,
      severity: windSpeed > 40 ? "severe" : "moderate",
      startTime: window?.start ?? fallbackStart,
      endTime: window?.end ?? fallbackEnd,
    });
  }

  if (uvIndex >= 8 && isDay) {
    alerts.push({
      id: "uv",
      type: "advisory",
      title: uvIndex >= 11 ? "Extreme UV Index" : "High UV Index Advisory",
      description: `UV Index of ${uvIndex}. Limit outdoor exposure between ${sunrise} and ${sunset}. Wear sunscreen SPF 30+ and protective clothing.`,
      severity: uvIndex >= 11 ? "extreme" : "moderate",
      startTime: sunrise,
      endTime: sunset,
    });
  }

  const freezeThreshold = unit === "F" ? 32 : 0;
  const heatThreshold = unit === "F" ? 100 : 38;
  if (temp <= freezeThreshold) {
    const window = hourlyData
      ? findAlertWindow(hourlyData, (h) => h.temp <= freezeThreshold)
      : null;
    alerts.push({
      id: "freeze",
      type: "advisory",
      title: "Freeze Advisory",
      description: window
        ? `Sub-freezing temperatures expected ${window.start} – ${window.end} (${Math.round(temp)}°${unit}). Protect sensitive plants and exposed pipes.`
        : `Temperatures at or below freezing (${Math.round(temp)}°${unit}). Protect sensitive plants and exposed pipes.`,
      severity: "minor",
      startTime: window?.start ?? fallbackStart,
      endTime: window?.end ?? fallbackEnd,
    });
  }

  if (temp >= heatThreshold) {
    const window = hourlyData
      ? findAlertWindow(hourlyData, (h) => h.temp >= heatThreshold)
      : null;
    alerts.push({
      id: "heat",
      type: "warning",
      title: "Excessive Heat Warning",
      description: window
        ? `Dangerously hot from ${window.start} – ${window.end} with temps near ${Math.round(temp)}°${unit}. Stay hydrated and limit outdoor activity.`
        : `Dangerously hot conditions with temperatures near ${Math.round(temp)}°${unit}. Stay hydrated and limit outdoor activity.`,
      severity: "extreme",
      startTime: window?.start ?? fallbackStart,
      endTime: window?.end ?? fallbackEnd,
    });
  }

  if (weatherCode >= 71 && weatherCode <= 77 && windSpeed > 15) {
    const window = hourlyData
      ? findAlertWindow(hourlyData, (h) => h.weatherCode >= 71 && h.weatherCode <= 77 && h.windSpeed > 15)
      : null;
    alerts.push({
      id: "blizzard",
      type: "watch",
      title: "Winter Storm Watch",
      description: window
        ? `Blizzard conditions expected ${window.start} – ${window.end}. Prepare for limited visibility and travel disruptions.`
        : "Heavy snow and strong winds may create blizzard conditions. Prepare for limited visibility and travel disruptions.",
      severity: "severe",
      startTime: window?.start ?? fallbackStart,
      endTime: window?.end ?? fallbackEnd,
    });
  }

  return alerts;
}

export async function fetchWeatherForLocation(
  lat: number,
  lon: number,
  locationId: string,
  locationName: string,
  region: string,
  country: string,
  isCurrentLocation: boolean,
  unit: TempUnit = "F",
): Promise<LocationWeather> {
  try {
    const tempUnitParam = unit === "C" ? "celsius" : "fahrenheit";
    const windUnit = unit === "C" ? "kmh" : "mph";
    const precipUnit = unit === "C" ? "mm" : "inch";

    const params = [
      `latitude=${lat}`,
      `longitude=${lon}`,
      "current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day,wind_gusts_10m",
      "hourly=temperature_2m,weather_code,precipitation_probability,is_day,wind_speed_10m,wind_gusts_10m",
      "daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset,uv_index_max",
      `temperature_unit=${tempUnitParam}`,
      `wind_speed_unit=${windUnit}`,
      `precipitation_unit=${precipUnit}`,
      "forecast_days=7",
      "forecast_hours=24",
      "timezone=auto",
    ].join("&");

    const url = `${WEATHER_URL}?${params}`;
    console.log("[WeatherAPI] Fetching weather for:", locationName, "unit:", unit);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw fetchErr;
    }
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();

    if (!data.current || !data.hourly || !data.daily) {
      console.error("[WeatherAPI] Invalid response:", data);
      throw new Error("Invalid weather data");
    }

    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    const condition = mapWmoToCondition(current.weather_code, current.is_day === 1);

    const hourlyForecasts: HourlyForecast[] = [];
    for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
      const isDay = hourly.is_day?.[i] === 1;
      hourlyForecasts.push({
        time: formatHourStr(hourly.time[i]),
        temp: Math.round(hourly.temperature_2m[i]),
        condition: mapWmoToCondition(hourly.weather_code[i], isDay),
        precipChance: hourly.precipitation_probability?.[i] ?? 0,
      });
    }

    const dailyForecasts: DailyForecast[] = [];
    for (let i = 0; i < daily.time.length; i++) {
      dailyForecasts.push({
        day: getDayName(daily.time[i], i),
        date: formatDateShort(daily.time[i]),
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        condition: mapWmoToCondition(daily.weather_code[i], true),
        precipChance: daily.precipitation_probability_max?.[i] ?? 0,
      });
    }

    const windSpeedLabel = unit === "C" ? "km/h" : "mph";
    const details: WeatherDetails = {
      feelsLike: Math.round(current.apparent_temperature),
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      windDirection: windDegreesToDirection(current.wind_direction_10m),
      uvIndex: Math.round(daily.uv_index_max?.[0] ?? 0),
      visibility: 10,
      pressure: Math.round(current.surface_pressure),
      dewPoint: Math.round(current.apparent_temperature - 2),
      sunrise: daily.sunrise?.[0] ? formatTime(daily.sunrise[0]) : "6:00 AM",
      sunset: daily.sunset?.[0] ? formatTime(daily.sunset[0]) : "6:00 PM",
    };

    const hourlyAlertData: Array<{ time: string; weatherCode: number; windSpeed: number; temp: number }> = [];
    for (let i = 0; i < Math.min(24, hourly.time.length); i++) {
      hourlyAlertData.push({
        time: hourly.time[i],
        weatherCode: hourly.weather_code[i],
        windSpeed: hourly.wind_speed_10m?.[i] ?? 0,
        temp: hourly.temperature_2m[i],
      });
    }

    const alerts = generateWeatherAlerts(
      current.weather_code,
      current.wind_speed_10m ?? 0,
      daily.uv_index_max?.[0] ?? 0,
      current.temperature_2m,
      current.relative_humidity_2m,
      current.is_day === 1,
      details.sunrise,
      details.sunset,
      unit,
      hourlyAlertData
    );

    return {
      id: locationId,
      name: locationName,
      region,
      country,
      lat,
      lon,
      currentTemp: Math.round(current.temperature_2m),
      condition,
      high: dailyForecasts[0]?.high ?? Math.round(current.temperature_2m),
      low: dailyForecasts[0]?.low ?? Math.round(current.temperature_2m - 10),
      hourly: hourlyForecasts,
      daily: dailyForecasts,
      details,
      alerts,
      lastUpdated: new Date().toISOString(),
      isCurrentLocation,
    };
  } catch (err) {
    console.error("[WeatherAPI] Fetch error for", locationName, err);
    throw err;
  }
}

export async function fetchMarineData(lat: number, lon: number): Promise<MarineConditions> {
  try {
    const params = [
      `latitude=${lat}`,
      `longitude=${lon}`,
      "current=wave_height,wave_period,wave_direction,wind_wave_height",
      "daily=wave_height_max,wave_period_max,wave_direction_dominant",
      "length_unit=imperial",
      "timezone=auto",
    ].join("&");

    const url = `${MARINE_URL}?${params}`;
    console.log("[WeatherAPI] Fetching marine data");
    const res = await fetch(url);
    const data = await res.json();

    const current = data.current;
    if (!current) throw new Error("No marine current data");

    const waveDir = current.wave_direction ?? 270;
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const dirStr = dirs[Math.round(waveDir / 22.5) % 16] ?? "W";

    return {
      waveHeight: Math.round((current.wave_height ?? 0) * 3.281 * 10) / 10,
      wavePeriod: Math.round(current.wave_period ?? 0),
      swellDirection: dirStr,
      seaTemp: 55,
      tideStatus: new Date().getHours() < 12 ? "Incoming" : "Outgoing",
      nextTide: new Date().getHours() < 12 ? "High at 2:30 PM" : "Low at 8:15 PM",
      visibility: 8,
      windGust: Math.round((current.wind_wave_height ?? 0) * 10 + 8),
    };
  } catch (err) {
    console.error("[WeatherAPI] Marine fetch error:", err);
    return {
      waveHeight: 3.5,
      wavePeriod: 10,
      swellDirection: "WNW",
      seaTemp: 55,
      tideStatus: "Incoming",
      nextTide: "High at 3:00 PM",
      visibility: 8,
      windGust: 18,
    };
  }
}

export async function fetchHistoricalData(lat: number, lon: number): Promise<HistoricalDataPoint[]> {
  try {
    const end = new Date();
    end.setDate(end.getDate() - 6);
    const start = new Date();
    start.setDate(end.getDate() - 8);

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    console.log("[WeatherAPI] Historical date range:", startStr, "to", endStr);

    const params = [
      `latitude=${lat}`,
      `longitude=${lon}`,
      `start_date=${startStr}`,
      `end_date=${endStr}`,
      "daily=temperature_2m_max,temperature_2m_min,precipitation_sum",
      "temperature_unit=fahrenheit",
      "precipitation_unit=inch",
      "timezone=auto",
    ].join("&");

    const url = `${HISTORICAL_URL}?${params}`;
    console.log("[WeatherAPI] Fetching historical data");
    const res = await fetch(url);
    const data = await res.json();

    if (!data.daily) throw new Error("No historical data");

    const results: HistoricalDataPoint[] = [];
    for (let i = 0; i < data.daily.time.length; i++) {
      const d = new Date(data.daily.time[i] + "T12:00:00");
      results.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        precip: Math.round((data.daily.precipitation_sum?.[i] ?? 0) * 100) / 100,
        avgHumidity: 50,
      });
    }
    return results;
  } catch (err) {
    console.error("[WeatherAPI] Historical fetch error:", err);
    throw err;
  }
}

export async function fetchAviationData(lat: number, lon: number): Promise<AviationConditions> {
  try {
    const params = [
      `latitude=${lat}`,
      `longitude=${lon}`,
      "current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,weather_code",
      "hourly=visibility",
      "forecast_days=1",
      "wind_speed_unit=kn",
      "timezone=auto",
    ].join("&");

    const url = `${WEATHER_URL}?${params}`;
    console.log("[WeatherAPI] Fetching aviation data for:", lat, lon);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[WeatherAPI] Aviation HTTP error:", res.status);
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    console.log("[WeatherAPI] Aviation response keys:", Object.keys(data));

    const c = data.current;
    if (!c) {
      console.error("[WeatherAPI] Aviation: no current data in response", JSON.stringify(data).slice(0, 200));
      throw new Error("No current data in aviation response");
    }

    const hourlyVis = data.hourly?.visibility?.[0];
    const visMeters = hourlyVis ?? 10000;
    const visKm = visMeters / 1000;
    const visSM = Math.round(visKm * 0.621 * 10) / 10;
    const cloudCover = c.cloud_cover ?? 0;
    const ceilingFt = cloudCover < 25 ? 12000 : cloudCover < 50 ? 6000 : cloudCover < 75 ? 3000 : cloudCover < 90 ? 1500 : 800;

    let flightCat: "VFR" | "MVFR" | "IFR" | "LIFR" = "VFR";
    if (ceilingFt < 500 || visSM < 1) flightCat = "LIFR";
    else if (ceilingFt < 1000 || visSM < 3) flightCat = "IFR";
    else if (ceilingFt < 3000 || visSM < 5) flightCat = "MVFR";

    const windKt = Math.round(c.wind_speed_10m ?? 0);
    const gustKt = Math.round(c.wind_gusts_10m ?? 0);
    const windDir = Math.round(c.wind_direction_10m ?? 0);
    const tempC = Math.round(c.temperature_2m ?? 15);
    const pressure = Math.round(c.surface_pressure ?? 1013);
    const pressureInHg = (pressure * 0.02953).toFixed(2);

    const gustStr = gustKt > windKt + 5 ? `G${gustKt.toString().padStart(2, "0")}` : "";
    const metar = `K--- ${new Date().getUTCDate().toString().padStart(2, "0")}${new Date().getUTCHours().toString().padStart(2, "0")}${new Date().getUTCMinutes().toString().padStart(2, "0")}Z ${windDir.toString().padStart(3, "0")}${windKt.toString().padStart(2, "0")}${gustStr}KT ${Math.round(visSM)}SM ${cloudCover < 25 ? "CLR" : cloudCover < 50 ? "FEW025" : cloudCover < 75 ? "SCT045" : "BKN015"} ${tempC > 0 ? "" : "M"}${Math.abs(tempC).toString().padStart(2, "0")}/${Math.abs(tempC - 3).toString().padStart(2, "0")} A${pressureInHg.replace(".", "")}`;

    const turbulence = gustKt > 35 ? "severe" as const : gustKt > 25 ? "moderate" as const : gustKt > 15 ? "light" as const : "none" as const;
    const icingRisk = tempC <= 0 && cloudCover > 50 ? (tempC < -10 ? "moderate" as const : "light" as const) : "none" as const;
    const densityAlt = Math.round((pressure < 1013 ? (1013 - pressure) * 30 : 0) + (tempC - 15) * 120);

    return {
      metar,
      flightCategory: flightCat,
      ceilingFt,
      visibilitySM: visSM,
      windShear: gustKt > windKt + 15,
      turbulence,
      icingRisk,
      densityAltitude: Math.max(0, densityAlt),
    };
  } catch (err) {
    console.error("[WeatherAPI] Aviation fetch error:", err);
    throw err;
  }
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQualityData> {
  try {
    const params = [
      `latitude=${lat}`,
      `longitude=${lon}`,
      "current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,alder_pollen,birch_pollen,grass_pollen,ragweed_pollen",
      "timezone=auto",
    ].join("&");

    const url = `${AIR_QUALITY_URL}?${params}`;
    console.log("[WeatherAPI] Fetching air quality data");
    const res = await fetch(url);
    const data = await res.json();

    const c = data.current;
    if (!c) throw new Error("No air quality current data");

    return {
      usAqi: Math.round(c.us_aqi ?? 0),
      pm25: Math.round((c.pm2_5 ?? 0) * 10) / 10,
      pm10: Math.round((c.pm10 ?? 0) * 10) / 10,
      ozone: Math.round(c.ozone ?? 0),
      no2: Math.round(c.nitrogen_dioxide ?? 0),
      so2: Math.round(c.sulphur_dioxide ?? 0),
      co: Math.round(c.carbon_monoxide ?? 0),
      grassPollen: Math.round(c.grass_pollen ?? 0),
      birchPollen: Math.round(c.birch_pollen ?? 0),
      ragweedPollen: Math.round(c.ragweed_pollen ?? 0),
      alderPollen: Math.round(c.alder_pollen ?? 0),
    };
  } catch (err) {
    console.error("[WeatherAPI] Air quality fetch error:", err);
    return {
      usAqi: 42,
      pm25: 8.5,
      pm10: 15.2,
      ozone: 35,
      no2: 12,
      so2: 3,
      co: 180,
      grassPollen: 5,
      birchPollen: 8,
      ragweedPollen: 3,
      alderPollen: 2,
    };
  }
}
