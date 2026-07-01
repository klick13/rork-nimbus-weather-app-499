/**
 * Pure color/geometry helpers used to render the temperature, UV, and wind
 * map layers — shared between the native map overlays and the web slippy map.
 */
import { TempUnit } from "@/types/weather";
import { WeatherGridPoint } from "@/utils/weatherApi";

export function tempColor(temp: number, unit: TempUnit): string {
  const c = unit === "F" ? ((temp - 32) * 5) / 9 : temp;
  if (c <= -20) return "rgba(140, 120, 255, 0.86)";
  if (c <= -10) return "rgba(100, 150, 255, 0.86)";
  if (c <= 0) return "rgba(70, 180, 255, 0.86)";
  if (c <= 10) return "rgba(70, 210, 220, 0.86)";
  if (c <= 20) return "rgba(80, 230, 120, 0.86)";
  if (c <= 25) return "rgba(240, 230, 50, 0.86)";
  if (c <= 30) return "rgba(255, 180, 40, 0.86)";
  if (c <= 35) return "rgba(255, 120, 30, 0.89)";
  if (c <= 40) return "rgba(255, 60, 30, 0.92)";
  return "rgba(220, 30, 70, 0.94)";
}

export function withAlpha(color: string, alpha: number): string {
  return color.replace(/[\d.]+\)$/, `${alpha})`);
}

export function uvColor(uv: number): string {
  if (uv <= 2) return "rgba(80, 230, 120, 0.82)";
  if (uv <= 5) return "rgba(240, 230, 50, 0.82)";
  if (uv <= 7) return "rgba(255, 160, 30, 0.84)";
  if (uv <= 10) return "rgba(255, 60, 40, 0.87)";
  return "rgba(191, 64, 255, 0.89)";
}

export function windColor(speed: number, unit: TempUnit): string {
  const mph = unit === "C" ? speed * 0.621 : speed;
  if (mph <= 5) return "rgba(120, 210, 255, 0.80)";
  if (mph <= 15) return "rgba(100, 190, 255, 0.83)";
  if (mph <= 25) return "rgba(240, 230, 50, 0.85)";
  if (mph <= 40) return "rgba(255, 160, 40, 0.87)";
  return "rgba(255, 60, 60, 0.90)";
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function windFlowEnd(pt: WeatherGridPoint, length: number): LatLng {
  const rad = (pt.windDirection * Math.PI) / 180;
  const cosLat = Math.cos(Math.min(85, Math.abs(pt.lat)) * (Math.PI / 180));
  return {
    latitude: pt.lat + length * Math.cos(rad),
    longitude: pt.lon + (length * Math.sin(rad)) / cosLat,
  };
}

export function arrowheadTriangle(
  tip: LatLng,
  direction: number,
  size: number,
  pt: WeatherGridPoint
): [LatLng, LatLng, LatLng] {
  const rad = (direction * Math.PI) / 180;
  const cosLat = Math.cos(Math.min(85, Math.abs(pt.lat)) * (Math.PI / 180));
  const halfAngle = 22 * (Math.PI / 180);
  return [
    {
      latitude: tip.latitude - size * Math.cos(rad - halfAngle),
      longitude: tip.longitude - (size * Math.sin(rad - halfAngle)) / cosLat,
    },
    tip,
    {
      latitude: tip.latitude - size * Math.cos(rad + halfAngle),
      longitude: tip.longitude - (size * Math.sin(rad + halfAngle)) / cosLat,
    },
  ];
}
