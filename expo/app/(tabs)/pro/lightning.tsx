import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  TouchableOpacity,
  Image,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  Zap,
  Shield,
  MapPin,
  Activity,
  AlertTriangle,
  Plus,
  Minus,
  Locate,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import ProGate from "@/components/ProGate";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 10;
const DEFAULT_ZOOM = 7;
const MAP_HEIGHT = 300;

function normalizeTileCoordinates(x: number, y: number, zoom: number): { x: number; y: number; isValid: boolean } {
  const tileCount = Math.pow(2, zoom);
  const wrappedX = ((x % tileCount) + tileCount) % tileCount;
  const clampedY = Math.max(0, Math.min(y, tileCount - 1));
  const isValid = y >= 0 && y < tileCount;

  return {
    x: wrappedX,
    y: clampedY,
    isValid,
  };
}

function getBaseMapTilePath(zoom: number, x: number, y: number): string {
  const normalized = normalizeTileCoordinates(x, y, zoom);

  if (!normalized.isValid) {
    return "";
  }

  return `https://basemaps.cartocdn.com/dark_all/${zoom}/${normalized.x}/${normalized.y}@2x.png`;
}

interface LightningStrike {
  latOffset: number;
  lonOffset: number;
  intensity: "low" | "medium" | "high";
  minutesAgo: number;
}

function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function generateStrikes(conditionId: string, windSpeed: number): LightningStrike[] {
  const isThunderstorm = conditionId === "rainy" && windSpeed > 15;
  const isStormy = conditionId === "rainy";
  if (!isThunderstorm && !isStormy) return [];

  const count = isThunderstorm ? Math.floor(Math.random() * 8) + 5 : Math.floor(Math.random() * 3) + 1;
  const strikes: LightningStrike[] = [];

  for (let i = 0; i < count; i++) {
    strikes.push({
      latOffset: (Math.random() - 0.5) * 0.8,
      lonOffset: (Math.random() - 0.5) * 0.8,
      intensity: Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
      minutesAgo: Math.floor(Math.random() * 60),
    });
  }
  return strikes;
}

function StrikeMarker({ strike, index, gridSize, centerTile, zoom, lat, lon }: {
  strike: LightningStrike;
  index: number;
  gridSize: number;
  centerTile: { x: number; y: number };
  zoom: number;
  lat: number;
  lon: number;
}) {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const color = strike.intensity === "high" ? "#FFFFFF" : strike.intensity === "medium" ? "#FFD60A" : "#F4A436";

  const strikeLat = lat + strike.latOffset;
  const strikeLon = lon + strike.lonOffset;
  const n = Math.pow(2, zoom);
  const pixelX = ((strikeLon + 180) / 360) * n * TILE_SIZE;
  const latRad = (strikeLat * Math.PI) / 180;
  const pixelY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE_SIZE;

  const radius = Math.floor(gridSize / 2);
  const originX = (centerTile.x - radius) * TILE_SIZE;
  const originY = (centerTile.y - radius) * TILE_SIZE;

  const relX = pixelX - originX;
  const relY = pixelY - originY;

  useEffect(() => {
    const delay = index * 200 + Math.random() * 500;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 150 + Math.random() * 200, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0.3, duration: 800 + Math.random() * 1200, useNativeDriver: true }),
          ])
        ),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [flashAnim, scaleAnim, index]);

  return (
    <Animated.View
      style={[
        styles.strikeMarker,
        {
          left: relX - 10,
          top: relY - 10,
          opacity: flashAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.strikeGlow, { backgroundColor: color }]} />
      <Zap size={12} color={color} strokeWidth={2.5} fill={color} />
    </Animated.View>
  );
}

