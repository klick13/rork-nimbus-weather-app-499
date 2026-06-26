import { LocationWeather } from "@/types/weather";

const currentHour = new Date().getHours();
const now = new Date();

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function getDayName(offset: number): string {
  if (offset === 0) return "Today";
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatDateShort(offset: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const mockLocations: LocationWeather[] = [
  {
    id: "current",
    name: "San Francisco",
    region: "California",
    country: "US",
    lat: 37.7749,
    lon: -122.4194,
    currentTemp: 68,
    condition: {
      id: "partly-cloudy",
      main: "Partly Cloudy",
      description: "Partly cloudy skies",
      icon: "cloud-sun",
    },
    high: 72,
    low: 56,
    hourly: Array.from({ length: 24 }, (_, i) => ({
      time: formatHour(currentHour + i),
      temp: Math.round(56 + Math.sin((currentHour + i) / 24 * Math.PI * 2 - Math.PI / 2) * 8 + Math.random() * 3),
      condition: {
        id: i < 6 ? "clear" : i < 14 ? "partly-cloudy" : i < 18 ? "cloudy" : "clear",
        main: i < 6 ? "Clear" : i < 14 ? "Partly Cloudy" : i < 18 ? "Cloudy" : "Clear",
        description: "",
        icon: i < 6 ? "moon" : i < 14 ? "cloud-sun" : i < 18 ? "cloud" : "moon",
      },
      precipChance: i > 14 && i < 18 ? 15 : 5,
    })),
    daily: Array.from({ length: 7 }, (_, i) => ({
      day: getDayName(i),
      date: formatDateShort(i),
      high: 70 + Math.round(Math.random() * 6),
      low: 54 + Math.round(Math.random() * 4),
      condition: { id: i === 2 ? "cloudy" : "partly-cloudy", main: i === 2 ? "Cloudy" : "Partly Cloudy", description: "", icon: i === 2 ? "cloud" : "cloud-sun" },
      precipChance: i === 2 ? 25 : 10,
    })),
    details: {
      feelsLike: 66,
      humidity: 68,
      windSpeed: 10,
      windDirection: "WSW",
      uvIndex: 5,
      visibility: 10,
      pressure: 1016,
      dewPoint: 53,
      sunrise: "5:52 AM",
      sunset: "8:30 PM",
    },
    alerts: [],
    lastUpdated: "Just now",
    isCurrentLocation: true,
  },
  {
    id: "new-york",
    name: "New York",
    region: "New York",
    country: "US",
    lat: 40.7128,
    lon: -74.006,
    currentTemp: 82,
    condition: {
      id: "partly-cloudy",
      main: "Partly Cloudy",
      description: "Partly cloudy",
      icon: "cloud-sun",
    },
    high: 86,
    low: 70,
    hourly: Array.from({ length: 24 }, (_, i) => ({
      time: formatHour(currentHour + i),
      temp: Math.round(70 + Math.sin((currentHour + i) / 24 * Math.PI * 2 - Math.PI / 2) * 8 + Math.random() * 2),
      condition: {
        id: i > 14 && i < 20 ? "rainy" : "partly-cloudy",
        main: i > 14 && i < 20 ? "Showers" : "Partly Cloudy",
        description: "",
        icon: i > 14 && i < 20 ? "cloud-rain" : i > 18 || i < 6 ? "cloud-moon" : "cloud-sun",
      },
      precipChance: i > 14 && i < 20 ? 55 : 15,
    })),
    daily: Array.from({ length: 7 }, (_, i) => ({
      day: getDayName(i),
      date: formatDateShort(i),
      high: 82 + Math.round(Math.random() * 8),
      low: 68 + Math.round(Math.random() * 5),
      condition: { id: i === 0 || i === 1 ? "rainy" : "partly-cloudy", main: i === 0 || i === 1 ? "Scattered Storms" : "Partly Cloudy", description: "", icon: i === 0 || i === 1 ? "cloud-lightning" : "cloud-sun" },
      precipChance: i === 0 || i === 1 ? 60 : 20,
    })),
    details: {
      feelsLike: 85,
      humidity: 72,
      windSpeed: 8,
      windDirection: "SW",
      uvIndex: 7,
      visibility: 9,
      pressure: 1014,
      dewPoint: 68,
      sunrise: "5:28 AM",
      sunset: "8:25 PM",
    },
    alerts: [],
    lastUpdated: "5 min ago",
    isCurrentLocation: false,
  },
  {
    id: "miami",
    name: "Miami",
    region: "Florida",
    country: "US",
    lat: 25.7617,
    lon: -80.1918,
    currentTemp: 88,
    condition: {
      id: "clear",
      main: "Sunny",
      description: "Clear skies, hot",
      icon: "sun",
    },
    high: 92,
    low: 78,
    hourly: Array.from({ length: 24 }, (_, i) => ({
      time: formatHour(currentHour + i),
      temp: Math.round(78 + Math.sin((currentHour + i) / 24 * Math.PI * 2 - Math.PI / 2) * 7 + Math.random() * 2),
      condition: {
        id: i > 15 && i < 19 ? "rainy" : "clear",
        main: i > 15 && i < 19 ? "Scattered Storms" : "Sunny",
        description: "",
        icon: i > 15 && i < 19 ? "cloud-lightning" : i > 18 || i < 6 ? "moon" : "sun",
      },
      precipChance: i > 15 && i < 19 ? 40 : 5,
    })),
    daily: Array.from({ length: 7 }, (_, i) => ({
      day: getDayName(i),
      date: formatDateShort(i),
      high: 88 + Math.round(Math.random() * 5),
      low: 76 + Math.round(Math.random() * 4),
      condition: { id: "clear", main: "Sunny", description: "", icon: "sun" },
      precipChance: 10,
    })),
    details: {
      feelsLike: 96,
      humidity: 70,
      windSpeed: 7,
      windDirection: "SE",
      uvIndex: 10,
      visibility: 12,
      pressure: 1018,
      dewPoint: 74,
      sunrise: "6:32 AM",
      sunset: "8:12 PM",
    },
    alerts: [],
    lastUpdated: "10 min ago",
    isCurrentLocation: false,
  },
];
