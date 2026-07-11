import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polygon, Polyline, Overlay, Region } from "react-native-maps";
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
  ChevronDown,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";
import { fetchWeatherGrid, gridSpacingDegrees, WeatherGridPoint } from "@/utils/weatherApi";
import { TempUnit } from "@/types/weather";
import { latLonToTileXY, tileXYToLatLon } from "@/utils/mapProjection";
import {
  TEMPERATURE_STOPS_C,
  UV_STOPS_EXPORT,
  windColorSmooth,
} from "@/utils/weatherMapVisuals";
import WebSlippyMap from "@/components/WebSlippyMap";
import WindFlowOverlay from "@/components/WindFlowOverlay";
import ScalarFieldOverlay from "@/components/ScalarFieldOverlay";

// ── Inline temp/UV legend components ───────────────────────────────────────

function TemperatureLegend({ tempUnit }: { tempUnit: TempUnit }) {
  return (
    <View style={styles.legendScaleRow}>
      <Text style={styles.legendScaleLabel}>Cold</Text>
      <View style={styles.legendScaleBar}>
        {TEMPERATURE_STOPS_C.map((s, i, arr) => {
          const next = arr[i + 1];
          if (!next) return null;
          return (
            <View
              key={i}
              style={[
                styles.legendScaleSegment,
                { backgroundColor: `rgb(${s.rgb[0]}, ${s.rgb[1]}, ${s.rgb[2]})`, flex: 1 },
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.legendScaleLabel}>Hot</Text>
    </View>
  );
}

function UVLegend() {
  return (
    <View style={styles.legendScaleRow}>
      <Text style={styles.legendScaleLabel}>Low</Text>
      <View style={styles.legendScaleBar}>
        {UV_STOPS_EXPORT.map((s, i, arr) => {
          const next = arr[i + 1];
          if (!next) return null;
          return (
            <View
              key={i}
              style={[
                styles.legendScaleSegment,
                { backgroundColor: `rgb(${s.rgb[0]}, ${s.rgb[1]}, ${s.rgb[2]})`, flex: 1 },
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.legendScaleLabel}>Extreme</Text>
    </View>
  );
}

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
  fullscreen?: boolean;
  tempUnit?: TempUnit;
  onExpand?: () => void;
  onClose?: () => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const INITIAL_DELTA = 0.4;
const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 18;
/**
 * RainViewer's free tile API only rasterizes radar composites up to zoom 7
 * (confirmed by probing the tile server directly — zoom 8+ ALWAYS returns a
 * "Zoom Level Not Supported" placeholder image, regardless of which tile x/y
 * is requested). We always fetch tiles at min(currentZoom, RADAR_MAX_ZOOM),
 * then place them on the map using their real geographic bounds — so zooming
 * in further just stretches the same tile over a larger area (standard
 * slippy-map "overzoom" behavior) instead of ever requesting an unsupported
 * zoom level.
 */
const RADAR_MIN_ZOOM = 0;
const RADAR_MAX_ZOOM = 7;
/** The web preview can't load the Google Maps JS API (needs a billed API key), so
 *  web renders its own keyless slippy map instead of react-native-maps' MapView. */
const IS_WEB = Platform.OS === "web";
/** Grid sample density for each map layer, scaled up when the map is expanded
 *  to fullscreen (more room for numbers without clutter). Temp/UV points are
 *  rendered as edge-to-edge tiles (see tileCorners) sized from the spacing. */
const TEMP_UV_GRID_DENSITY_COMPACT = 7;
const TEMP_UV_GRID_DENSITY_FULL = 9;
const WIND_GRID_DENSITY_COMPACT = 6;
const WIND_GRID_DENSITY_FULL = 8;

function getGridDensity(layer: MapLayer, fullscreen: boolean): number {
  if (layer === "wind") return fullscreen ? WIND_GRID_DENSITY_FULL : WIND_GRID_DENSITY_COMPACT;
  return fullscreen ? TEMP_UV_GRID_DENSITY_FULL : TEMP_UV_GRID_DENSITY_COMPACT;
}

// ── Google Maps dark style ─────────────────────────────────────────────────

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3fc" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a2338" }] },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#4b6a9e" }],
  },
  {
    featureType: "administrative.province",
    elementType: "geometry.stroke",
    stylers: [{ color: "#3a5178" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0b1628" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4f6e9e" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a3f5c" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3c5278" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2e47" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5f7da3" }],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5f7da3" }],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function regionToZoom(longitudeDelta: number): number {
  const z = Math.round(Math.log2(360 / longitudeDelta));
  return Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, z));
}

function formatRadarTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Radar tile helpers ───────────────────────────────────────────────────

interface RadarOverlayTile {
  key: string;
  url: string;
  bounds: [[number, number], [number, number]];
  z: number;
  x: number;
  y: number;
}

/** Calculate which radar tiles cover the visible map region at a safe zoom level. */
function computeRadarTiles(
  region: Region,
  tileZoom: number,
  framePath: string
): RadarOverlayTile[] {
  const z = Math.min(RADAR_MAX_ZOOM, Math.max(RADAR_MIN_ZOOM, tileZoom));

  // Visible area corners
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLon = region.longitude - region.longitudeDelta / 2;
  const maxLon = region.longitude + region.longitudeDelta / 2;

  // Tile ranges covering visible area
  const topLeft = latLonToTileXY(maxLat, minLon, z);
  const bottomRight = latLonToTileXY(minLat, maxLon, z);

  const minX = Math.floor(Math.min(topLeft.x, bottomRight.x));
  const maxX = Math.floor(Math.max(topLeft.x, bottomRight.x));
  const minY = Math.floor(Math.min(topLeft.y, bottomRight.y));
  const maxY = Math.floor(Math.max(topLeft.y, bottomRight.y));

  const tiles: RadarOverlayTile[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const nw = tileXYToLatLon(x, y, z);
      const se = tileXYToLatLon(x + 1, y + 1, z);
      // react-native-maps' Overlay `bounds` prop requires [southwest, northeast]
      // (i.e. [[minLat, minLon], [maxLat, maxLon]]) — NOT [northWest, southEast] as
      // the docs claim. Passing it the other way crashes native with
      // "southern latitude exceeds northern latitude".
      tiles.push({
        key: `radar-${z}-${x}-${y}`,
        url: `https://tilecache.rainviewer.com${framePath}/256/${z}/${x}/${y}/8/1_1.png`,
        bounds: [
          [se.lat, nw.lon],
          [nw.lat, se.lon],
        ],
        z,
        x,
        y,
      });
    }
  }
  return tiles;
}

// ── Main Widget ────────────────────────────────────────────────────────────

export default function RadarMapWidget({
  lat,
  lon,
  compact = false,
  fullscreen = false,
  tempUnit = "F",
  onExpand,
  onClose,
  onPanStart,
  onPanEnd,
}: Props) {
  // ── Radar state ──────────────────────────────────────────────────────────

  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // ── Map state ────────────────────────────────────────────────────────────

  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: lat,
    longitude: lon,
    latitudeDelta: INITIAL_DELTA,
    longitudeDelta: INITIAL_DELTA,
  });
  const [currentZoom, setCurrentZoom] = useState<number>(() => regionToZoom(INITIAL_DELTA));
  const [activeLayer, setActiveLayer] = useState<MapLayer>("radar");

  // ── Grid overlay state ───────────────────────────────────────────────────

  const [gridData, setGridData] = useState<WeatherGridPoint[]>([]);
  const [gridError, setGridError] = useState(false);
  const [gridLoading, setGridLoading] = useState(false);
  const gridFetchId = useRef(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRadarLayer = activeLayer === "radar";
  const renderRadius = 4;

  // ── Wind animation phase (native only — web drives its own particle/flow
  // animation loop). Loops 0→1 continuously while the wind layer is active,
  // used to slide a bright "comet" segment along each arrow's track so the
  // field reads as constantly flowing instead of static.
  // Size of the native map container so the wind WebView overlay can match
  // the same Mercator projection and canvas size as the MapView underneath.
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  // ── Radar overlay tiles ──────────────────────────────────────────────────
  const [radarTiles, setRadarTiles] = useState<RadarOverlayTile[]>([]);

  // ── Refs for callbacks ───────────────────────────────────────────────────

  const onPanStartRef = useRef(onPanStart);
  const onPanEndRef = useRef(onPanEnd);
  onPanStartRef.current = onPanStart;
  onPanEndRef.current = onPanEnd;

  // ── Radar frames fetching ───────────────────────────────────────────────

  const fetchRadarFrames = useCallback(async (retries = 3) => {
    setLoading(true);
    setError(false);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(
          "https://api.rainviewer.com/public/weather-maps.json",
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }
        );
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

  // ── Grid data fetching ───────────────────────────────────────────────────

  const fetchGrid = useCallback(async () => {
    if (activeLayer === "radar") {
      setGridData([]);
      setGridError(false);
      return;
    }
    const fetchId = ++gridFetchId.current;
    setGridLoading(true);
    setGridError(false);
    try {
      const density = getGridDensity(activeLayer, fullscreen);
      const grid = await fetchWeatherGrid(
        region.latitude,
        region.longitude,
        currentZoom,
        renderRadius,
        density,
        tempUnit
      );
      if (fetchId === gridFetchId.current) {
        // Use the 'valid' flag to separate real data from API failures.
        // Zero IS a valid weather reading (calm wind, 0 UV at night, 0°F).
        const valid = grid.filter((p) => p.valid);
        if (valid.length === 0 && grid.length > 0) {
          setGridError(true);
          setGridData([]);
        } else {
          setGridData(valid);
          setGridError(false);
        }
      }
    } catch (err) {
      console.warn("[Radar] Grid fetch failed:", err);
      if (fetchId === gridFetchId.current) {
        setGridError(true);
      }
    } finally {
      if (fetchId === gridFetchId.current) {
        setGridLoading(false);
      }
    }
  }, [activeLayer, region.latitude, region.longitude, currentZoom, renderRadius, tempUnit, fullscreen]);

  useEffect(() => {
    // Debounce so rapid pan/zoom doesn't fire a grid request on every
    // intermediate step — Open-Meteo enforces a per-minute rate limit, and
    // firing on every tiny region change was prone to tripping it.
    if (gridDebounceRef.current) clearTimeout(gridDebounceRef.current);
    gridDebounceRef.current = setTimeout(() => {
      fetchGrid();
    }, 350);
    return () => {
      if (gridDebounceRef.current) clearTimeout(gridDebounceRef.current);
    };
  }, [fetchGrid]);

  // ── Fade-in animation ────────────────────────────────────────────────────

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ── Playback timer ──────────────────────────────────────────────────────

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

  // ── Map event handlers ───────────────────────────────────────────────────

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    setCurrentZoom(regionToZoom(newRegion.longitudeDelta));
  }, []);

  const handlePanDrag = useCallback(() => {
    onPanStartRef.current?.();
    if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
    panTimeoutRef.current = setTimeout(() => {
      onPanEndRef.current?.();
    }, 400);
  }, []);

  // ── Controls ─────────────────────────────────────────────────────────────

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDelta = region.longitudeDelta / 2;
    if (IS_WEB) {
      const newRegion = { ...region, latitudeDelta: newDelta, longitudeDelta: newDelta };
      setRegion(newRegion);
      setCurrentZoom(regionToZoom(newDelta));
      return;
    }
    mapRef.current?.animateToRegion(
      {
        ...region,
        latitudeDelta: newDelta,
        longitudeDelta: newDelta,
      },
      300
    );
  }, [region]);

  const handleZoomOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDelta = region.longitudeDelta * 2;
    if (IS_WEB) {
      const newRegion = { ...region, latitudeDelta: newDelta, longitudeDelta: newDelta };
      setRegion(newRegion);
      setCurrentZoom(regionToZoom(newDelta));
      return;
    }
    mapRef.current?.animateToRegion(
      {
        ...region,
        latitudeDelta: newDelta,
        longitudeDelta: newDelta,
      },
      300
    );
  }, [region]);

  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (IS_WEB) {
      const newRegion = {
        latitude: lat,
        longitude: lon,
        latitudeDelta: INITIAL_DELTA,
        longitudeDelta: INITIAL_DELTA,
      };
      setRegion(newRegion);
      setCurrentZoom(regionToZoom(INITIAL_DELTA));
      return;
    }
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lon,
        latitudeDelta: INITIAL_DELTA,
        longitudeDelta: INITIAL_DELTA,
      },
      350
    );
  }, [lat, lon]);

  const handleLayerChange = useCallback((layer: MapLayer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveLayer(layer);
  }, []);

  const currentFrame = frames[frameIndex];

  // ── Radar overlay tiles computation (must be after currentFrame decl) ───
  // Always fetch at the clamped (supported) zoom, but the tiles carry real
  // geographic bounds so they render correctly (just stretched) at ANY
  // current map zoom -- this is what makes overzoom work.
  useEffect(() => {
    if (!isRadarLayer || !currentFrame) {
      setRadarTiles([]);
      return;
    }
    const z = Math.min(RADAR_MAX_ZOOM, Math.max(RADAR_MIN_ZOOM, currentZoom));
    const tiles = computeRadarTiles(region, z, currentFrame.path);
    setRadarTiles(tiles);
  }, [isRadarLayer, currentFrame, currentZoom, region]);

  // Grid point spacing -> tile half-width so temp/UV tiles sit edge-to-edge
  // and fully cover the visible map with sharp borders between them.
  const gridDensity = useMemo(() => getGridDensity(activeLayer, fullscreen), [activeLayer, fullscreen]);
  const gridSpacingDeg = useMemo(
    () => gridSpacingDegrees(currentZoom, renderRadius, gridDensity),
    [currentZoom, renderRadius, gridDensity]
  );
  // Half the point spacing (+2% so edges overlap a hair instead of leaving a
  // hairline gap from rounding) -> tiles sit flush against their neighbors.
  const tileHalfWidthDeg = (gridSpacingDeg / 2) * 1.02;
  const heatRadiusMeters = tileHalfWidthDeg * 111320;

  // ── Layer selector ──────────────────────────────────────────────────────

  const layerButtons: Array<{ key: MapLayer; label: string }> = [
    { key: "radar", label: "Radar" },
    { key: "wind", label: "Wind" },
    { key: "temperature", label: "Temp" },
    { key: "uv", label: "UV" },
  ];

  const layerActiveColor = useMemo<Record<MapLayer, string>>(
    () => ({
      radar: "#3DFF9A",
      wind: "#FFFFFF",
      temperature: "#FF3D71",
      uv: "#FF8C00",
    }),
    []
  );

  const layerPillActiveStyle = useCallback(
    (key: MapLayer) => {
      const hex = layerActiveColor[key];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.28)`,
      };
    },
    [layerActiveColor]
  );

  const layerIconColor = (key: MapLayer, active: boolean): string => {
    if (!active) return WeatherColors.textTertiary;
    return layerActiveColor[key];
  };

  const layerIcon = (key: MapLayer, active: boolean) => {
    const color = layerIconColor(key, active);
    const sz = 13;
    switch (key) {
      case "radar":
        return <CloudRain size={sz} color={color} strokeWidth={2} />;
      case "wind":
        return <Wind size={sz} color={color} strokeWidth={2} />;
      case "temperature":
        return <Thermometer size={sz} color={color} strokeWidth={2} />;
      case "uv":
        return <Sun size={sz} color={color} strokeWidth={2} />;
    }
  };

  // Layer pill buttons — computed once, reused by both the inline layer bar
  // and the fullscreen header row so they never drift out of sync.
  const layerPillButtons = layerButtons.map((btn) => {
    const active = activeLayer === btn.key;
    const activeColor = layerIconColor(btn.key, true);
    return (
      <TouchableOpacity
        key={btn.key}
        style={[styles.layerPill, active && layerPillActiveStyle(btn.key)]}
        onPress={() => handleLayerChange(btn.key)}
        activeOpacity={0.7}
      >
        {layerIcon(btn.key, active)}
        <Text style={[styles.layerPillLabel, active && { color: activeColor }]}>
          {btn.label}
        </Text>
      </TouchableOpacity>
    );
  });

  // ── Render: Loading ─────────────────────────────────────────────────────

  if (loading && isRadarLayer) {
    return (
      <Animated.View
        style={[
          compact ? styles.compactCard : styles.card,
          { opacity: fadeAnim },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={WeatherColors.accent} />
          <Text style={styles.loadingText}>Loading radar...</Text>
        </View>
      </Animated.View>
    );
  }

  // ── Render: Error ────────────────────────────────────────────────────────

  if (error && isRadarLayer) {
    return (
      <Animated.View
        style={[
          compact ? styles.compactCard : styles.card,
          { opacity: fadeAnim },
        ]}
      >
        <TouchableOpacity
          style={styles.loadingContainer}
          onPress={() => fetchRadarFrames()}
        >
          <Text style={styles.errorText}>Radar unavailable</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Render: Main ─────────────────────────────────────────────────────────

  return (
    <Animated.View
      style={[
        fullscreen
          ? styles.fullscreenWrapper
          : compact
          ? styles.compactCard
          : styles.card,
        { opacity: fadeAnim },
      ]}
    >
      {/* Header — hidden in fullscreen */}
      {!fullscreen && (
        <View style={styles.header}>
          <Text style={styles.title}>
            {compact
              ? activeLayer === "radar"
                ? "Live Radar"
                : `${
                    activeLayer.charAt(0).toUpperCase() + activeLayer.slice(1)
                  } Map`
              : activeLayer === "radar"
              ? "Precipitation Radar"
              : `${
                  activeLayer.charAt(0).toUpperCase() + activeLayer.slice(1)
                } Map`}
          </Text>
          <View style={styles.headerRight}>
            {currentFrame && isRadarLayer && (
              <Text style={styles.radarTime}>
                {formatRadarTime(currentFrame.time)}
              </Text>
            )}
            {compact && onExpand && (
              <TouchableOpacity
                onPress={onExpand}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Maximize2
                  size={14}
                  color={WeatherColors.textTertiary}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Layer selector pills */}
      {fullscreen ? (
        <View style={styles.fullscreenHeaderRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.layerBarFullscreenScroll}
            contentContainerStyle={styles.layerBarContent}
          >
            {layerPillButtons}
          </ScrollView>
          {onClose && (
            <TouchableOpacity
              style={styles.fullscreenCloseBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="radar-minimize"
            >
              <ChevronDown size={22} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.layerBar}
          contentContainerStyle={styles.layerBarContent}
        >
          {layerPillButtons}
        </ScrollView>
      )}

      {/* Map container */}
      <View
        style={[
          styles.mapContainer,
          compact && !fullscreen && styles.compactMapContainer,
          fullscreen && styles.fullscreenMapContainer,
        ]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setMapSize({ width, height });
        }}
      >
        {IS_WEB && (
          <WebSlippyMap
            region={region}
            zoom={currentZoom}
            onRegionChange={handleRegionChangeComplete}
            onPanStart={onPanStart}
            onPanEnd={onPanEnd}
            markerLat={lat}
            markerLon={lon}
            activeLayer={activeLayer}
            radarTiles={isRadarLayer && currentFrame ? radarTiles : []}
            gridData={gridData}
            tempUnit={tempUnit}
            heatRadiusMeters={heatRadiusMeters}
          />
        )}
        {!IS_WEB && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPanDrag={handlePanDrag}
          mapType="standard"
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={compact ? false : true}
          showsScale={!compact}
          toolbarEnabled={false}
          // Locked flat & north-up: this map renders data overlays (temp/UV/wind
          // grids) as ground-plane polygons. If tilted or rotated, those
          // overlays render in 3D perspective and look like a skewed
          // parallelogram, while base-map labels stay billboarded and look
          // fine — a very confusing, hard-to-diagnose visual bug otherwise.
          rotateEnabled={false}
          pitchEnabled={false}
          scrollEnabled
          zoomEnabled
          {...(Platform.OS === "ios"
            ? { userInterfaceStyle: "dark" as const }
            : { customMapStyle: darkMapStyle })}
        >
          {/* Radar overlay tiles — bounds are real geography, so this renders
              correctly (just scaled) at any zoom, no unsupported-zoom gating needed */}
          {isRadarLayer &&
            currentFrame &&
            Overlay &&
            radarTiles.map((tile) => (
              <Overlay
                key={tile.key}
                image={{ uri: tile.url }}
                bounds={tile.bounds}
                opacity={0.82}
              />
            ))}

          {/* Center location marker */}
          <Marker
            coordinate={{ latitude: lat, longitude: lon }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.centerDotOuter}>
              <View style={styles.centerDotInner} />
            </View>
          </Marker>

          {/* Native wind direction arrows at each grid point — rendered as
              MapView markers so they always show, even if the WebView particle
              overlay fails (common on cloud emulators). */}
          {activeLayer === "wind" && gridData.map((pt, i) => (
            <Marker
              key={`wind-native-${i}`}
              coordinate={{ latitude: pt.lat, longitude: pt.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.windArrowContainer}>
                <View
                  style={[
                    styles.windArrowCircle,
                    { borderColor: windColorSmooth(pt.windSpeed, tempUnit, 0.6) },
                  ]}
                >
                  <Text style={styles.windArrowSpeed}>{pt.windSpeed}</Text>
                </View>
                <View
                  style={[
                    styles.windArrowShaft,
                    {
                      backgroundColor: windColorSmooth(pt.windSpeed, tempUnit, 0.85),
                      transform: [{ rotate: `${pt.windDirection + 180}deg` }],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.windArrowHead,
                    {
                      borderBottomColor: windColorSmooth(pt.windSpeed, tempUnit, 0.85),
                      transform: [{ rotate: `${pt.windDirection + 180}deg` }],
                    },
                  ]}
                />
              </View>
            </Marker>
          ))}

        </MapView>
        )}

        {/* Animated wind flow overlay — native only. The overlay draws the same
            canvas particle flow as the web map, so the wind layer looks alive
            on iOS/Android instead of just static circles/polylines. */}
        {!IS_WEB && activeLayer === "wind" && mapSize.width > 0 && mapSize.height > 0 && (
          <WindFlowOverlay
            region={region}
            size={mapSize}
            gridData={gridData}
            tempUnit={tempUnit}
          />
        )}

        {/* Smooth temperature / UV scalar field overlay — native only. Replaces
            the old hard-edged polygon tiles with a continuous, interpolated
            color field, value labels, and a vertical color scale like the
            reference weather-model maps. */}
        {!IS_WEB && (activeLayer === "temperature" || activeLayer === "uv") && mapSize.width > 0 && mapSize.height > 0 && (
          <ScalarFieldOverlay
            region={region}
            size={mapSize}
            gridData={gridData}
            tempUnit={tempUnit}
            field={activeLayer}
          />
        )}

        {/* Grid loading indicator */}
        {gridLoading && !isRadarLayer && (
          <View style={styles.gridLoading} pointerEvents="none">
            <ActivityIndicator size="small" color={WeatherColors.accent} />
          </View>
        )}

        {/* Grid error overlay */}
        {gridError && !isRadarLayer && !gridLoading && (
          <View style={styles.gridErrorOverlay} pointerEvents="none">
            <Text style={styles.gridErrorText}>Unable to load {activeLayer} data</Text>
            <Text style={styles.gridErrorHint}>Try zooming in or moving the map</Text>
          </View>
        )}

        {/* Map badge — hidden in fullscreen since the layer pill row above
            already shows the active layer; kept them from overlapping */}
        {!fullscreen && (
          <View style={styles.mapBadge} pointerEvents="none">
            <Text style={styles.mapBadgeText}>
              {activeLayer === "radar"
                ? "HYPER-LOCAL"
                : activeLayer.toUpperCase()}{" "}
              • {currentZoom}x
            </Text>
          </View>
        )}

        {/* Zoom + recenter controls — +/- hidden in fullscreen (pinch-to-zoom instead) */}
        <View style={styles.mapControls} pointerEvents="box-none">
          {!fullscreen && (
            <>
              <TouchableOpacity
                onPress={handleZoomIn}
                style={styles.mapControlBtn}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleZoomOut}
                style={styles.mapControlBtn}
                activeOpacity={0.7}
              >
                <Minus size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={handleRecenter}
            style={styles.mapControlBtn}
            activeOpacity={0.7}
          >
            <Locate size={16} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Legends */}
      {isRadarLayer && !compact && !fullscreen && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: "rgba(0, 240, 255, 0.85)" },
              ]}
            />
            <Text style={styles.legendText}>Light</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: "rgba(57, 255, 20, 0.85)" },
              ]}
            />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: "rgba(240, 255, 0, 0.9)" },
              ]}
            />
            <Text style={styles.legendText}>Heavy</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: "rgba(255, 61, 113, 0.95)" },
              ]}
            />
            <Text style={styles.legendText}>Extreme</Text>
          </View>
        </View>
      )}

      {!isRadarLayer && !compact && !fullscreen && (
        <View style={styles.legendRow}>
          {activeLayer === "temperature" ? (
            <TemperatureLegend tempUnit={tempUnit} />
          ) : activeLayer === "uv" ? (
            <UVLegend />
          ) : (
            <Text style={styles.legendHint}>Calm \u25B8 Blue    Strong \u25B8 Red</Text>
          )}
        </View>
      )}

      {/* Radar playback bar */}
      {isRadarLayer && (
        <>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    frames.length > 0
                      ? `${((frameIndex + 1) / frames.length) * 100}%`
                      : "0%",
                },
              ]}
            />
          </View>
          <View
            style={compact ? styles.compactControls : styles.controls}
          >
            <TouchableOpacity
              onPress={stepBack}
              style={compact ? styles.compactControlBtn : styles.controlBtn}
            >
              <SkipBack
                size={compact ? 14 : 20}
                color={WeatherColors.textPrimary}
                strokeWidth={1.5}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={togglePlay}
              style={compact ? styles.compactPlayBtn : styles.playBtn}
            >
              {isPlaying ? (
                <Pause
                  size={compact ? 16 : 24}
                  color="#0B1A2E"
                  strokeWidth={2}
                  fill="#0B1A2E"
                />
              ) : (
                <Play
                  size={compact ? 16 : 24}
                  color="#0B1A2E"
                  strokeWidth={2}
                  fill="#0B1A2E"
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={stepForward}
              style={compact ? styles.compactControlBtn : styles.controlBtn}
            >
              <SkipForward
                size={compact ? 14 : 20}
                color={WeatherColors.textPrimary}
                strokeWidth={1.5}
              />
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
  fullscreenWrapper: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textSecondary,
  },
  retryText: {
    fontSize: 12,
    color: WeatherColors.accent,
  },

  // Header
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  headerRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  radarTime: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },

  // Layer bar
  layerBar: {
    marginBottom: 10,
  },
  fullscreenHeaderRow: {
    position: "absolute" as const,
    top: 10,
    left: 12,
    right: 12,
    zIndex: 5,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  layerBarFullscreenScroll: {
    flex: 1,
  },
  fullscreenCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  layerBarContent: {
    gap: 6,
    paddingRight: 4,
  },
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
  layerPillLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
  },

  // Map
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden" as const,
    aspectRatio: 1,
    backgroundColor: "#071017",
  },
  compactMapContainer: {
    aspectRatio: 1.5,
  },
  fullscreenMapContainer: {
    flex: 1,
    borderRadius: 0,
    // Override the base mapContainer's aspectRatio: 1 — on Android,
    // aspectRatio wins over flex: 1, collapsing the map to a square
    // (or zero-height) instead of filling the screen. Setting it to
    // undefined removes the constraint so flex: 1 can stretch it.
    aspectRatio: undefined as unknown as number,
  },

  // Center dot
  centerDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 240, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WeatherColors.accent,
    borderWidth: 2,
    borderColor: "#fff",
  },

  // Native wind arrows (rendered as MapView markers)
  windArrowContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  windArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(2, 8, 14, 0.55)",
    borderWidth: 1.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  windArrowSpeed: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.95)",
  },
  windArrowShaft: {
    position: "absolute" as const,
    top: -16,
    left: 12,
    width: 2,
    height: 14,
    borderRadius: 1,
  },
  windArrowHead: {
    position: "absolute" as const,
    top: -22,
    left: 7,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },

  // Map chrome
  mapBadge: {
    position: "absolute" as const,
    left: 8,
    top: 8,
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
    top: 10,
    right: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    padding: 6,
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
  gridErrorOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(2, 8, 14, 0.72)",
    gap: 6,
  },
  gridErrorText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textSecondary,
  },
  gridErrorHint: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
  },

  // Map controls
  mapControls: {
    position: "absolute" as const,
    right: 8,
    bottom: 8,
    gap: 6,
  },
  mapControlBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  // Legend
  legendRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: WeatherColors.textTertiary,
  },
  legendHint: {
    fontSize: 10,
    color: WeatherColors.textTertiary,
    textAlign: "center" as const,
  },
  legendScaleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  legendScaleBar: {
    flexDirection: "row" as const,
    height: 10,
    borderRadius: 5,
    overflow: "hidden" as const,
    width: 160,
  },
  legendScaleSegment: {
    height: "100%" as const,
  },
  legendScaleLabel: {
    fontSize: 10,
    color: WeatherColors.textTertiary,
  },

  // Circle map labels
  circleLabel: {
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

  // Progress bar
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 10,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    backgroundColor: WeatherColors.accent,
    borderRadius: 2,
  },

  // Playback controls
  controls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 24,
  },
  compactControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 16,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  compactControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: WeatherColors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  compactPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WeatherColors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
