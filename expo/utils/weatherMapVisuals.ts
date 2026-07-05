/**
 * Pure color/geometry helpers used to render the temperature, UV, and wind
 * map layers — shared between the native map overlays and the web slippy map.
 *
 * Color scales are intentionally BANDED (hard thresholds, not smooth
 * interpolation) using a vivid, high-saturation "neon" palette. Hard bands
 * mean adjacent grid tiles read as clearly distinct regions — with a grid
 * line drawn between them — instead of a blurry gradient, which is what
 * makes the map layers pop as the visual focal point of the screen.
 */
import { TempUnit } from "@/types/weather";
import { WeatherGridPoint } from "@/utils/weatherApi";

export interface LatLng {
  latitude: number;
  longitude: number;
}

interface ColorBand {
  max: number;
  color: string;
}

function bandColor(value: number, bands: ColorBand[]): string {
  for (const band of bands) {
    if (value <= band.max) return band.color;
  }
  return bands[bands.length - 1]!.color;
}

interface ColorStop {
  value: number;
  rgb: [number, number, number];
}

function parseRgba(color: string): [number, number, number, number] {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return [0, 0, 0, 1];
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseFloat(m[4] ?? "1")];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColorStops(value: number, stops: ColorStop[]): string {
  if (value <= stops[0]!.value) {
    const [r, g, b] = stops[0]!.rgb;
    return `rgba(${r}, ${g}, ${b}, 0.92)`;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (value <= b.value) {
      const t = (value - a.value) / (b.value - a.value);
      return `rgba(${Math.round(lerp(a.rgb[0], b.rgb[0], t))}, ${Math.round(lerp(a.rgb[1], b.rgb[1], t))}, ${Math.round(lerp(a.rgb[2], b.rgb[2], t))}, 0.92)`;
    }
  }
  const last = stops[stops.length - 1]!.rgb;
  return `rgba(${last[0]}, ${last[1]}, ${last[2]}, 0.92)`;
}

// ── Temperature (thresholds in Celsius) ────────────────────────────────────
// 14 stops used for both the hard-edged banded tiles and the smooth
// interpolated color field. The smooth version blends between stops so the
// map looks like a real weather-analysis chart instead of a blocky grid.

const TEMP_BANDS_C: ColorBand[] = [
  { max: -25, color: "rgba(146, 87, 255, 0.92)" }, // violet — extreme cold
  { max: -15, color: "rgba(94, 110, 255, 0.92)" }, // indigo
  { max: -8, color: "rgba(46, 140, 255, 0.92)" }, // blue
  { max: -2, color: "rgba(0, 179, 255, 0.92)" }, // sky blue
  { max: 4, color: "rgba(0, 217, 230, 0.92)" }, // cyan
  { max: 9, color: "rgba(0, 232, 176, 0.92)" }, // teal-green
  { max: 14, color: "rgba(56, 232, 100, 0.92)" }, // green
  { max: 18, color: "rgba(160, 232, 40, 0.92)" }, // yellow-green
  { max: 23, color: "rgba(255, 224, 30, 0.92)" }, // yellow
  { max: 27, color: "rgba(255, 173, 20, 0.92)" }, // amber
  { max: 31, color: "rgba(255, 122, 20, 0.93)" }, // orange
  { max: 35, color: "rgba(255, 66, 40, 0.94)" }, // red-orange
  { max: 40, color: "rgba(255, 16, 90, 0.95)" }, // crimson
  { max: Infinity, color: "rgba(255, 0, 176, 0.96)" }, // magenta — extreme heat
];

const TEMP_STOPS_C: ColorStop[] = TEMP_BANDS_C.map((b) => {
  const [r, g, bValue] = parseRgba(b.color);
  return { value: b.max === Infinity ? 45 : b.max, rgb: [r, g, bValue] };
});

export function tempColor(temp: number, unit: TempUnit): string {
  const c = unit === "F" ? ((temp - 32) * 5) / 9 : temp;
  return bandColor(c, TEMP_BANDS_C);
}

/** Smooth (continuous) temperature color used by the high-resolution canvas
 *  scalar field so adjacent regions blend like a real weather analysis map. */
export function tempColorSmooth(temp: number, unit: TempUnit): string {
  const c = unit === "F" ? ((temp - 32) * 5) / 9 : temp;
  return lerpColorStops(c, TEMP_STOPS_C);
}

export const TEMPERATURE_STOPS_C = TEMP_STOPS_C;

// ── UV Index (banded) ────────────────────────────────────────────────────────
// 10 bands across the 0-11+ index, finer than the standard 5-band WHO scale.

const UV_BANDS: ColorBand[] = [
  { max: 1, color: "rgba(58, 214, 96, 0.88)" },
  { max: 2, color: "rgba(112, 227, 58, 0.88)" },
  { max: 3, color: "rgba(178, 236, 36, 0.88)" },
  { max: 5, color: "rgba(240, 224, 28, 0.89)" },
  { max: 6, color: "rgba(255, 179, 20, 0.9)" },
  { max: 7, color: "rgba(255, 128, 20, 0.9)" },
  { max: 8, color: "rgba(255, 68, 30, 0.92)" },
  { max: 10, color: "rgba(255, 20, 82, 0.93)" },
  { max: 11, color: "rgba(214, 20, 210, 0.94)" },
  { max: Infinity, color: "rgba(176, 32, 255, 0.95)" },
];

