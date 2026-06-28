import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
  PanResponder,
  ScrollView,
} from "react-native";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Plus,
  Minus,
  Locate,
  CloudRain,
  Wind,
  Thermometer,
  Sun,
  Navigation,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";
import { fetchWeatherGrid, WeatherGridPoint } from "@/utils/weatherApi";
import { TempUnit } from "@/types/weather";

// ── Types ──────────────────────────────────────────────────────────────────

type MapLayer = "radar" | "wind" | "temperature" | "uv";

interface RadarFrame {
  path: string;
  time: number;
}

interface Props {
  lat: number;
  lon: number;
  compact?: boolean;
  tempUnit?: TempUnit;
  onExpand?: () => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TILE_SIZE = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 14;
// RainViewer free tile cap
const MAX_NATIVE_RADAR_ZOOM = 6;
const DEFAULT_ZOOM = 8;

// ── Tile Utilities ─────────────────────────────────────────────────────────

function normalizeTile(x: number, y: number, zoom: number): { x: number; y: number; valid: boolean } {
  const n = Math.pow(2, zoom);
  return {
    x: ((x % n) + n) % n,
    y: Math.max(0, Math.min(y, n - 1)),
    valid: y >= 0 && y < n,
  };
}

function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

function tileToLatLon(tx: number, ty: number, zoom: number): { lat: number; lon: number } {
  const n = Math.pow(2, zoom);
  const lon = (tx / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n)));
  return { lat: (latRad * 180) / Math.PI, lon };
}

function getBaseMapUri(zoom: number, x: number, y: number, variant: "base" | "labels"): string {
  const n = normalizeTile(x, y, zoom);
  if (!n.valid) return "";
  const layer = variant === "base" ? "dark_all" : "dark_only_labels";
  return `https://basemaps.cartocdn.com/${layer}/${zoom}/${n.x}/${n.y}@2x.png`;
}

function getRadarTileUri(framePath: string, zoom: number, x: number, y: number): string | null {
  const n = normalizeTile(x, y, zoom);
  if (!n.valid) return null;
  return `https://tilecache.rainviewer.com${framePath}/${TILE_SIZE}/${zoom}/${n.x}/${n.y}/8/1_1.png`;
}

function formatRadarTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Color Helpers ──────────────────────────────────────────────────────────

function tempColor(temp: number, unit: TempUnit): string {
  // Normalize to Celsius for color scale
  const c = unit === "F" ? (temp - 32) * 5 / 9 : temp;
  if (c <= -20) return "rgba(140, 120, 255, 0.82)";
  if (c <= -10) return "rgba(100, 150, 255, 0.82)";
  if (c <= 0) return "rgba(70, 180, 255, 0.82)";
  if (c <= 10) return "rgba(70, 210, 220, 0.82)";
  if (c <= 20) return "rgba(80, 230, 120, 0.82)";
  if (c <= 25) return "rgba(240, 230, 50, 0.82)";
  if (c <= 30) return "rgba(255, 180, 40, 0.82)";
  if (c <= 35) return "rgba(255, 120, 30, 0.85)";
  if (c <= 40) return "rgba(255, 60, 30, 0.88)";
  return "rgba(220, 30, 70, 0.90)";
}

function uvColor(uv: number): string {
  if (uv <= 2) return "rgba(80, 230, 120, 0.78)";
  if (uv <= 5) return "rgba(240, 230, 50, 0.78)";
  if (uv <= 7) return "rgba(255, 160, 30, 0.80)";
  if (uv <= 10) return "rgba(255, 60, 40, 0.83)";
  return "rgba(191, 64, 255, 0.85)";
}

function windColor(speed: number, unit: TempUnit): string {
  const mph = unit === "C" ? speed * 0.621 : speed;
  if (mph <= 5) return "rgba(120, 210, 255, 0.75)";
  if (mph <= 15) return "rgba(100, 190, 255, 0.78)";
  if (mph <= 25) return "rgba(240, 230, 50, 0.80)";
  if (mph <= 40) return "rgba(255, 160, 40, 0.82)";
  return "rgba(255, 60, 60, 0.85)";
}

// ── Wind Arrow Component ───────────────────────────────────────────────────

