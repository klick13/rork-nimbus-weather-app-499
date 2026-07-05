import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Image,
  Platform,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import Svg, { Rect as SvgRect } from "react-native-svg";
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
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const gestureStartRegion = useRef(region);
  const tileZoom = Math.min(19, Math.max(0, Math.round(zoom)));

  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  }, []);

  const commitPan = useCallback(
    (dx: number, dy: number) => {
      if (dx === 0 && dy === 0) return;
      const start = gestureStartRegion.current;
      const centerPx = lonLatToWorldPixel(start.latitude, start.longitude, tileZoom);
      const { lat, lon } = worldPixelToLonLat(centerPx.x - dx, centerPx.y - dy, tileZoom);
      onRegionChange({ ...start, latitude: lat, longitude: lon });
    },
    [onRegionChange, tileZoom]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_: GestureResponderEvent, g: PanResponderGestureState) =>
          Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
          gestureStartRegion.current = region;
          pan.setValue({ x: 0, y: 0 });
          onPanStart?.();
        },
        onPanResponderMove: (_: GestureResponderEvent, g: PanResponderGestureState) => {
          setDragOffset({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: (_: GestureResponderEvent, g: PanResponderGestureState) => {
          commitPan(g.dx, g.dy);
          setDragOffset({ x: 0, y: 0 });
          onPanEnd?.();
        },
        onPanResponderTerminate: (_: GestureResponderEvent, g: PanResponderGestureState) => {
          commitPan(g.dx, g.dy);
          setDragOffset({ x: 0, y: 0 });
          onPanEnd?.();
        },
      }),
    [commitPan, onPanEnd, onPanStart, pan, region]
  );

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

    const WASH_SIZE = 80;
    let raster = scalarRasterRef.current;
    if (!raster) {
      raster = document.createElement("canvas");
      scalarRasterRef.current = raster;
    }
    raster.width = WASH_SIZE;
    raster.height = WASH_SIZE;
    const rctx = raster.getContext("2d");
    if (!rctx) return;

    for (let ry = 0; ry < WASH_SIZE; ry++) {
      const latT = ry / (WASH_SIZE - 1);
      const lat = maxLat - latT * (maxLat - minLat);
      for (let rx = 0; rx < WASH_SIZE; rx++) {
        const lonT = rx / (WASH_SIZE - 1);
        const lon = minLon + lonT * (maxLon - minLon);
        const v = interpolateScalar(lat, lon, activeLayer);
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

    // Labels
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
    for (const g of gridData) {
      const pos = project(g.lat, g.lon);
      if (pos.x < 20 || pos.x > size.width - 20 || pos.y < 20 || pos.y > size.height - 20) continue;
      const label = activeLayer === "uv" ? `${g.uvIndex}` : `${g.temp}\u00B0`;
      ctx.fillStyle = "rgba(2, 8, 14, 0.72)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 14, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(label, pos.x, pos.y);
    }

    // Legend
    const legendW = 14;
    const legendH = 180;
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
    ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i]!;
      const y = ly + legendH - (i / (stops.length - 1)) * legendH;
      let label = s.value.toString();
      if (activeLayer !== "uv") {
        label = tempUnit === "F" ? Math.round((s.value * 9) / 5 + 32).toString() : s.value.toString();
      }
      ctx.fillText(label, lx - 24, y);
    }
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
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
  const sizeRef = useRef(size);
  sizeRef.current = size;

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
    ctx.globalAlpha = 0.6;
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
          const rad = (wind.direction * Math.PI) / 180;
          const dx = Math.sin(rad) * pxPerSec * dt;
          const dy = -Math.cos(rad) * pxPerSec * dt;
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
          const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.55;
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
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} {...panResponder.panHandlers}>
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
