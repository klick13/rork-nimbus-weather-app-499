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
import MapView, { UrlTile, Marker, Region } from "react-native-maps";
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

const MAX_NATIVE_RADAR_ZOOM = 6;
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

// ── Helpers ────────────────────────────────────────────────────────────────

function regionToZoom(longitudeDelta: number): number {
  return Math.min(
    MAX_ZOOM_LEVEL,
    Math.max(MIN_ZOOM_LEVEL, Math.round(Math.log2(360 / longitudeDelta)))
  );
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

// ── Wind Arrow ─────────────────────────────────────────────────────────────

function WindArrow({
  speed,
  direction,
  unit,
}: {
  speed: number;
  direction: number;
  unit: TempUnit;
}) {
  const arrowLen = Math.max(6, Math.min(28, speed * 1.2));
  const deg = direction;
  const rad = ((deg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad) * arrowLen;
  const dy = Math.sin(rad) * arrowLen;

  return (
    <View
      style={{
        width: arrowLen * 1.8,
        height: arrowLen * 1.8,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: arrowLen,
          height: 2.5,
          backgroundColor: windColor(speed, unit),
          borderRadius: 1,
          top: "50%",
          left: "50%",
          marginTop: -1.25,
          marginLeft: -arrowLen / 2,
          transform: [{ rotate: `${deg}deg` }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 0,
          height: 0,
          marginTop: -Math.sin(rad) * arrowLen * 0.38 - 3.5,
          marginLeft: Math.cos(rad) * arrowLen * 0.38 - 3,
          borderLeftWidth: 3.5,
          borderRightWidth: 3.5,
          borderBottomWidth: 6,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: windColor(speed, unit),
          transform: [{ rotate: `${deg + 90}deg` }],
        }}
      />
    </View>
  );
}

// ── Grid Marker ────────────────────────────────────────────────────────────

function GridMarker({
  point,
  layer,
  unit,
}: {
  point: WeatherGridPoint;
  layer: MapLayer;
  unit: TempUnit;
}) {
  if (layer === "temperature") {
    return (
      <Marker
        coordinate={{ latitude: point.lat, longitude: point.lon }}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: tempColor(point.temp, unit),
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: "rgba(255,255,255,0.25)",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: "#fff",
              textShadowColor: "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 0, height: 0.5 },
              textShadowRadius: 2,
            }}
          >
            {point.temp}°
          </Text>
        </View>
      </Marker>
    );
  }

  if (layer === "uv") {
    return (
      <Marker
        coordinate={{ latitude: point.lat, longitude: point.lon }}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: uvColor(point.uvIndex),
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: "rgba(255,255,255,0.25)",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: "#fff",
              textShadowColor: "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 0, height: 0.5 },
              textShadowRadius: 2,
            }}
          >
            {point.uvIndex}
          </Text>
        </View>
      </Marker>
    );
  }

  if (layer === "wind") {
    return (
      <Marker
        coordinate={{ latitude: point.lat, longitude: point.lon }}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges
      >
        <WindArrow
          speed={point.windSpeed}
          direction={point.windDirection}
          unit={unit}
        />
      </Marker>
    );
  }

  return null;
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
  const [gridLoading, setGridLoading] = useState(false);
  const gridFetchId = useRef(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRadarLayer = activeLayer === "radar";
  const renderRadius = compact ? 3 : 4;

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
      return;
    }
    const fetchId = ++gridFetchId.current;
    setGridLoading(true);
    try {
      const density = compact ? 3 : 5;
      const grid = await fetchWeatherGrid(
        region.latitude,
        region.longitude,
        currentZoom,
        renderRadius,
        density,
        tempUnit
      );
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
  }, [activeLayer, region.latitude, region.longitude, currentZoom, renderRadius, compact, tempUnit]);

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

  // ── Radar tile URL template ──────────────────────────────────────────────

  const radarTileTemplate = useMemo(() => {
    if (!currentFrame || !isRadarLayer) return "";
    return `https://tilecache.rainviewer.com${currentFrame.path}/256/{z}/{x}/{y}/8/1_1.png`;
  }, [currentFrame, isRadarLayer]);

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
          {/* Radar tile overlay */}
          {isRadarLayer && radarTileTemplate !== "" && (
            <UrlTile
              urlTemplate={radarTileTemplate}
              maximumZ={MAX_NATIVE_RADAR_ZOOM}
              tileSize={256}
              zIndex={-1}
            />
          )}

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

          {/* Grid overlay markers */}
          {!isRadarLayer &&
            gridData.map((pt, i) => (
              <GridMarker
                key={`grid-${activeLayer}-${i}`}
                point={pt}
                layer={activeLayer}
                unit={tempUnit}
              />
            ))}
        </MapView>

        {/* Grid loading indicator */}
        {gridLoading && !isRadarLayer && (
          <View style={styles.gridLoading} pointerEvents="none">
            <ActivityIndicator size="small" color={WeatherColors.accent} />
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
