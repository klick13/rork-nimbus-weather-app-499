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
import MapView, { Marker, Region, Circle, Polyline, Polygon, Overlay } from "react-native-maps";
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
  fullscreen?: boolean;
  tempUnit?: TempUnit;
  onExpand?: () => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const RADAR_MIN_ZOOM = 2;
const RADAR_MAX_ZOOM = 12;
const INITIAL_DELTA = 0.4;
const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 18;

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

// ── Tile coordinate helpers ────────────────────────────────────────────────

function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

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

function tempColor(temp: number, unit: TempUnit): string {
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

function withAlpha(color: string, alpha: number): string {
  return color.replace(/[\d.]+\)$/, `${alpha})`);
}

function uvColor(uv: number): string {
  if (uv <= 2) return "rgba(80, 230, 120, 0.82)";
  if (uv <= 5) return "rgba(240, 230, 50, 0.82)";
  if (uv <= 7) return "rgba(255, 160, 30, 0.84)";
  if (uv <= 10) return "rgba(255, 60, 40, 0.87)";
  return "rgba(191, 64, 255, 0.89)";
}

function windColor(speed: number, unit: TempUnit): string {
  const mph = unit === "C" ? speed * 0.621 : speed;
  if (mph <= 5) return "rgba(120, 210, 255, 0.80)";
  if (mph <= 15) return "rgba(100, 190, 255, 0.83)";
  if (mph <= 25) return "rgba(240, 230, 50, 0.85)";
  if (mph <= 40) return "rgba(255, 160, 40, 0.87)";
  return "rgba(255, 60, 60, 0.90)";
}

// ── Wind streamline helpers ────────────────────────────────────────────────

interface LatLng {
  latitude: number;
  longitude: number;
}

function windFlowEnd(
  pt: WeatherGridPoint,
  length: number
): LatLng {
  const rad = (pt.windDirection * Math.PI) / 180;
  const cosLat = Math.cos(Math.min(85, Math.abs(pt.lat)) * (Math.PI / 180));
  return {
    latitude: pt.lat + length * Math.cos(rad),
    longitude: pt.lon + (length * Math.sin(rad)) / cosLat,
  };
}