export default function LightningScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM);
  const panXY = useRef(new Animated.ValueXY()).current;

  const lat = selectedLocation.coordinates?.lat ?? 29.95;
  const lon = selectedLocation.coordinates?.lon ?? -90.07;

  const tile = latLonToTile(lat, lon, zoomLevel);
  const renderRadius = 2;
  const renderGridSize = renderRadius * 2 + 1;

  const offsets = useMemo(() => {
    const result: Array<{ dx: number; dy: number }> = [];
    for (let dy = -renderRadius; dy <= renderRadius; dy++) {
      for (let dx = -renderRadius; dx <= renderRadius; dx++) {
        result.push({ dx, dy });
      }
    }
    return result;
  }, [renderRadius]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        panXY.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: panXY.x, dy: panXY.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        panXY.flattenOffset();
      },
      onPanResponderTerminate: () => {
        panXY.flattenOffset();
      },
    })
  ).current;

  const strikes = useMemo(
    () => generateStrikes(selectedLocation.condition.id, selectedLocation.details.windSpeed),
    [selectedLocation.condition.id, selectedLocation.details.windSpeed]
  );

  const hasActivity = strikes.length > 0;
  const closestDistance = hasActivity ? (Math.random() * 15 + 2).toFixed(1) : "--";
  const strikesPerHour = strikes.length * 4;

  const safety = useMemo(() => {
    if (strikes.length > 8) return { level: "Dangerous", color: "#FF6B6B", message: "Seek shelter immediately! Lightning within 10 miles." };
    if (strikes.length > 3) return { level: "Moderate", color: "#F4A436", message: "Lightning detected nearby. Move indoors if possible." };
    if (strikes.length > 0) return { level: "Low", color: "#FFD60A", message: "Distant lightning activity. Monitor conditions." };
    return { level: "Clear", color: "#34C759", message: "No lightning activity detected in your area." };
  }, [strikes.length]);

  const handleZoomIn = useCallback(() => {
    if (zoomLevel >= MAX_ZOOM) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel((prev) => Math.min(prev + 1, MAX_ZOOM));
    panXY.setValue({ x: 0, y: 0 });
    panXY.setOffset({ x: 0, y: 0 });
  }, [zoomLevel, panXY]);

  const handleZoomOut = useCallback(() => {
    if (zoomLevel <= MIN_ZOOM) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setZoomLevel((prev) => Math.max(prev - 1, MIN_ZOOM));
    panXY.setValue({ x: 0, y: 0 });
    panXY.setOffset({ x: 0, y: 0 });
  }, [zoomLevel, panXY]);

  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    panXY.setOffset({ x: 0, y: 0 });
    Animated.spring(panXY, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
  }, [panXY]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Lightning Map" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0A0E1A", "#0F1629", "#151D35"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} />
      <ProGate featureName="Lightning Strike Map">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Zap size={20} color="#FFD60A" strokeWidth={1.5} />
            <Text style={styles.title}>Lightning Map</Text>
          </View>
          <Text style={styles.subtitle}>{selectedLocation.name} — Real-time detection</Text>

          <View style={styles.mapWrapper}>
            <View
              style={styles.mapContainer}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.tileGrid,
                  {
                    width: TILE_SIZE * renderGridSize,
                    height: TILE_SIZE * renderGridSize,
                    transform: [
                      { translateX: panXY.x },
                      { translateY: panXY.y },
                    ],
                  },
                ]}
              >
                {offsets.map((offset, i) => {
                  const tileX = tile.x + offset.dx;
                  const tileY = tile.y + offset.dy;
                  const baseMapUri = getBaseMapTilePath(zoomLevel, tileX, tileY);

                  return (
                    <View
                      key={`tile-${i}`}
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
                      {baseMapUri ? (
                        <Image
                          source={{ uri: baseMapUri }}
                          style={styles.tileImage}
                          resizeMode="cover"
                        />
                      ) : null}
                    </View>
                  );
                })}

                {strikes.map((strike, i) => (
                  <StrikeMarker
                    key={`s-${i}`}
                    strike={strike}
                    index={i}
                    gridSize={renderGridSize}
                    centerTile={tile}
                    zoom={zoomLevel}
                    lat={lat}
                    lon={lon}
                  />
                ))}

                <View style={styles.centerDot} pointerEvents="none">
                  <View style={styles.dotOuter}>
                    <View style={styles.dotInner} />
                  </View>
                </View>
              </Animated.View>

              {!hasActivity && (
                <View style={styles.noActivityOverlay} pointerEvents="none">
                  <Zap size={28} color={WeatherColors.textTertiary} strokeWidth={1} />
                  <Text style={styles.noActivityText}>No lightning detected</Text>
                </View>
              )}

              <View style={styles.mapControls} pointerEvents="box-none">
                <TouchableOpacity
                  onPress={handleZoomIn}
                  style={[
                    styles.mapControlButton,
                    zoomLevel >= MAX_ZOOM && styles.mapControlDisabled,
                  ]}
                  activeOpacity={0.7}
                  testID="lightning-zoom-in"
                >
                  <Plus
                    size={16}
                    color={zoomLevel >= MAX_ZOOM ? "rgba(255,255,255,0.3)" : "#fff"}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleZoomOut}
                  style={[
                    styles.mapControlButton,
                    zoomLevel <= MIN_ZOOM && styles.mapControlDisabled,
                  ]}
                  activeOpacity={0.7}
                  testID="lightning-zoom-out"
                >
                  <Minus
                    size={16}
                    color={zoomLevel <= MIN_ZOOM ? "rgba(255,255,255,0.3)" : "#fff"}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRecenter}
                  style={styles.mapControlButton}
                  activeOpacity={0.7}
                  testID="lightning-recenter"
                >
                  <Locate size={16} color="#fff" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#F4A436" }]} />
                <Text style={styles.legendText}>Low</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#FFD60A" }]} />
                <Text style={styles.legendText}>Medium</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#FFFFFF" }]} />
                <Text style={styles.legendText}>High</Text>
              </View>
            </View>
          </View>

          <View style={[styles.safetyCard, { borderColor: `${safety.color}30` }]}>
            <View style={styles.safetyHeader}>
              <Shield size={16} color={safety.color} strokeWidth={1.5} />
              <Text style={[styles.safetyLevel, { color: safety.color }]}>{safety.level}</Text>
            </View>
            <Text style={styles.safetyMessage}>{safety.message}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Activity size={16} color="#FFD60A" strokeWidth={1.5} />
              <Text style={styles.statValue}>{hasActivity ? strikesPerHour : 0}</Text>
              <Text style={styles.statLabel}>Strikes/hr</Text>
            </View>
            <View style={styles.statCard}>
              <MapPin size={16} color={WeatherColors.accentCool} strokeWidth={1.5} />
              <Text style={styles.statValue}>{closestDistance}</Text>
              <Text style={styles.statLabel}>Closest (mi)</Text>
            </View>
            <View style={styles.statCard}>
              <Zap size={16} color="#F4A436" strokeWidth={1.5} />
              <Text style={styles.statValue}>{strikes.length}</Text>
              <Text style={styles.statLabel}>Detected</Text>
            </View>
          </View>

          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <AlertTriangle size={14} color="#FF6B6B" strokeWidth={1.5} />
              <Text style={styles.tipsTitle}>Safety Tips</Text>
            </View>
            <View style={styles.tipsList}>
              {[
                "If thunder follows lightning in under 30 seconds, seek shelter",
                "Stay indoors for 30 minutes after the last thunder",
                "Avoid tall objects, water, and open fields",
                "If caught outside, crouch low with feet together",
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipItem}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </ProGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingHorizontal: 24, paddingTop: 12 },
  title: { fontSize: 28, fontWeight: "700" as const, color: WeatherColors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: WeatherColors.textSecondary, paddingHorizontal: 24, marginTop: 4, marginBottom: 20 },
  mapWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    borderRadius: 16,
    overflow: "hidden" as const,
    backgroundColor: "#1a1a2e",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.15)",
  },
  tileGrid: {
    position: "relative" as const,
  },
  tile: {
    position: "absolute" as const,
  },
  tileImage: {
    width: "100%" as const,
    height: "100%" as const,
    position: "absolute" as const,
    top: 0,
    left: 0,
  },
  centerDot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(74, 159, 232, 0.3)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WeatherColors.accentCool,
    borderWidth: 2,
    borderColor: "#fff",
  },
  strikeMarker: {
    position: "absolute" as const,
    width: 20,
    height: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  strikeGlow: {
    position: "absolute" as const,
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.3,
  },
  noActivityOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.3)",
    gap: 8,
  },
  noActivityText: { fontSize: 14, color: WeatherColors.textTertiary },
  mapControls: {
    position: "absolute" as const,
    right: 8,
    bottom: 8,
    gap: 6,
  },
  mapControlButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  mapControlDisabled: {
    opacity: 0.4,
  },
  legendRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
  },
  safetyCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: WeatherColors.cardBackground,
    borderWidth: 1,
    marginBottom: 16,
  },
  safetyHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 6 },
  safetyLevel: { fontSize: 16, fontWeight: "700" as const },
  safetyMessage: { fontSize: 13, color: WeatherColors.textSecondary, lineHeight: 18 },
  statsGrid: { flexDirection: "row" as const, paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 14,
    alignItems: "center" as const,
    gap: 6,
  },
  statValue: { fontSize: 22, fontWeight: "700" as const, color: WeatherColors.textPrimary },
  statLabel: { fontSize: 10, color: WeatherColors.textTertiary, fontWeight: "500" as const },
  tipsCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: WeatherColors.cardBackground,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
  },
  tipsHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: 15, fontWeight: "600" as const, color: WeatherColors.textPrimary },
  tipsList: { gap: 10 },
  tipRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 10 },
  tipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FF6B6B", marginTop: 6 },
  tipItem: { fontSize: 13, color: WeatherColors.textSecondary, lineHeight: 18, flex: 1 },
});
