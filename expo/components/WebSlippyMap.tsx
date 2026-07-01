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
  windColor,
  withAlpha,
  windFlowEnd,
  arrowheadTriangle,
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
  /** Heat-blob radius in meters, sized so adjacent grid points' circles
   *  overlap and fully tile the visible map. */
  heatRadiusMeters: number;
}

const AnimatedLine = Animated.createAnimatedComponent(SvgLine);
const METERS_PER_DEGREE_LAT = 111320;

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
  // blobs stay correctly overlapped (covering the whole view) as you zoom.
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

        {size.width > 0 && size.height > 0 && (heatPoints.length > 0 || windLines.length > 0) && (
          <Svg
            width={size.width}
            height={size.height}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {heatPoints.map((p) => (
              <SvgCircle
                key={p.key}
                cx={p.pos.x}
                cy={p.pos.y}
                r={heatRadiusPx}
                fill={withAlpha(p.color, 0.5)}
                stroke="none"
              />
            ))}
            {windLines.map((w) => (
              <React.Fragment key={w.key}>
                <AnimatedLine
                  x1={w.start.x}
                  y1={w.start.y}
                  x2={w.tip.x}
                  y2={w.tip.y}
                  stroke={withAlpha(w.color, w.opacity)}
                  strokeWidth={w.width}
                  strokeLinecap="round"
                  strokeDasharray="10,8"
                  strokeDashoffset={flowAnim}
                />
                <SvgPolygon
                  points={`${w.a0.x},${w.a0.y} ${w.a1.x},${w.a1.y} ${w.a2.x},${w.a2.y}`}
                  fill={withAlpha(w.color, Math.min(1, w.opacity + 0.12))}
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
