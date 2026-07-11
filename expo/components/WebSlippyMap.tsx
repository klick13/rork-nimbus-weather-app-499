import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import Svg, {
  Rect as SvgRect,
  Line as SvgLine,
  Path as SvgPath,
  Circle as SvgCircle,
  G as SvgG,
  Text as SvgText,
} from "react-native-svg";
import { Region } from "react-native-maps";
import { WeatherColors } from "@/constants/colors";
import { WeatherGridPoint } from "@/utils/weatherApi";
import { TempUnit } from "@/types/weather";
import { TILE_SIZE, lonLatToWorldPixel, worldPixelToLonLat } from "@/utils/mapProjection";
import {
  tempColor,
  uvColor,
  tempColorSmooth,
  uvColorSmooth,
  withAlpha,
  interpolateWind,
  windSpeedToRgb,
  windColorSmooth,
  brighten,
  TEMPERATURE_STOPS_C,
  UV_STOPS_EXPORT,
} from "@/utils/weatherMapVisuals";

/**
 * Browser-only slippy map. This project's web preview cannot load the Google
 * Maps JavaScript API (it needs a billed Google Cloud project + API key), so
 * on web we render our own lightweight pan/zoom map using free, keyless
 * CartoDB raster tiles instead — the native iOS/Android build keeps using
 * the real react-native-maps MapView untouched.
 */

export type MapLayer = "radar" | "wind" | "temperature" | "uv";

export interface WebRadarTile {
  key: string;
  url: string;
  /** Real geographic bounds [[south, west], [north, east]] — rendering by
   *  bounds (not raw tile x/y) means a tile fetched at a lower zoom simply
   *  stretches to cover its true area when the user zooms in further
   *  (standard slippy-map overzoom), instead of ever needing to hide tiles. */
  bounds: [[number, number], [number, number]];
}

interface Props {
  region: Region;
  zoom: number;
  onRegionChange: (region: Region) => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
  markerLat: number;
  markerLon: number;
  activeLayer: MapLayer;
  radarTiles: WebRadarTile[];
  gridData: WeatherGridPoint[];
  tempUnit: TempUnit;
  /** Tile half-width in meters, sized so adjacent grid points' tiles sit
   *  edge-to-edge and fully cover the visible map. */
  heatRadiusMeters: number;
}

const METERS_PER_DEGREE_LAT = 111320;

/**
 * Wind is rendered as an animated "flow field" (the classic windy.com /
 * leaflet-velocity look): a soft, smoothly-blended color wash shows local
 * wind speed, and hundreds of tiny particles stream across it along the
 * interpolated wind direction, leaving long silky fading trails instead of
 * discrete arrows. Both layers are drawn on real <canvas> elements (this
 * component only ever mounts on web — see IS_WEB in RadarMapWidget) since
 * canvas's alpha-fade trick is what actually produces continuous-looking
 * streamlines; hundreds of individually moving SVG nodes can't blend into
 * one another the same way.
 */

/** Raster resolution for the soft color wash -- sampled via IDW
 *  interpolation (not the raw grid's row/col order) so a sparse or partially
 *  missing grid still produces a smooth blended field, the same way a small
 *  heightmap texture looks smooth once magnified with bilinear filtering. */
const WASH_RASTER_SIZE = 48;
/** How much of the previous frame's trail alpha survives each tick -- the
 *  "destination-in" canvas fade trick that turns discrete moving dots into
 *  long, continuously-flowing streamlines instead of dashed segments. */
const TRAIL_RETAIN = 0.97;
const MIN_PARTICLES = 240;
const MAX_PARTICLES = 900;

interface FlowParticle {
  lat: number;
  lon: number;
  screenX: number;
  screenY: number;
  age: number;
  life: number;
  bornAt: number;
}

interface GridBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function computeGridBounds(grid: WeatherGridPoint[]): GridBounds | null {
  if (grid.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const g of grid) {
    if (g.lat < minLat) minLat = g.lat;
    if (g.lat > maxLat) maxLat = g.lat;
    if (g.lon < minLon) minLon = g.lon;
    if (g.lon > maxLon) maxLon = g.lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

function randomLife(): number {
  return 4500 + Math.random() * 4000;
}

/** More particles for a bigger canvas, clamped to a sane range so a huge
 *  fullscreen map doesn't tank frame rate. */
function particleCountFor(width: number, height: number): number {
  const count = Math.round((width * height) / 500);
  return Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, count));
}

const TILE_SUBDOMAINS = ["a", "b", "c", "d"];

function tileUrl(z: number, x: number, y: number): string {
  const n = Math.pow(2, z);
  const wrappedX = ((x % n) + n) % n;
  const sub = TILE_SUBDOMAINS[(wrappedX + y) % TILE_SUBDOMAINS.length];
  return `https://${sub}.basemaps.cartocdn.com/dark_all/${z}/${wrappedX}/${y}.png`;
}

