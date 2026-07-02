import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  Image,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import Svg, {
  Circle as SvgCircle,
  Line as SvgLine,
  Polygon as SvgPolygon,
  Rect as SvgRect,
} from "react-native-svg";
import { Region } from "react-native-maps";
import { WeatherColors } from "@/constants/colors";
import { WeatherGridPoint } from "@/utils/weatherApi";
import { TempUnit } from "@/types/weather";
import { TILE_SIZE, lonLatToWorldPixel, worldPixelToLonLat } from "@/utils/mapProjection";
import {
  tempColor,
  uvColor,
  windColor,
  withAlpha,
  windFlowEnd,
  arrowheadTriangle,
  interpolateWind,
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

const AnimatedLine = Animated.createAnimatedComponent(SvgLine);
const METERS_PER_DEGREE_LAT = 111320;

/** Free-flowing wind particles ("clouds" streaming with the flow), advected
 *  through the interpolated wind field independently of the fixed arrow
 *  grid — driven by its own requestAnimationFrame loop and pushed straight
 *  to the SVG nodes via setNativeProps so it can run at 60fps without
 *  forcing a React re-render every frame. */
const PARTICLE_COUNT = 70;

interface WindParticle {
  lat: number;
  lon: number;
  /** age/life in milliseconds */
  age: number;
  life: number;
  screenX: number | null;
  screenY: number | null;
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
  return 2600 + Math.random() * 2200;
}

function spawnParticle(bounds: GridBounds | null, fallbackLat: number, fallbackLon: number): WindParticle {
  const lat = bounds ? bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat) : fallbackLat;
  const lon = bounds ? bounds.minLon + Math.random() * (bounds.maxLon - bounds.minLon) : fallbackLon;
  return {
    lat,
    lon,
    age: Math.random() * 2000,
    life: randomLife(),
    screenX: null,
    screenY: null,
  };
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

  // Continuous "flowing" dash animation so wind lines read as moving air,
  // not static arrows.
  const flowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (activeLayer !== "wind") return;
    flowAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(flowAnim, {
        toValue: -24,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [activeLayer, flowAnim]);

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

  const windLines = useMemo(() => {
    if (activeLayer !== "wind") return [];
    return gridData.map((pt, i) => {
      const speed = pt.windSpeed;
      const direction = pt.windDirection;
      const dispSpeed = Math.max(speed, 2);
      const speedFactor = Math.min(dispSpeed / 40, 1);
      const lineLen = 0.05 + speedFactor * 0.35;
      const end = windFlowEnd(pt, lineLen);
      const arrowSize = 0.012 + speedFactor * 0.028;
      const arrow = arrowheadTriangle(end, direction, arrowSize, pt);
      const color = windColor(speed, tempUnit);
      const opacity = 0.45 + speedFactor * 0.5;
      const width = 1.2 + speedFactor * 4;
      const start = project(pt.lat, pt.lon);
      const tip = project(end.latitude, end.longitude);
      const a0 = project(arrow[0].latitude, arrow[0].longitude);
      const a2 = project(arrow[2].latitude, arrow[2].longitude);
      return { key: `wind-${i}`, start, tip, a0, a1: tip, a2, color, opacity, width };
    });
  }, [activeLayer, gridData, tempUnit, project]);

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

  // ── Free-flowing wind particles ─────────────────────────────────────────
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
  const regionRef = useRef(region);
  regionRef.current = region;

  const particlesRef = useRef<WindParticle[] | null>(null);
  if (particlesRef.current === null) {
    const bounds = computeGridBounds(gridData);
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      spawnParticle(bounds, region.latitude, region.longitude)
    );
  }
  const particles = particlesRef.current;
  const particleLineRefs = useRef<(SvgLine | null)[]>([]);
  const particleHeadRefs = useRef<(SvgCircle | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeLayer !== "wind") return;
    let mounted = true;
    let lastTime: number | null = null;

    const tick = (now: number) => {
      if (!mounted) return;
      if (lastTime === null) lastTime = now;
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      if (dt > 0.12 || dt <= 0) dt = 0.03;

      const grid = gridDataRef.current;
      const unit = tempUnitRef.current;
      const zoomNow = tileZoomRef.current;
      const proj = projectRef.current;
      const list = particlesRef.current;

      if (list) {
        for (let i = 0; i < list.length; i++) {
          const p = list[i]!;
          p.age += dt * 1000;
          let respawned = false;

          if (p.age > p.life || grid.length === 0) {
            const bounds = computeGridBounds(grid);
            const r = regionRef.current;
            const spawn = spawnParticle(bounds, r.latitude, r.longitude);
            p.lat = spawn.lat;
            p.lon = spawn.lon;
            p.age = 0;
            p.life = spawn.life;
            p.screenX = null;
            p.screenY = null;
            respawned = true;
          }

          const wind = grid.length > 0 ? interpolateWind(p.lat, p.lon, grid) : { speed: 0, direction: 0 };

          if (!respawned && grid.length > 0) {
            const mph = unit === "C" ? wind.speed * 0.621 : wind.speed;
            const speedFactor = Math.min(Math.max(mph, 1) / 32, 1.7);
            const pxPerSec = 16 + speedFactor * 52;
            const rad = (wind.direction * Math.PI) / 180;
            const dx = Math.sin(rad) * pxPerSec * dt;
            const dy = -Math.cos(rad) * pxPerSec * dt;
            const worldPx = lonLatToWorldPixel(p.lat, p.lon, zoomNow);
            const next = worldPixelToLonLat(worldPx.x + dx, worldPx.y + dy, zoomNow);
            p.lat = next.lat;
            p.lon = next.lon;
          }

          const screen = proj(p.lat, p.lon);
          const prevX = p.screenX;
          const prevY = p.screenY;
          let x1 = screen.x;
          let y1 = screen.y;
          if (prevX !== null && prevY !== null) {
            const dist = Math.hypot(screen.x - prevX, screen.y - prevY);
            if (dist < 60) {
              x1 = prevX;
              y1 = prevY;
            }
          }

          const lifeFrac = p.life > 0 ? p.age / p.life : 1;
          const fadeIn = Math.min(1, lifeFrac / 0.12);
          const fadeOut = Math.min(1, (1 - lifeFrac) / 0.18);
          const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.88;
          const color = grid.length > 0 ? windColor(wind.speed, unit) : "rgba(0, 224, 255, 0.9)";

          const lineEl = particleLineRefs.current[i];
          const headEl = particleHeadRefs.current[i];
          lineEl?.setNativeProps({
            x1,
            y1,
            x2: screen.x,
            y2: screen.y,
            stroke: withAlpha(color, alpha),
          });
          headEl?.setNativeProps({
            cx: screen.x,
            cy: screen.y,
            fill: withAlpha(color, Math.min(1, alpha + 0.1)),
          });

          p.screenX = screen.x;
          p.screenY = screen.y;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [activeLayer]);

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

        {size.width > 0 &&
          size.height > 0 &&
          (heatPoints.length > 0 || windLines.length > 0 || activeLayer === "wind") && (
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
                  fill={withAlpha(p.color, 0.66)}
                  stroke="rgba(3, 9, 16, 0.42)"
                  strokeWidth={1}
                />
              ))}
              {windLines.map((w) => (
                <React.Fragment key={w.key}>
                  {/* Neon glow halo behind the flow line */}
                  <SvgLine
                    x1={w.start.x}
                    y1={w.start.y}
                    x2={w.tip.x}
                    y2={w.tip.y}
                    stroke={withAlpha(w.color, w.opacity * 0.32)}
                    strokeWidth={w.width * 2.8}
                    strokeLinecap="round"
                  />
                  <AnimatedLine
                    x1={w.start.x}
                    y1={w.start.y}
                    x2={w.tip.x}
                    y2={w.tip.y}
                    stroke={withAlpha(w.color, w.opacity)}
                    strokeWidth={w.width}
                    strokeLinecap="round"
                    strokeDasharray="9,7"
                    strokeDashoffset={flowAnim}
                  />
                  <SvgPolygon
                    points={`${w.a0.x},${w.a0.y} ${w.a1.x},${w.a1.y} ${w.a2.x},${w.a2.y}`}
                    fill={withAlpha(w.color, Math.min(1, w.opacity + 0.15))}
                  />
                </React.Fragment>
              ))}
              {activeLayer === "wind" &&
                particles.map((p, i) => (
                  <React.Fragment key={`particle-${i}`}>
                    <SvgLine
                      ref={(el) => {
                        particleLineRefs.current[i] = el;
                      }}
                      x1={project(p.lat, p.lon).x}
                      y1={project(p.lat, p.lon).y}
                      x2={project(p.lat, p.lon).x}
                      y2={project(p.lat, p.lon).y}
                      stroke="rgba(0,0,0,0)"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                    />
                    <SvgCircle
                      ref={(el) => {
                        particleHeadRefs.current[i] = el;
                      }}
                      cx={project(p.lat, p.lon).x}
                      cy={project(p.lat, p.lon).y}
                      r={1.7}
                      fill="rgba(0,0,0,0)"
                    />
                  </React.Fragment>
                ))}
            </Svg>
          )}

        {heatPoints.map((p) => (
          <View
            key={`label-${p.key}`}
            pointerEvents="none"
            style={[styles.circleLabel, { left: p.pos.x - 15, top: p.pos.y - 15 }]}
          >
            <Text style={styles.circleLabelText}>{p.label}</Text>
          </View>
        ))}
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