function arrowheadTriangle(
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

// ── Main Widget ────────────────────────────────────────────────────────────

export default function RadarMapWidget({
  lat,
  lon,
  compact = false,
  fullscreen = false,
  tempUnit = "F",
  onExpand,
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
  const [currentZoom, setCurrentZoom] = useState<number>(8);
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
      const density = activeLayer === "wind" ? 8 : 5;
      const grid = await fetchWeatherGrid(
        region.latitude,
        region.longitude,
        currentZoom,
        renderRadius,
        density,
        tempUnit
      );
      if (fetchId === gridFetchId.current) {
        // Filter out zero-value placeholders — they're API failures, not real data
        const valid = grid.filter((p) => p.temp !== 0 || p.windSpeed !== 0 || p.uvIndex !== 0);
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
  }, [activeLayer, region.latitude, region.longitude, currentZoom, renderRadius, tempUnit]);

  useEffect(() => {
    fetchGrid();
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

  // ── Visible radar tiles (Overlay-based, only at zoom 2–12) ───────────────

  const visibleRadarTiles = useMemo(() => {
    if (!isRadarLayer || !currentFrame) return [];
    const z = Math.round(currentZoom);
    if (z < RADAR_MIN_ZOOM || z > RADAR_MAX_ZOOM) return [];

    const MAX_TILES = 15;
    const n = region.latitude + region.latitudeDelta / 2;
    const s = region.latitude - region.latitudeDelta / 2;
    const w = region.longitude - region.longitudeDelta / 2;
    const e = region.longitude + region.longitudeDelta / 2;

    type CoordTuple = [number, number];
    let tiles: Array<{ bounds: [CoordTuple, CoordTuple]; image: string; key: string }> = [];
    let tileZoom = z;

    while (tileZoom >= RADAR_MIN_ZOOM) {
      const minX = Math.floor(lon2tile(w, tileZoom));
      const maxX = Math.floor(lon2tile(e, tileZoom));
      const minY = Math.floor(lat2tile(n, tileZoom));
      const maxY = Math.floor(lat2tile(s, tileZoom));

      const count = (maxX - minX + 1) * (maxY - minY + 1);

      if (count <= MAX_TILES || tileZoom === RADAR_MIN_ZOOM) {
        const maxTileIndex = Math.pow(2, tileZoom);
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            if (x < 0 || y < 0 || x >= maxTileIndex || y >= maxTileIndex) continue;
            const neLat = tile2lat(y, tileZoom);
            const swLat = tile2lat(y + 1, tileZoom);
            const neLon = tile2lon(x + 1, tileZoom);
            const swLon = tile2lon(x, tileZoom);
            tiles.push({
              bounds: [
                [neLat, neLon],
                [swLat, swLon],
              ],
              image: `https://tilecache.rainviewer.com${currentFrame.path}/256/${tileZoom}/${x}/${y}/8/1_1.png`,
              key: `${tileZoom}-${x}-${y}`,
            });
          }
        }
        break;
      }
      tileZoom--;
    }

    return tiles;
  }, [isRadarLayer, currentFrame, region, currentZoom]);

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={fullscreen ? styles.layerBarFullscreen : styles.layerBar}
        contentContainerStyle={styles.layerBarContent}
      >
        {layerButtons.map((btn) => {
          const active = activeLayer === btn.key;
          const activeColor = layerIconColor(btn.key, true);
          return (
            <TouchableOpacity
              key={btn.key}
              style={[
                styles.layerPill,
                active && layerPillActiveStyle(btn.key),
              ]}
              onPress={() => handleLayerChange(btn.key)}
              activeOpacity={0.7}
            >
              {layerIcon(btn.key, active)}
              <Text
                style={[
                  styles.layerPillLabel,
                  active && { color: activeColor },
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Map container */}
      <View
        style={[
          styles.mapContainer,
          compact && !fullscreen && styles.compactMapContainer,
          fullscreen && styles.fullscreenMapContainer,
        ]}
      >
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
          rotateEnabled
          pitchEnabled
          scrollEnabled
          zoomEnabled
          {...(Platform.OS === "ios"
            ? { userInterfaceStyle: "dark" as const }
            : { customMapStyle: darkMapStyle })}
        >
          {/* Radar tile overlays — only rendered at zoom 2–12 */}
          {isRadarLayer &&
            visibleRadarTiles.map((tile) => (
              <Overlay
                key={tile.key}
                bounds={tile.bounds}
                image={{ uri: tile.image }}
                opacity={0.8}
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

          {/* Temperature coverage circles + labels */}
          {activeLayer === "temperature" &&
            gridData.map((pt, i) => (
              <Circle
                key={`temp-circle-${i}`}
                center={{ latitude: pt.lat, longitude: pt.lon }}
                radius={14000}
                fillColor={withAlpha(tempColor(pt.temp, tempUnit), 0.34)}
                strokeColor={withAlpha(tempColor(pt.temp, tempUnit), 0.78)}
                strokeWidth={1.5}
                zIndex={0}
              />
            ))}
          {activeLayer === "temperature" &&
            gridData.map((pt, i) => (
              <Marker
                key={`temp-label-${i}`}
                coordinate={{ latitude: pt.lat, longitude: pt.lon }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.circleLabel}>
                  <Text style={styles.circleLabelText}>{pt.temp}°</Text>
                </View>
              </Marker>
            ))}

          {/* UV coverage circles + labels */}
          {activeLayer === "uv" &&
            gridData.map((pt, i) => (
              <Circle
                key={`uv-circle-${i}`}
                center={{ latitude: pt.lat, longitude: pt.lon }}
                radius={11000}
                fillColor={withAlpha(uvColor(pt.uvIndex), 0.32)}
                strokeColor={withAlpha(uvColor(pt.uvIndex), 0.76)}
                strokeWidth={1.5}
                zIndex={0}
              />
            ))}
          {activeLayer === "uv" &&
            gridData.map((pt, i) => (
              <Marker
                key={`uv-label-${i}`}
                coordinate={{ latitude: pt.lat, longitude: pt.lon }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.circleLabel}>
                  <Text style={styles.circleLabelText}>{pt.uvIndex}</Text>
                </View>
              </Marker>
            ))}

          {/* Wind flow streamlines + arrowheads */}
          {activeLayer === "wind" &&
            gridData
              .filter((pt) => pt.windSpeed > 0)
              .map((pt, i) => {
                const speed = pt.windSpeed;
                const direction = pt.windDirection;
                const speedFactor = Math.min(speed / 45, 1);
                const lineLen = 0.06 + speedFactor * 0.28;
                const end = windFlowEnd(pt, lineLen);
                const arrowSize = 0.014 + speedFactor * 0.022;
                const arrow = arrowheadTriangle(end, direction, arrowSize, pt);
                const color = windColor(speed, tempUnit);
                const opacity = 0.38 + speedFactor * 0.52;
                const width = 1 + speedFactor * 3.5;

                return (
                  <React.Fragment key={`wind-${i}`}>
                    <Polyline
                      coordinates={[
                        { latitude: pt.lat, longitude: pt.lon },
                        end,
                      ]}
                      strokeColor={withAlpha(color, opacity)}
                      strokeWidth={width}
                      zIndex={1}
                      lineCap="round"
                    />
                    <Polyline
                      coordinates={[
                        arrow[0],
                        arrow[1],
                        arrow[2],
                      ]}
                      strokeColor={withAlpha(color, Math.min(1, opacity + 0.15))}
                      strokeWidth={width * 0.7}
                      zIndex={2}
                      lineCap="round"
                      lineJoin="round"
                    />
                  </React.Fragment>
                );
              })}
        </MapView>

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

        {/* Map badge */}
        <View style={styles.mapBadge} pointerEvents="none">
          <Text style={styles.mapBadgeText}>
            {activeLayer === "radar"
              ? "HYPER-LOCAL"
              : activeLayer.toUpperCase()}{" "}
            • {currentZoom}x
          </Text>
        </View>

        {/* Zoom + recenter controls */}
        <View style={styles.mapControls} pointerEvents="box-none">
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
          <Text style={styles.legendHint}>
            {activeLayer === "temperature"
              ? "Cold \u25B8 Blue    Hot \u25B8 Red"
              : activeLayer === "uv"
              ? "Low \u25B8 Green    Extreme \u25B8 Purple"
              : "Calm \u25B8 Blue    Strong \u25B8 Red"}
          </Text>
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
  layerBarFullscreen: {
    position: "absolute" as const,
    top: 10,
    left: 12,
    right: 12,
    zIndex: 5,
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