export default function WebSlippyMap({
  region,
  zoom,
  onRegionChange,
  onPanStart,
  onPanEnd,
  markerLat,
  markerLon,
  activeLayer,
  radarTiles,
  gridData,
  tempUnit,
  heatRadiusMeters,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const tileZoom = Math.min(19, Math.max(0, Math.round(zoom)));
  const containerRef = useRef<View>(null);

  // Refs that the DOM touch handler reads — kept fresh every render so the
  // useEffect (which mounts once) always sees current values.
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const regionRef = useRef(region);
  regionRef.current = region;
  const onRegionChangeRef = useRef(onRegionChange);
  onRegionChangeRef.current = onRegionChange;
  const onPanStartRef = useRef(onPanStart);
  onPanStartRef.current = onPanStart;
  const onPanEndRef = useRef(onPanEnd);
  onPanEndRef.current = onPanEnd;
  const dragOffsetRef = useRef(dragOffset);
  dragOffsetRef.current = dragOffset;

  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  }, []);

  // ── Pinch-to-zoom + pan via native DOM touch events ────────────────────
  // PanResponder can't track multiple touches, so we use raw DOM events for
  // two-finger pinch-to-zoom. Also adds mouse-wheel zoom for desktop testing.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = containerRef.current as unknown as HTMLElement | null;
    if (!el) return;

    let mode: "idle" | "pan" | "pinch" = "idle";
    let startTouches: Array<{ x: number; y: number }> = [];
    let startRegion: Region = region;
    let startDist = 0;
    let pinchCenterScreen = { x: 0, y: 0 };
    let pinchCenterGeo = { lat: 0, lon: 0 };

    const zoomFromDelta = (delta: number) =>
      Math.round(Math.log2(360 / Math.max(0.001, delta)));

    const getCoords = (touches: TouchList) => {
      const rect = el.getBoundingClientRect();
      return Array.from(touches).map((t) => ({
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
      }));
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const coords = getCoords(e.touches);
      const currentRegion = regionRef.current;

      if (coords.length === 1) {
        mode = "pan";
        startTouches = coords;
        startRegion = currentRegion;
        setDragOffset({ x: 0, y: 0 });
        onPanStartRef.current?.();
      } else if (coords.length >= 2) {
        mode = "pinch";
        startTouches = coords;
        startRegion = currentRegion;
        startDist = Math.hypot(
          coords[1].x - coords[0].x,
          coords[1].y - coords[0].y
        );
        pinchCenterScreen = {
          x: (coords[0].x + coords[1].x) / 2,
          y: (coords[0].y + coords[1].y) / 2,
        };
        const zoom = zoomFromDelta(startRegion.longitudeDelta);
        const centerPx = lonLatToWorldPixel(
          startRegion.latitude,
          startRegion.longitude,
          zoom
        );
        const origin = {
          x: centerPx.x - sizeRef.current.width / 2,
          y: centerPx.y - sizeRef.current.height / 2,
        };
        pinchCenterGeo = worldPixelToLonLat(
          origin.x + pinchCenterScreen.x,
          origin.y + pinchCenterScreen.y,
          zoom
        );
        setDragOffset({ x: 0, y: 0 });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const coords = getCoords(e.touches);

      if (mode === "pan" && coords.length >= 1) {
        setDragOffset({
          x: coords[0].x - startTouches[0].x,
          y: coords[0].y - startTouches[0].y,
        });
      } else if (mode === "pinch" && coords.length >= 2) {
        const dist = Math.hypot(
          coords[1].x - coords[0].x,
          coords[1].y - coords[0].y
        );
        const scale = startDist / Math.max(1, dist);
        const newDelta = Math.min(
          180,
          Math.max(0.002, startRegion.longitudeDelta * scale)
        );
        const newLatDelta = Math.min(
          85,
          Math.max(0.002, startRegion.latitudeDelta * scale)
        );
        const newZoom = zoomFromDelta(newDelta);

        // Keep the geographic point under the pinch center stationary.
        const pinchWorldPxNew = lonLatToWorldPixel(
          pinchCenterGeo.lat,
          pinchCenterGeo.lon,
          newZoom
        );
        const newOrigin = {
          x: pinchWorldPxNew.x - pinchCenterScreen.x,
          y: pinchWorldPxNew.y - pinchCenterScreen.y,
        };
        const newCenterWorldPx = {
          x: newOrigin.x + sizeRef.current.width / 2,
          y: newOrigin.y + sizeRef.current.height / 2,
        };
        const newCenter = worldPixelToLonLat(
          newCenterWorldPx.x,
          newCenterWorldPx.y,
          newZoom
        );

        onRegionChangeRef.current({
          latitude: newCenter.lat,
          longitude: newCenter.lon,
          latitudeDelta: newLatDelta,
          longitudeDelta: newDelta,
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const remaining = Array.from(e.touches);

      if (remaining.length === 0) {
        if (mode === "pan") {
          const start = startRegion;
          const zoom = zoomFromDelta(start.longitudeDelta);
          const centerPx = lonLatToWorldPixel(
            start.latitude,
            start.longitude,
            zoom
          );
          const lastOffset = dragOffsetRef.current;
          const newCenter = worldPixelToLonLat(
            centerPx.x - lastOffset.x,
            centerPx.y - lastOffset.y,
            zoom
          );
          onRegionChangeRef.current({
            ...start,
            latitude: newCenter.lat,
            longitude: newCenter.lon,
          });
          setDragOffset({ x: 0, y: 0 });
          onPanEndRef.current?.();
        } else if (mode === "pinch") {
          onPanEndRef.current?.();
        }
        mode = "idle";
      } else if (remaining.length === 1 && mode === "pinch") {
        // Drop from pinch to pan with the remaining finger.
        const coords = getCoords(e.touches);
        mode = "pan";
        startTouches = coords;
        startRegion = regionRef.current;
        setDragOffset({ x: 0, y: 0 });
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentRegion = regionRef.current;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
      const newDelta = Math.min(
        180,
        Math.max(0.002, currentRegion.longitudeDelta * zoomFactor)
      );
      const newLatDelta = Math.min(
        85,
        Math.max(0.002, currentRegion.latitudeDelta * zoomFactor)
      );
      const newZoom = zoomFromDelta(newDelta);
      const startZoom = zoomFromDelta(currentRegion.longitudeDelta);

      // Keep the geo point under the mouse cursor stationary.
      const centerPx = lonLatToWorldPixel(
        currentRegion.latitude,
        currentRegion.longitude,
        startZoom
      );
      const origin = {
        x: centerPx.x - sizeRef.current.width / 2,
        y: centerPx.y - sizeRef.current.height / 2,
      };
      const mouseGeo = worldPixelToLonLat(
        origin.x + mouseX,
        origin.y + mouseY,
        startZoom
      );
      const mouseWorldPxNew = lonLatToWorldPixel(
        mouseGeo.lat,
        mouseGeo.lon,
        newZoom
      );
      const newOrigin = {
        x: mouseWorldPxNew.x - mouseX,
        y: mouseWorldPxNew.y - mouseY,
      };
      const newCenterWorldPx = {
        x: newOrigin.x + sizeRef.current.width / 2,
        y: newOrigin.y + sizeRef.current.height / 2,
      };
      const newCenter = worldPixelToLonLat(
        newCenterWorldPx.x,
        newCenterWorldPx.y,
        newZoom
      );

      onRegionChangeRef.current({
        latitude: newCenter.lat,
        longitude: newCenter.lon,
        latitudeDelta: newLatDelta,
        longitudeDelta: newDelta,
      });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const centerPx = useMemo(
    () => lonLatToWorldPixel(region.latitude, region.longitude, tileZoom),
    [region.latitude, region.longitude, tileZoom]
  );

  const originPx = useMemo(
    () => ({ x: centerPx.x - size.width / 2, y: centerPx.y - size.height / 2 }),
    [centerPx, size.width, size.height]
  );

  const project = useCallback(
    (lat: number, lon: number) => {
      const px = lonLatToWorldPixel(lat, lon, tileZoom);
      return { x: px.x - originPx.x + dragOffset.x, y: px.y - originPx.y + dragOffset.y };
    },
    [originPx, tileZoom, dragOffset]
  );

  const baseTiles = useMemo(() => {
    if (size.width === 0 || size.height === 0) return [];
    const minX = Math.floor(originPx.x / TILE_SIZE) - 1;
    const maxX = Math.ceil((originPx.x + size.width) / TILE_SIZE) + 1;
    const minY = Math.floor(originPx.y / TILE_SIZE) - 1;
    const maxY = Math.ceil((originPx.y + size.height) / TILE_SIZE) + 1;
    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (y < 0 || y >= Math.pow(2, tileZoom)) continue;
        tiles.push({
          key: `base-${tileZoom}-${x}-${y}`,
          url: tileUrl(tileZoom, x, y),
          left: x * TILE_SIZE - originPx.x,
          top: y * TILE_SIZE - originPx.y,
        });
      }
    }
    return tiles;
  }, [originPx, size.width, size.height, tileZoom]);

  const markerPos = project(markerLat, markerLon);

  // Pixel radius derived from real-world meters at the current zoom, so heat
  // tiles stay correctly sized (covering the whole view, edge-to-edge) as
  // you zoom.
  const heatRadiusPx = useMemo(() => {
    const pxPerDeg = (TILE_SIZE * Math.pow(2, tileZoom)) / 360;
    const metersPerDegAtLat = METERS_PER_DEGREE_LAT * Math.cos((region.latitude * Math.PI) / 180);
    return (heatRadiusMeters / metersPerDegAtLat) * pxPerDeg;
  }, [heatRadiusMeters, region.latitude, tileZoom]);

  const heatPoints = useMemo(() => {
    if (activeLayer !== "temperature" && activeLayer !== "uv") return [];
    return gridData.map((pt, i) => {
      const pos = project(pt.lat, pt.lon);
      const color =
        activeLayer === "temperature" ? tempColor(pt.temp, tempUnit) : uvColor(pt.uvIndex);
      const label = activeLayer === "temperature" ? `${pt.temp}\u00B0` : `${pt.uvIndex}`;
      return { key: `heat-${i}`, pos, color, label };
    });
  }, [activeLayer, gridData, tempUnit, project]);

  // ── Scalar field helpers (temperature / UV) ─────────────────────────────
  function drawUVBadges(
    ctx: CanvasRenderingContext2D,
    minLon: number,
    maxLon: number,
    minLat: number,
    maxLat: number,
    interpolateScalar: (lat: number, lon: number, field: "temperature" | "uv") => number,
    projectFn: (lat: number, lon: number) => { x: number; y: number },
    canvasSize: { width: number; height: number }
  ) {
    const rows = 5;
    const cols = 4;
    const padding = 12;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lon = minLon + ((c + 0.5) / cols) * (maxLon - minLon);
        const lat = maxLat - ((r + 0.5) / rows) * (maxLat - minLat);
        const pos = projectFn(lat, lon);
        if (pos.x < padding || pos.x > canvasSize.width - padding || pos.y < padding || pos.y > canvasSize.height - padding) continue;
        const v = interpolateScalar(lat, lon, "uv");
        const rounded = Math.round(v);
        if (rounded <= 0) continue;
        const color = uvColorSmooth(rounded);
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length < 3) continue;
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.92)`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.97)";
        ctx.fillText(rounded.toString(), pos.x, pos.y);
      }
    }
  }

  function drawTempLabels(
    ctx: CanvasRenderingContext2D,
    minLon: number,
    maxLon: number,
    minLat: number,
    maxLat: number,
    interpolateScalar: (lat: number, lon: number, field: "temperature" | "uv") => number,
    projectFn: (lat: number, lon: number) => { x: number; y: number },
    canvasSize: { width: number; height: number },
    unit: TempUnit,
    grid: WeatherGridPoint[]
  ) {
    const rows = 6;
    const cols = 5;
    const padding = 14;
    const positions: { pos: { x: number; y: number }; value: number }[] = [];

    for (const g of grid) {
      const pos = projectFn(g.lat, g.lon);
      if (pos.x > padding && pos.x < canvasSize.width - padding && pos.y > padding && pos.y < canvasSize.height - padding) {
        positions.push({ pos, value: g.temp });
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lon = minLon + ((c + 0.5) / cols) * (maxLon - minLon);
        const lat = maxLat - ((r + 0.5) / rows) * (maxLat - minLat);
        const pos = projectFn(lat, lon);
        if (pos.x < padding || pos.x > canvasSize.width - padding || pos.y < padding || pos.y > canvasSize.height - padding) continue;
        let tooClose = false;
        for (const existing of positions) {
          if (Math.hypot(pos.x - existing.pos.x, pos.y - existing.pos.y) < 34) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;
        const v = interpolateScalar(lat, lon, "temperature");
        positions.push({ pos, value: v });
      }
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
    for (const p of positions) {
      const label = unit === "F" ? `${Math.round((p.value * 9) / 5 + 32)}\u00B0` : `${Math.round(p.value)}\u00B0`;
      ctx.fillStyle = "rgba(2, 8, 14, 0.72)";
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 14, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(label, p.pos.x, p.pos.y);
    }
  }

  // ── Scalar field (temperature / UV) smooth canvas rendering ───────────────
  const scalarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scalarRasterRef = useRef<HTMLCanvasElement | null>(null);

  const interpolateScalar = useCallback(
    (lat: number, lon: number, field: "temperature" | "uv") => {
      if (gridData.length === 0) return 0;
      let sumW = 0;
      let sumV = 0;
      for (const g of gridData) {
        const dLat = g.lat - lat;
        const dLon = g.lon - lon;
        const distSq = dLat * dLat + dLon * dLon;
        const w = 1 / Math.max(distSq, 0.00001);
        sumV += (field === "uv" ? g.uvIndex : g.temp) * w;
        sumW += w;
      }
      return sumW === 0 ? 0 : sumV / sumW;
    },
    [gridData]
  );

  const drawScalarField = useCallback(() => {
    if (Platform.OS !== "web" || (activeLayer !== "temperature" && activeLayer !== "uv")) return;
    const canvas = scalarCanvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0 || gridData.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (const g of gridData) {
      if (g.lat < minLat) minLat = g.lat;
      if (g.lat > maxLat) maxLat = g.lat;
      if (g.lon < minLon) minLon = g.lon;
      if (g.lon > maxLon) maxLon = g.lon;
    }
    const pad = 0.08;
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;
    minLat -= latRange * pad;
    maxLat += latRange * pad;
    minLon -= lonRange * pad;
    maxLon += lonRange * pad;

    const WASH_SIZE = 150;
    let raster = scalarRasterRef.current;
    if (!raster) {
      raster = document.createElement("canvas");
      scalarRasterRef.current = raster;
    }
    raster.width = WASH_SIZE;
    raster.height = WASH_SIZE;
    const rctx = raster.getContext("2d");
    if (!rctx) return;

    const values: number[][] = [];
    for (let ry = 0; ry < WASH_SIZE; ry++) {
      values[ry] = [];
      const latT = ry / (WASH_SIZE - 1);
      const lat = maxLat - latT * (maxLat - minLat);
      for (let rx = 0; rx < WASH_SIZE; rx++) {
        const lonT = rx / (WASH_SIZE - 1);
        const lon = minLon + lonT * (maxLon - minLon);
        const v = interpolateScalar(lat, lon, activeLayer);
        values[ry]![rx] = v;
        const color = activeLayer === "uv" ? uvColorSmooth(v) : tempColorSmooth(v, tempUnit);
        rctx.fillStyle = color;
        rctx.fillRect(rx, ry, 1, 1);
      }
    }

    const topLeft = project(maxLat, minLon);
    const bottomRight = project(minLat, maxLon);
    const w = Math.max(1, bottomRight.x - topLeft.x);
    const h = Math.max(1, bottomRight.y - topLeft.y);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(raster, topLeft.x, topLeft.y, w, h);

    // Contour lines at color-stop thresholds to define boundaries between regions.
    const levels =
      activeLayer === "uv"
        ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        : [-25, -15, -8, -2, 4, 9, 14, 18, 23, 27, 31, 35, 40];
    ctx.strokeStyle = "rgba(255,255,255,0.20)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const level of levels) {
      for (let ry = 0; ry < WASH_SIZE - 1; ry++) {
        for (let rx = 0; rx < WASH_SIZE - 1; rx++) {
          const v00 = values[ry]![rx]!;
          const v01 = values[ry]![rx + 1]!;
          const v10 = values[ry + 1]![rx]!;
          const v11 = values[ry + 1]![rx + 1]!;
          const min = Math.min(v00, v01, v10, v11);
          const max = Math.max(v00, v01, v10, v11);
          if (level < min || level > max) continue;

          const pts: { x: number; y: number }[] = [];
          const add = (a: number, b: number, ax: number, ay: number, bx: number, by: number) => {
            if ((a <= level && b > level) || (a > level && b <= level)) {
              const t = (level - a) / (b - a);
              const lon = minLon + ((ax + (bx - ax) * t) / (WASH_SIZE - 1)) * (maxLon - minLon);
              const lat = maxLat - ((ay + (by - ay) * t) / (WASH_SIZE - 1)) * (maxLat - minLat);
              pts.push(project(lat, lon));
            }
          };
          add(v00, v01, rx, ry, rx + 1, ry);
          add(v10, v11, rx, ry + 1, rx + 1, ry + 1);
          add(v00, v10, rx, ry, rx, ry + 1);
          add(v01, v11, rx + 1, ry, rx + 1, ry + 1);

          if (pts.length >= 2) {
            ctx.moveTo(pts[0]!.x, pts[0]!.y);
            ctx.lineTo(pts[1]!.x, pts[1]!.y);
            if (pts.length >= 4) {
              ctx.moveTo(pts[2]!.x, pts[2]!.y);
              ctx.lineTo(pts[3]!.x, pts[3]!.y);
            }
          }
        }
      }
    }
    ctx.stroke();

    // Labels / badges.
    if (activeLayer === "uv") {
      drawUVBadges(ctx, minLon, maxLon, minLat, maxLat, interpolateScalar, project, size);
    } else {
      drawTempLabels(ctx, minLon, maxLon, minLat, maxLat, interpolateScalar, project, size, tempUnit, gridData);
    }

    // Legend
    const legendW = 16;
    const legendH = 200;
    const lx = size.width - legendW - 14;
    const ly = 16;
    const stops = activeLayer === "uv" ? UV_STOPS_EXPORT : TEMPERATURE_STOPS_C;
    const grad = ctx.createLinearGradient(lx, ly + legendH, lx, ly);
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]!;
      const offset = i / (stops.length - 1);
      grad.addColorStop(offset, `rgb(${s.rgb[0]}, ${s.rgb[1]}, ${s.rgb[2]})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(lx, ly, legendW, legendH);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(lx, ly, legendW, legendH);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]!;
      const y = ly + legendH - (i / (stops.length - 1)) * legendH;
      let label = s.value.toString();
      if (activeLayer !== "uv") {
        label = tempUnit === "F" ? Math.round((s.value * 9) / 5 + 32).toString() : s.value.toString();
      }
      ctx.fillText(label, lx - 28, y);
    }
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const unit = activeLayer === "uv" ? "UV" : tempUnit === "F" ? "\u00B0F" : "\u00B0C";
    ctx.fillText(unit, lx - 4, ly - 4);
  }, [activeLayer, gridData, interpolateScalar, project, size, tempUnit]);

  useEffect(() => {
    drawScalarField();
  }, [drawScalarField]);

  // ── Wind flow field (web canvas) ────────────────────────────────────────
  const washCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const flowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rasterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);
  const particlesRef = useRef<FlowParticle[]>([]);

  // "Latest value" refs so the standalone rAF loop below always reads fresh
  // data/projection without needing to restart every time region/gridData
  // change (that would reset every particle's flight mid-animation).
  const gridDataRef = useRef(gridData);
  gridDataRef.current = gridData;
  const tempUnitRef = useRef(tempUnit);
  tempUnitRef.current = tempUnit;
  const projectRef = useRef(project);
  projectRef.current = project;
  const tileZoomRef = useRef(tileZoom);
  tileZoomRef.current = tileZoom;
  const originPxRef = useRef(originPx);
  originPxRef.current = originPx;

  const spawnParticleInto = useCallback((p: FlowParticle, now: number) => {
    const { width, height } = sizeRef.current;
    const sx = Math.random() * Math.max(1, width);
    const sy = Math.random() * Math.max(1, height);
    const origin = originPxRef.current;
    const geo = worldPixelToLonLat(origin.x + sx, origin.y + sy, tileZoomRef.current);
    p.lat = geo.lat;
    p.lon = geo.lon;
    p.screenX = sx;
    p.screenY = sy;
    p.age = 0;
    p.life = randomLife();
    p.bornAt = now;
  }, []);

  // (Re)size the two canvases and rebuild the particle field whenever the
  // wind layer (re)mounts or the container size changes. Canvases only exist
  // in the DOM while `activeLayer === "wind"` (see render below), so this
  // must depend on activeLayer to run again each time they remount.
  useEffect(() => {
    if (Platform.OS !== "web" || activeLayer !== "wind") return;
    if (size.width === 0 || size.height === 0) return;
    const dpr = Math.min(2, (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1);
    dprRef.current = dpr;
    for (const ref of [washCanvasRef, flowCanvasRef]) {
      const el = ref.current;
      if (!el) continue;
      el.width = Math.round(size.width * dpr);
      el.height = Math.round(size.height * dpr);
      const ctx = el.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const now = Date.now();
    const count = particleCountFor(size.width, size.height);
    const list: FlowParticle[] = [];
    for (let i = 0; i < count; i++) {
      const p: FlowParticle = { lat: 0, lon: 0, screenX: 0, screenY: 0, age: 0, life: 0, bornAt: 0 };
      spawnParticleInto(p, now);
      p.age = Math.random() * p.life; // stagger so particles don't all "pop" in together
      list.push(p);
    }
    particlesRef.current = list;
  }, [activeLayer, size.width, size.height, spawnParticleInto]);

  // Soft color wash -- redrawn whenever the sampled grid or the map
  // projection changes, NOT every animation frame (unlike the particle flow
  // canvas above it, this layer is static between grid refreshes/pans).
  useEffect(() => {
    if (Platform.OS !== "web" || activeLayer !== "wind") return;
    const canvas = washCanvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const bounds = computeGridBounds(gridData);
    if (!bounds) {
      ctx.restore();
      return;
    }

    let raster = rasterCanvasRef.current;
    if (!raster) {
      raster = document.createElement("canvas");
      rasterCanvasRef.current = raster;
    }
    raster.width = WASH_RASTER_SIZE;
    raster.height = WASH_RASTER_SIZE;
    const rctx = raster.getContext("2d");
    if (!rctx) {
      ctx.restore();
      return;
    }
    for (let ry = 0; ry < WASH_RASTER_SIZE; ry++) {
      const latT = ry / (WASH_RASTER_SIZE - 1);
      const lat = bounds.maxLat - latT * (bounds.maxLat - bounds.minLat);
      for (let rx = 0; rx < WASH_RASTER_SIZE; rx++) {
        const lonT = rx / (WASH_RASTER_SIZE - 1);
        const lon = bounds.minLon + lonT * (bounds.maxLon - bounds.minLon);
        const wind = interpolateWind(lat, lon, gridData);
        const [r, g, b] = windSpeedToRgb(wind.speed, tempUnit);
        rctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        rctx.fillRect(rx, ry, 1, 1);
      }
    }

    const topLeft = project(bounds.maxLat, bounds.minLon);
    const bottomRight = project(bounds.minLat, bounds.maxLon);
    const w = Math.max(1, bottomRight.x - topLeft.x);
    const h = Math.max(1, bottomRight.y - topLeft.y);
    ctx.globalAlpha = 0.38;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(raster, topLeft.x, topLeft.y, w, h);
    ctx.restore();
  }, [activeLayer, gridData, tempUnit, project, size.width, size.height]);

  // Animated flow particles -- driven by its own requestAnimationFrame loop,
  // drawing straight to canvas (not React state) so it can run at 60fps
  // without forcing a re-render every frame.
  useEffect(() => {
    if (Platform.OS !== "web" || activeLayer !== "wind") return;
    let mounted = true;
    let lastTime: number | null = null;
    let rafId = 0;

    const tick = (now: number) => {
      if (!mounted) return;
      if (lastTime === null) lastTime = now;
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      if (dt > 0.12 || dt <= 0) dt = 0.03;

      const canvas = flowCanvasRef.current;
      const ctx = canvas ? canvas.getContext("2d") : null;
      const { width, height } = sizeRef.current;

      if (ctx && width > 0 && height > 0) {
        ctx.save();
        ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
        // Fade the existing trail's ALPHA only (not its color) -- this is
        // what turns discrete moving segments into long, silky, continuously
        // flowing streamlines instead of dashes.
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_RETAIN})`;
        ctx.fillRect(0, 0, width, height);
        // Overlapping particles add their brightness together, so dense
        // streamlines naturally glow where they bundle — the classic Windy look.
        ctx.globalCompositeOperation = "lighter";

        const grid = gridDataRef.current;
        const unit = tempUnitRef.current;
        const zoomNow = tileZoomRef.current;
        const proj = projectRef.current;
        const pad = 40;
        const list = particlesRef.current;

        for (let i = 0; i < list.length; i++) {
          const p = list[i]!;
          p.age += dt * 1000;

          if (p.age > p.life || grid.length === 0) {
            spawnParticleInto(p, now);
            continue; // don't draw a segment on the respawn tick
          }

          const wind = interpolateWind(p.lat, p.lon, grid);
          const mph = unit === "C" ? wind.speed * 0.621 : wind.speed;
          const speedFactor = Math.min(Math.max(mph, 1.2) / 34, 1.4);
          const pxPerSec = 20 + speedFactor * 70;
          // Wind direction is the meteorological "from" bearing, so
          // particles travel in the OPPOSITE direction (toward where the
          // wind is going). 0° = from north → moves south (+y); 90° = from
          // east → moves west (−x); etc.
          const rad = (wind.direction * Math.PI) / 180;
          const dx = -Math.sin(rad) * pxPerSec * dt;
          const dy = Math.cos(rad) * pxPerSec * dt;
          const worldPx = lonLatToWorldPixel(p.lat, p.lon, zoomNow);
          const next = worldPixelToLonLat(worldPx.x + dx, worldPx.y + dy, zoomNow);
          p.lat = next.lat;
          p.lon = next.lon;

          const prevX = p.screenX;
          const prevY = p.screenY;
          const screen = proj(p.lat, p.lon);
          p.screenX = screen.x;
          p.screenY = screen.y;

          if (screen.x < -pad || screen.x > width + pad || screen.y < -pad || screen.y > height + pad) {
            spawnParticleInto(p, now);
            continue;
          }

          const dist = Math.hypot(screen.x - prevX, screen.y - prevY);
          if (dist > 100 || dist < 0.2) continue; // guard against a stray teleport segment

          const lifeFrac = p.life > 0 ? p.age / p.life : 1;
          const fadeIn = Math.min(1, (now - p.bornAt) / 280);
          const fadeOut = Math.min(1, (1 - lifeFrac) / 0.22);
          const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.72;
          if (alpha <= 0.015) continue;

          const baseRgb = windSpeedToRgb(wind.speed, unit);
          const [r, g, b] = brighten(baseRgb, 0.35);
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(screen.x, screen.y);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.lineWidth = 0.8 + speedFactor * 1.2;
          ctx.lineCap = "round";
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
    };
  }, [activeLayer, spawnParticleInto]);

  return (
    <View ref={containerRef} style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <View style={StyleSheet.absoluteFill}>
        {baseTiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.url }}
            style={{
              position: "absolute",
              left: tile.left,
              top: tile.top,
              width: TILE_SIZE + 1,
              height: TILE_SIZE + 1,
            }}
          />
        ))}

        {activeLayer === "radar" &&
          radarTiles.map((tile) => {
            // Project the tile's real geographic bounds into the CURRENT zoom's
            // pixel space -- this is what makes overzoom work: a tile fetched at
            // a lower (supported) zoom just stretches to fill its true area.
            const south = tile.bounds[0][0];
            const west = tile.bounds[0][1];
            const north = tile.bounds[1][0];
            const east = tile.bounds[1][1];
            const topLeft = project(north, west);
            const bottomRight = project(south, east);
            return (
              <Image
                key={tile.key}
                source={{ uri: tile.url }}
                resizeMode="stretch"
                style={{
                  position: "absolute",
                  left: topLeft.x,
                  top: topLeft.y,
                  width: Math.max(1, bottomRight.x - topLeft.x),
                  height: Math.max(1, bottomRight.y - topLeft.y),
                  opacity: 0.82,
                }}
              />
            );
          })}

        {activeLayer === "wind" && size.width > 0 && size.height > 0 && (
          <React.Fragment>
            {/* Soft, smoothly-blended wind-speed color wash */}
            <canvas
              ref={washCanvasRef}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: size.width,
                height: size.height,
                pointerEvents: "none",
              }}
            />
            {/* Animated streamline particles, drawn on top of the wash */}
            <canvas
              ref={flowCanvasRef}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: size.width,
                height: size.height,
                pointerEvents: "none",
              }}
            />
            {/* Static wind direction arrows at each grid point — visible
                indicators so wind direction reads even before the particle
                animation warms up or if it's too faint. */}
            <Svg
              width={size.width}
              height={size.height}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              {gridData.map((pt, i) => {
                const pos = project(pt.lat, pt.lon);
                if (pos.x < -40 || pos.x > size.width + 40 || pos.y < -40 || pos.y > size.height + 40) return null;
                // Arrow points toward where wind is GOING (opposite of "from" bearing).
                const rad = (pt.windDirection * Math.PI) / 180;
                const dirX = -Math.sin(rad);
                const dirY = Math.cos(rad);
                const perpX = -dirY;
                const perpY = dirX;
                const circleR = 13;
                const arrowLen = 22;
                const start = { x: pos.x + dirX * circleR, y: pos.y + dirY * circleR };
                const end = { x: pos.x + dirX * (circleR + arrowLen), y: pos.y + dirY * (circleR + arrowLen) };
                const color = windColorSmooth(pt.windSpeed, tempUnit, 0.92);
                const headLen = 8;
                const headW = 5.5;
                const headLeft = { x: end.x - dirX * headLen + perpX * headW, y: end.y - dirY * headLen + perpY * headW };
                const headRight = { x: end.x - dirX * headLen - perpX * headW, y: end.y - dirY * headLen - perpY * headW };
                const shaftEnd = { x: end.x - dirX * headLen * 0.5, y: end.y - dirY * headLen * 0.5 };
                return (
                  <SvgG key={`wind-arrow-${i}`}>
                    <SvgLine
                      x1={start.x}
                      y1={start.y}
                      x2={shaftEnd.x}
                      y2={shaftEnd.y}
                      stroke={color}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <SvgPath
                      d={`M ${end.x} ${end.y} L ${headLeft.x} ${headLeft.y} L ${headRight.x} ${headRight.y} Z`}
                      fill={color}
                    />
                    <SvgCircle
                      cx={pos.x}
                      cy={pos.y}
                      r={circleR}
                      fill="rgba(2, 8, 14, 0.45)"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth={1}
                    />
                    <SvgText
                      x={pos.x}
                      y={pos.y + 4}
                      fontSize={11}
                      fontWeight="bold"
                      fill="rgba(255,255,255,0.95)"
                      textAnchor="middle"
                    >
                      {pt.windSpeed}
                    </SvgText>
                  </SvgG>
                );
              })}
            </Svg>
          </React.Fragment>
        )}

        {size.width > 0 && size.height > 0 && heatPoints.length > 0 && activeLayer !== "temperature" && activeLayer !== "uv" && (
          <Svg
            width={size.width}
            height={size.height}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {heatPoints.map((p) => (
              <SvgRect
                key={p.key}
                x={p.pos.x - heatRadiusPx}
                y={p.pos.y - heatRadiusPx}
                width={heatRadiusPx * 2}
                height={heatRadiusPx * 2}
                fill={withAlpha(p.color, 0.85)}
                stroke="rgba(3, 9, 16, 0.42)"
                strokeWidth={1}
              />
            ))}
          </Svg>
        )}

        {activeLayer !== "temperature" && activeLayer !== "uv" && heatPoints.map((p) => (
          <View
            key={`label-${p.key}`}
            pointerEvents="none"
            style={[styles.circleLabel, { left: p.pos.x - 15, top: p.pos.y - 15 }]}
          >
            <Text style={styles.circleLabelText}>{p.label}</Text>
          </View>
        ))}

        {size.width > 0 && size.height > 0 && (activeLayer === "temperature" || activeLayer === "uv") && (
          <canvas
            ref={scalarCanvasRef}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: size.width,
              height: size.height,
              pointerEvents: "none",
            }}
          />
        )}
      </View>

      <View
        pointerEvents="none"
        style={[styles.centerDotOuter, { left: markerPos.x - 8, top: markerPos.y - 8 }]}
      >
        <View style={styles.centerDotInner} />
      </View>

      <View style={styles.attribution} pointerEvents="none">
        <Text style={styles.attributionText}>\u00A9 OpenStreetMap \u00A9 CARTO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerDotOuter: {
    position: "absolute" as const,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 240, 255, 0.25)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  centerDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WeatherColors.accent,
    borderWidth: 2,
    borderColor: "#fff",
  },
  circleLabel: {
    position: "absolute" as const,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(2, 8, 14, 0.80)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  circleLabelText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  zoomMessageWrap: {
    position: "absolute" as const,
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center" as const,
  },
  zoomMessageText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden" as const,
  },
  attribution: {
    position: "absolute" as const,
    right: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  attributionText: {
    fontSize: 8,
    color: "rgba(255,255,255,0.55)",
  },
});
