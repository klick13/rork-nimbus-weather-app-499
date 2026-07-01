/**
 * Web Mercator tile/pixel projection helpers shared between the native
 * map (react-native-maps) and the web-only slippy map fallback.
 */

export const TILE_SIZE = 256;

/** Convert lat/lon to fractional tile X/Y at a given zoom level (Web Mercator). */
export function latLonToTileXY(
  lat: number,
  lon: number,
  zoom: number
): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * n;
  const latRad = (Math.min(85, Math.max(-85, lat)) * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

/** Convert tile X/Y at given zoom back to the tile's NW corner lat/lon. */
export function tileXYToLatLon(
  x: number,
  y: number,
  zoom: number
): { lat: number; lon: number } {
  const n = Math.pow(2, zoom);
  const lon = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lon };
}

/** Convert lat/lon directly to fractional world pixel coordinates at a zoom level. */
export function lonLatToWorldPixel(
  lat: number,
  lon: number,
  zoom: number
): { x: number; y: number } {
  const { x, y } = latLonToTileXY(lat, lon, zoom);
  return { x: x * TILE_SIZE, y: y * TILE_SIZE };
}

/** Convert fractional world pixel coordinates back to lat/lon at a zoom level. */
export function worldPixelToLonLat(
  x: number,
  y: number,
  zoom: number
): { lat: number; lon: number } {
  return tileXYToLatLon(x / TILE_SIZE, y / TILE_SIZE, zoom);
}