function WindArrow({ speed, direction, unit }: { speed: number; direction: number; unit: TempUnit }) {
  const arrowLen = Math.max(8, Math.min(40, speed * 1.6));
  const deg = direction; // 0=N, 90=E, etc.
  const rad = ((deg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad) * arrowLen;
  const dy = Math.sin(rad) * arrowLen;

  const lineStyle: any = {
    position: "absolute",
    width: arrowLen,
    height: 2,
    backgroundColor: windColor(speed, unit),
    borderRadius: 1,
    top: "50%" as const,
    left: "50%" as const,
    marginTop: -1,
    marginLeft: -arrowLen / 2,
  };

  return (
    <View style={{ width: arrowLen * 1.6, height: arrowLen * 1.6, alignItems: "center", justifyContent: "center" }}>
      <View style={[lineStyle, { transform: [{ rotate: `${deg}deg` }] }]} />
      {/* Arrowhead */}
      <View
        style={{
          position: "absolute",
          top: "50%" as const,
          left: "50%" as const,
          width: 0,
          height: 0,
          marginTop: -Math.sin(rad) * arrowLen * 0.4 - 4,
          marginLeft: Math.cos(rad) * arrowLen * 0.4 - 3,
          borderLeftWidth: 4,
          borderRightWidth: 4,
          borderBottomWidth: 7,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: windColor(speed, unit),
          transform: [{ rotate: `${deg + 90}deg` }],
        }}
      />
    </View>
  );
}

// ── Grid Overlay Component ──────────────────────────────────────────────────

function GridOverlay({
  grid,
  layer,
  unit,
  tileGridWidth,
  tileGridHeight,
  renderRadius,
}: {
  grid: WeatherGridPoint[];
  layer: MapLayer;
  unit: TempUnit;
  tileGridWidth: number;
  tileGridHeight: number;
  renderRadius: number;
}) {
  if (grid.length === 0) return null;

  const density = Math.round(Math.sqrt(grid.length));
  const cellW = tileGridWidth / density;
  const cellH = tileGridHeight / density;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {grid.map((pt, i) => {
        const row = Math.floor(i / density);
        const col = i % density;
        const left = col * cellW + cellW / 2;
        const top = row * cellH + cellH / 2;

        if (layer === "temperature") {
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: left - cellW / 2,
                top: top - cellH / 2,
                width: cellW,
                height: cellH,
                backgroundColor: tempColor(pt.temp, unit),
                borderRadius: 2,
              }}
            />
          );
        }

        if (layer === "uv") {
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: left - cellW / 2,
                top: top - cellH / 2,
                width: cellW,
                height: cellH,
                backgroundColor: uvColor(pt.uvIndex),
                borderRadius: 2,
              }}
            />
          );
        }

        if (layer === "wind") {
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: left - cellW / 2,
                top: top - cellH / 2,
                width: cellW,
                height: cellH,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <WindArrow speed={pt.windSpeed} direction={pt.windDirection} unit={unit} />
              {cellW > 50 && (
                <Text
                  style={{
                    position: "absolute",
                    bottom: 2,
                    fontSize: 9,
                    fontWeight: "700",
                    color: windColor(pt.windSpeed, unit),
                  }}
                >
                  {pt.windSpeed}
                </Text>
              )}
            </View>
          );
        }

        return null;
      })}
    </View>
  );
}

// ── Main Widget ────────────────────────────────────────────────────────────