const UV_STOPS: ColorStop[] = UV_BANDS.map((b) => {
  const [r, g, bValue] = parseRgba(b.color);
  return { value: b.max === Infinity ? 12 : b.max, rgb: [r, g, bValue] };
});

export function uvColor(uv: number): string {
  return bandColor(uv, UV_BANDS);
}

/** Smooth (continuous) UV color used by the high-resolution canvas scalar field. */
export function uvColorSmooth(uv: number): string {
  return lerpColorStops(uv, UV_STOPS);
}

export const UV_STOPS_EXPORT = UV_STOPS;

// ── Wind speed (smooth flow-field gradient) ─────────────────────────────────
// The animated flow visualization draws long, continuous streamlines, so a
// banded/stepped scale would look wrong (a single thread abruptly changing
// color mid-flow). This blends CONTINUOUSLY between control points instead:
// deep blue (calm) easing through cyan/teal/green (moderate) into
// yellow/orange/red (strong to extreme) — the classic wind-map look.

interface WindColorStop {
  mph: number;
  rgb: [number, number, number];
}

const WIND_FLOW_STOPS: WindColorStop[] = [
  { mph: 0, rgb: [22, 30, 120] },
  { mph: 4, rgb: [34, 72, 200] },
  { mph: 8, rgb: [0, 140, 220] },
  { mph: 13, rgb: [0, 185, 195] },
  { mph: 18, rgb: [10, 209, 145] },
  { mph: 24, rgb: [70, 224, 90] },
  { mph: 31, rgb: [170, 232, 40] },
  { mph: 39, rgb: [255, 214, 30] },
  { mph: 48, rgb: [255, 140, 25] },
  { mph: 60, rgb: [255, 60, 55] },
];

/** Continuous (non-banded) wind speed → RGB triple, used by the animated
 *  flow field so color eases smoothly along a streamline instead of
 *  stepping between hard bands. */
export function windSpeedToRgb(speed: number, unit: TempUnit): [number, number, number] {
  const mph = Math.max(0, unit === "C" ? speed * 0.621 : speed);
  const stops = WIND_FLOW_STOPS;
  if (mph <= stops[0]!.mph) return stops[0]!.rgb;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (mph <= b.mph) {
      const t = (mph - a.mph) / (b.mph - a.mph);
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t),
      ];
    }
  }
  return stops[stops.length - 1]!.rgb;
}

export function windColorSmooth(speed: number, unit: TempUnit, alpha = 1): string {
  const [r, g, b] = windSpeedToRgb(speed, unit);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Blend an RGB color toward white so wind-particle streaks pop against the
 *  colored speed wash underneath instead of disappearing into it. */
export function brighten(rgb: [number, number, number], amount: number): [number, number, number] {
  return [
    Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * amount)),
    Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * amount)),
    Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * amount)),
  ];
}

export function withAlpha(color: string, alpha: number): string {
  return color.replace(/[\d.]+\)$/, `${alpha})`);
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

export function lerpLatLng(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

/** Four corners (SW, SE, NE, NW winding order) of a lat/lon "tile" centered on
 *  a grid point, sized so adjacent tiles fit edge-to-edge with no gaps or
 *  overlap -- used to render temperature/UV data as solid, sharply-bordered
 *  color tiles instead of blurry overlapping circles. */
export function tileCorners(lat: number, lon: number, halfWidthDeg: number): LatLng[] {
  const cosLat = Math.max(0.05, Math.cos(Math.min(85, Math.abs(lat)) * (Math.PI / 180)));
  const dLon = halfWidthDeg / cosLat;
  return [
    { latitude: lat - halfWidthDeg, longitude: lon - dLon },
    { latitude: lat - halfWidthDeg, longitude: lon + dLon },
    { latitude: lat + halfWidthDeg, longitude: lon + dLon },
    { latitude: lat + halfWidthDeg, longitude: lon - dLon },
  ];
}

export function windFlowEnd(pt: WeatherGridPoint, length: number): LatLng {
  const rad = (pt.windDirection * Math.PI) / 180;
  const cosLat = Math.max(0.05, Math.cos(Math.min(85, Math.abs(pt.lat)) * (Math.PI / 180)));
  return {
    latitude: pt.lat + length * Math.cos(rad),
    longitude: pt.lon + (length * Math.sin(rad)) / cosLat,
  };
}

/** Inverse-distance-weighted wind (speed + compass bearing) at an arbitrary
 *  lat/lon, interpolated from the sampled grid -- used to advect free-flowing
 *  wind particles smoothly between grid sample points instead of only ever
 *  showing motion exactly at the sampled nodes. */
export function interpolateWind(
  lat: number,
  lon: number,
  grid: WeatherGridPoint[]
): { speed: number; direction: number } {
  if (grid.length === 0) return { speed: 0, direction: 0 };
  let sumW = 0;
  let sumU = 0;
  let sumV = 0;
  let sumSpeed = 0;
  for (const g of grid) {
    const dLat = g.lat - lat;
    const dLon = g.lon - lon;
    const distSq = dLat * dLat + dLon * dLon;
    const w = 1 / Math.max(distSq, 0.00001);
    const rad = (g.windDirection * Math.PI) / 180;
    sumU += Math.cos(rad) * w;
    sumV += Math.sin(rad) * w;
    sumSpeed += g.windSpeed * w;
    sumW += w;
  }
  if (sumW === 0) return { speed: 0, direction: 0 };
  const u = sumU / sumW;
  const v = sumV / sumW;
  const direction = ((Math.atan2(v, u) * 180) / Math.PI + 360) % 360;
  return { speed: sumSpeed / sumW, direction };
}