export default function RadarMapWidget({
  lat,
  lon,
  compact = false,
  tempUnit = "F",
  onExpand,
  onPanStart,
  onPanEnd,
}: Props) {
  // Radar state
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Map state
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM);
  const [activeLayer, setActiveLayer] = useState<MapLayer>("radar");

  // Pan tracking – cumulative world-pixel offset
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const panStartRef = useRef({ x: 0, y: 0 });
  // Animated value for smooth gesture tracking
  const gesturePan = useRef(new Animated.ValueXY()).current;

  // Grid overlay state
  const [gridData, setGridData] = useState<WeatherGridPoint[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const gridFetchId = useRef(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const renderRadius = compact ? 3 : 4;
  const renderGridSize = renderRadius * 2 + 1;
  const isRadarLayer = activeLayer === "radar";

  // Compute effective tile center including pan offset
  const effectiveCenter = useMemo(() => {
    const tile = latLonToTile(lat, lon, zoomLevel);
    const shiftX = Math.floor(panOffsetX / TILE_SIZE);
    const shiftY = Math.floor(panOffsetY / TILE_SIZE);
    return { x: tile.x + shiftX, y: tile.y + shiftY };
  }, [lat, lon, zoomLevel, panOffsetX, panOffsetY]);

  // Remainder pixel offset for tile positioning
  const pixelRemainder = useMemo(() => ({
    x: ((panOffsetX % TILE_SIZE) + TILE_SIZE) % TILE_SIZE,
    y: ((panOffsetY % TILE_SIZE) + TILE_SIZE) % TILE_SIZE,
  }), [panOffsetX, panOffsetY]);

  // Tile offsets array
  const tileOffsets = useMemo(() => {
    const result: Array<{ dx: number; dy: number }> = [];
    for (let dy = -renderRadius; dy <= renderRadius; dy++) {
      for (let dx = -renderRadius; dx <= renderRadius; dx++) {
        result.push({ dx, dy });
      }
    }
    return result;
  }, [renderRadius]);

  // ── PanResponder ──────────────────────────────────────────────────────────

  const onPanStartRef = useRef(onPanStart);
  const onPanEndRef = useRef(onPanEnd);
  onPanStartRef.current = onPanStart;
  onPanEndRef.current = onPanEnd;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        onPanStartRef.current?.();
        panStartRef.current = { x: panOffsetX, y: panOffsetY };
        gesturePan.setOffset({ x: 0, y: 0 });
        gesturePan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gs) => {
        gesturePan.setValue({ x: gs.dx, y: gs.dy });
      },
      onPanResponderRelease: (_, gs) => {
        const newX = panStartRef.current.x + gs.dx;
        const newY = panStartRef.current.y + gs.dy;
        setPanOffsetX(newX);
        setPanOffsetY(newY);
        gesturePan.setValue({ x: 0, y: 0 });
        gesturePan.setOffset({ x: 0, y: 0 });
        onPanEndRef.current?.();
      },
      onPanResponderTerminate: () => {
        gesturePan.setValue({ x: 0, y: 0 });
        gesturePan.setOffset({ x: 0, y: 0 });
        onPanEndRef.current?.();
      },
    })
  ).current;

  // ── Radar frames fetching ─────────────────────────────────────────────────

  const fetchRadarFrames = useCallback(async (retries = 3) => {
    setLoading(true);
    setError(false);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timeout);
        if (!res.ok) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const radarFrames: RadarFrame[] = [];
        if (data.radar?.past) {
          data.radar.past.forEach((f: { path: string; time: number }) =>
            radarFrames.push({ path: f.path, time: f.time })
          );
        }
        if (data.radar?.nowcast) {
          data.radar.nowcast.forEach((f: { path: string; time: number }) =>
            radarFrames.push({ path: f.path, time: f.time })
          );
        }
        if (radarFrames.length > 0) {
          setFrames(radarFrames);
          setFrameIndex(radarFrames.length - 1);
          setLoading(false);
          return;
        }
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Radar] Attempt ${attempt}: ${msg}`);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
      }
    }
    setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRadarFrames();
  }, [fetchRadarFrames]);

  // ── Grid data fetching (wind/temp/UV) ────────────────────────────────────

  const fetchGrid = useCallback(async () => {
    if (activeLayer === "radar") {
      setGridData([]);
      return;
    }
    const fetchId = ++gridFetchId.current;
    setGridLoading(true);
    try {
      const density = compact ? 3 : 5;
      const grid = await fetchWeatherGrid(lat, lon, zoomLevel, renderRadius, density, tempUnit);
      if (fetchId === gridFetchId.current) {
        setGridData(grid);
      }
    } catch (err) {
      console.warn("[Radar] Grid fetch failed:", err);
    } finally {
      if (fetchId === gridFetchId.current) {
        setGridLoading(false);
      }
    }
  }, [activeLayer, lat, lon, zoomLevel, renderRadius, compact, tempUnit]);

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  // Refetch grid on pan with debounce
  const fetchGridRef = useRef(fetchGrid);
  fetchGridRef.current = fetchGrid;
  const gridDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeLayer === "radar") return;
    if (gridDebounceRef.current) clearTimeout(gridDebounceRef.current);
    gridDebounceRef.current = setTimeout(() => {
      fetchGridRef.current();
    }, 500);
    return () => {
      if (gridDebounceRef.current) clearTimeout(gridDebounceRef.current);
    };
  }, [panOffsetX, panOffsetY, activeLayer]);

  // ── Fade-in animation ────────────────────────────────────────────────────

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ── Playback timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % frames.length);
      }, 600);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, frames.length]);

  // ── Controls ──────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying((prev) => !prev);
  }, []);

  const stepBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFrameIndex((prev) => (prev - 1 + frames.length) % frames.length);
    setIsPlaying(false);
  }, [frames.length]);

  const stepForward = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFrameIndex((prev) => (prev + 1) % frames.length);
    setIsPlaying(false);
  }, [frames.length]);

  const handleZoomIn = useCallback(() => {
    if (zoomLevel >= MAX_ZOOM) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel((prev) => Math.min(prev + 1, MAX_ZOOM));
    setPanOffsetX(0);
    setPanOffsetY(0);
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (zoomLevel <= MIN_ZOOM) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel((prev) => Math.max(prev - 1, MIN_ZOOM));
    setPanOffsetX(0);
    setPanOffsetY(0);
  }, [zoomLevel]);

  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPanOffsetX(0);
    setPanOffsetY(0);
  }, []);

  const handleLayerChange = useCallback((layer: MapLayer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveLayer(layer);
  }, []);

  const currentFrame = frames[frameIndex];

  // ── Layer selector ────────────────────────────────────────────────────────

  const layerButtons: Array<{ key: MapLayer; label: string }> = [
    { key: "radar", label: "Radar" },
    { key: "wind", label: "Wind" },
    { key: "temperature", label: "Temp" },
    { key: "uv", label: "UV" },
  ];

  const layerIcon = (key: MapLayer, active: boolean) => {
    const color = active ? WeatherColors.accent : WeatherColors.textTertiary;
    const sz = 13;
    switch (key) {
      case "radar": return <CloudRain size={sz} color={color} strokeWidth={2} />;
      case "wind": return <Wind size={sz} color={color} strokeWidth={2} />;
      case "temperature": return <Thermometer size={sz} color={color} strokeWidth={2} />;
      case "uv": return <Sun size={sz} color={color} strokeWidth={2} />;
    }
  };

  // ── Render: Loading ───────────────────────────────────────────────────────

  if (loading && isRadarLayer) {
    return (
      <Animated.View style={[compact ? styles.compactCard : styles.card, { opacity: fadeAnim }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={WeatherColors.accent} />
          <Text style={styles.loadingText}>Loading radar...</Text>
        </View>
      </Animated.View>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────────────

  if (error && isRadarLayer) {
    return (
      <Animated.View style={[compact ? styles.compactCard : styles.card, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.loadingContainer} onPress={() => fetchRadarFrames()}>
          <Text style={styles.errorText}>Radar unavailable</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Render: Main ──────────────────────────────────────────────────────────

  const tileGridPixelW = TILE_SIZE * renderGridSize;
  const tileGridPixelH = TILE_SIZE * renderGridSize;

  return (
    <Animated.View style={[compact ? styles.compactCard : styles.card, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {compact
            ? activeLayer === "radar" ? "Live Radar" : `${activeLayer.charAt(0).toUpperCase() + activeLayer.slice(1)} Map`
            : activeLayer === "radar"
              ? "Precipitation Radar"
              : `${activeLayer.charAt(0).toUpperCase() + activeLayer.slice(1)} Map`}
        </Text>
        <View style={styles.headerRight}>
          {currentFrame && isRadarLayer && (
            <Text style={styles.radarTime}>{formatRadarTime(currentFrame.time)}</Text>
          )}
          {compact && onExpand && (
            <TouchableOpacity onPress={onExpand} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Maximize2 size={14} color={WeatherColors.textTertiary} strokeWidth={1.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Layer selector pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.layerBar}
        contentContainerStyle={styles.layerBarContent}
      >
        {layerButtons.map((btn) => {
          const active = activeLayer === btn.key;
          return (
            <TouchableOpacity
              key={btn.key}
              style={[styles.layerPill, active && styles.layerPillActive]}
              onPress={() => handleLayerChange(btn.key)}
              activeOpacity={0.7}
            >
              {layerIcon(btn.key, active)}
              <Text style={[styles.layerPillLabel, active && styles.layerPillLabelActive]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Map container */}
      <View style={[styles.mapContainer, compact && styles.compactMapContainer]} collapsable={false}>
        {/* Tile grid + pan handler */}
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          {/* Outer animated view for gesture translation only */}
          <Animated.View
            pointerEvents="none"
            style={{
              transform: [
                { translateX: gesturePan.x },
                { translateY: gesturePan.y },
              ],
            }}
          >
          {/* Inner view positioned by accumulated pan offset */}
          <View
            pointerEvents="none"
            style={[
              styles.tileGrid,
              {
                width: tileGridPixelW,
                height: tileGridPixelH,
                left: -pixelRemainder.x,
                top: -pixelRemainder.y,
              },
            ]}
          >
            {tileOffsets.map((offset, i) => {
              const tileX = effectiveCenter.x + offset.dx;
              const tileY = effectiveCenter.y + offset.dy;
              const baseUri = getBaseMapUri(zoomLevel, tileX, tileY, "base");
              const labelsUri = getBaseMapUri(zoomLevel, tileX, tileY, "labels");
              const radarUri = isRadarLayer && currentFrame
                ? getRadarTileUri(currentFrame.path, zoomLevel, tileX, tileY)
                : null;

              return (
                <View
                  key={`tile-${zoomLevel}-${tileX}-${tileY}-${panOffsetX}-${panOffsetY}`}
                  style={[
                    styles.tile,
                    {
                      left: (offset.dx + renderRadius) * TILE_SIZE,
                      top: (offset.dy + renderRadius) * TILE_SIZE,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                    },
                  ]}
                >
                  {baseUri ? (
                    <Image source={{ uri: baseUri }} style={[styles.tileImage, styles.baseLayer]} resizeMode="cover" />
                  ) : null}
                  {labelsUri && zoomLevel >= 3 ? (
                    <Image source={{ uri: labelsUri }} style={[styles.tileImage, styles.labelLayer]} resizeMode="cover" />
                  ) : null}
                  {radarUri ? (
                    <View style={styles.radarClip} pointerEvents="none">
                      <Image
                        source={{ uri: radarUri }}
                        style={[styles.tileImage, styles.radarLayer]}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}

            {/* Grid overlay for wind/temp/UV */}
            {!isRadarLayer && gridData.length > 0 && (
              <GridOverlay
                grid={gridData}
                layer={activeLayer}
                unit={tempUnit}
                tileGridWidth={tileGridPixelW}
                tileGridHeight={tileGridPixelH}
                renderRadius={renderRadius}
              />
            )}

            {/* Center dot */}
            <View style={styles.centerDot} pointerEvents="none">
              <View style={styles.dot} />
            </View>
          </View>
          </Animated.View>
        </View>

        {/* Map chrome overlays */}
        <View style={styles.mapDepthOverlay} pointerEvents="none" />
        <View style={styles.localGridOverlay} pointerEvents="none" />
        <View style={styles.mapBadge} pointerEvents="none">
          <Text style={styles.mapBadgeText}>
            {activeLayer === "radar" ? "HYPER-LOCAL" : activeLayer.toUpperCase()} • {zoomLevel}x
          </Text>
        </View>

        {/* Grid loading indicator */}
        {gridLoading && !isRadarLayer && (
          <View style={styles.gridLoading} pointerEvents="none">
            <ActivityIndicator size="small" color={WeatherColors.accent} />
          </View>
        )}

        {/* Zoom + recenter controls */}
        <View style={styles.mapControls} pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleZoomIn}
            style={[styles.mapControlBtn, zoomLevel >= MAX_ZOOM && styles.mapControlDisabled]}
            activeOpacity={0.7}
          >
            <Plus size={16} color={zoomLevel >= MAX_ZOOM ? "rgba(255,255,255,0.3)" : "#fff"} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleZoomOut}
            style={[styles.mapControlBtn, zoomLevel <= MIN_ZOOM && styles.mapControlDisabled]}
            activeOpacity={0.7}
          >
            <Minus size={16} color={zoomLevel <= MIN_ZOOM ? "rgba(255,255,255,0.3)" : "#fff"} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRecenter} style={styles.mapControlBtn} activeOpacity={0.7}>
            <Locate size={16} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Layer legend */}
      {isRadarLayer && !compact && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "rgba(0, 240, 255, 0.85)" }]} />
            <Text style={styles.legendText}>Light</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "rgba(57, 255, 20, 0.85)" }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "rgba(240, 255, 0, 0.9)" }]} />
            <Text style={styles.legendText}>Heavy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "rgba(255, 61, 113, 0.95)" }]} />
            <Text style={styles.legendText}>Extreme</Text>
          </View>
        </View>
      )}

      {!isRadarLayer && !compact && (
        <View style={styles.legendRow}>
          <Text style={styles.legendHint}>
            {activeLayer === "temperature"
              ? "Cold ▸ Blue    Hot ▸ Red"
              : activeLayer === "uv"
                ? "Low ▸ Green    Extreme ▸ Purple"
                : "Calm ▸ Blue    Strong ▸ Red"}
          </Text>
        </View>
      )}

      {/* Radar playback bar (only for radar layer) */}
      {isRadarLayer && (
        <>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, {
                width: frames.length > 0 ? `${((frameIndex + 1) / frames.length) * 100}%` : "0%",
              }]}
            />
          </View>
          <View style={compact ? styles.compactControls : styles.controls}>
            <TouchableOpacity onPress={stepBack} style={compact ? styles.compactControlBtn : styles.controlBtn}>
              <SkipBack size={compact ? 14 : 20} color={WeatherColors.textPrimary} strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={compact ? styles.compactPlayBtn : styles.playBtn}>
              {isPlaying ? (
                <Pause size={compact ? 16 : 24} color="#0B1A2E" strokeWidth={2} fill="#0B1A2E" />
              ) : (
                <Play size={compact ? 16 : 24} color="#0B1A2E" strokeWidth={2} fill="#0B1A2E" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={stepForward} style={compact ? styles.compactControlBtn : styles.controlBtn}>
              <SkipForward size={compact ? 14 : 20} color={WeatherColors.textPrimary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </Animated.View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 16,
    overflow: "hidden" as const,
  },
  compactCard: {
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 12,
    overflow: "hidden" as const,
  },
  loadingContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: { fontSize: 13, color: WeatherColors.textSecondary },
  errorText: { fontSize: 14, fontWeight: "600" as const, color: WeatherColors.textSecondary },
  retryText: { fontSize: 12, color: WeatherColors.accent },

  // Header
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  title: { fontSize: 14, fontWeight: "600" as const, color: WeatherColors.textPrimary },
  headerRight: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
  radarTime: { fontSize: 12, fontWeight: "600" as const, color: WeatherColors.accent },

  // Layer bar
  layerBar: { marginBottom: 10 },
  layerBarContent: { gap: 6, paddingRight: 4 },
  layerPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  layerPillActive: {
    backgroundColor: "rgba(0, 201, 232, 0.12)",
    borderColor: "rgba(0, 201, 232, 0.28)",
  },
  layerPillLabel: { fontSize: 11, fontWeight: "600" as const, color: WeatherColors.textTertiary },
  layerPillLabelActive: { color: WeatherColors.accent },

  // Map
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden" as const,
    aspectRatio: 1,
    backgroundColor: "#071017",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  compactMapContainer: { aspectRatio: 1.5 },
  tileGrid: { position: "relative" as const },
  tile: { position: "absolute" as const },
  tileImage: { width: "100%" as const, height: "100%" as const, position: "absolute" as const, top: 0, left: 0 },
  baseLayer: { opacity: 0.92 },
  labelLayer: { opacity: 0.88 },
  radarClip: {
    position: "absolute" as const,
    top: 0, left: 0,
    width: "100%" as const,
    height: "100%" as const,
    overflow: "hidden" as const,
  },
  radarLayer: { opacity: 0.96 },

  // Decorative overlays
  mapDepthOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 240, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.18)",
  },
  localGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  mapBadge: {
    position: "absolute" as const,
    left: 8, top: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(2, 8, 14, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.22)",
  },
  mapBadgeText: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 0.8,
    color: "rgba(214, 255, 255, 0.86)",
  },
  gridLoading: {
    position: "absolute" as const,
    top: 10, right: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    padding: 6,
  },

  // Center dot
  centerDot: { ...StyleSheet.absoluteFillObject, alignItems: "center" as const, justifyContent: "center" as const },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: WeatherColors.accent,
    borderWidth: 2, borderColor: "#fff",
  },

  // Map controls
  mapControls: { position: "absolute" as const, right: 8, bottom: 8, gap: 6 },
  mapControlBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  mapControlDisabled: { opacity: 0.4 },

  // Legend
  legendRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  legendItem: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: WeatherColors.textTertiary },
  legendHint: { fontSize: 10, color: WeatherColors.textTertiary, textAlign: "center" as const },

  // Progress bar
  progressBar: {
    height: 3, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 2,
    marginTop: 10, marginBottom: 10, overflow: "hidden" as const,
  },
  progressFill: { height: "100%" as const, backgroundColor: WeatherColors.accent, borderRadius: 2 },

  // Playback controls
  controls: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 24 },
  compactControls: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 16 },
  controlBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  compactControlBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  playBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: WeatherColors.accent,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  compactPlayBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: WeatherColors.accent,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
});
