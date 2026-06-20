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
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";

interface RadarFrame {
  path: string;
  time: number;
}

interface Props {
  lat: number;
  lon: number;
  compact?: boolean;
  onExpand?: () => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
// RainViewer's free tile service reliably serves radar tiles up to z=6.
// Higher zooms occasionally return a "Zoom level not supported" placeholder PNG,
// so we cap the native radar zoom here and upsample for any deeper zoom level.
const MAX_NATIVE_RADAR_ZOOM = 6;
const MAX_ZOOM = 14;
const DEFAULT_ZOOM = 8;

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

interface RadarTileInfo {
  uri: string;
  scale: number;
  subX: number;
  subY: number;
}

function getRainViewerTileInfo(framePath: string, zoom: number, x: number, y: number): RadarTileInfo | null {
  if (zoom > MAX_NATIVE_RADAR_ZOOM) {
    const scaleDiff = zoom - MAX_NATIVE_RADAR_ZOOM;
    const scale = Math.pow(2, scaleDiff);
    const parentX = Math.floor(x / scale);
    const parentY = Math.floor(y / scale);
    const subX = ((x % scale) + scale) % scale;
    const subY = ((y % scale) + scale) % scale;
    const normalized = normalizeTileCoordinates(parentX, parentY, MAX_NATIVE_RADAR_ZOOM);
    if (!normalized.isValid) return null;
    return {
      uri: `https://tilecache.rainviewer.com${framePath}/${TILE_SIZE}/${MAX_NATIVE_RADAR_ZOOM}/${normalized.x}/${normalized.y}/8/1_1.png`,
      scale,
      subX,
      subY,
    };
  }
  const normalized = normalizeTileCoordinates(x, y, zoom);
  if (!normalized.isValid) return null;
  return {
    uri: `https://tilecache.rainviewer.com${framePath}/${TILE_SIZE}/${zoom}/${normalized.x}/${normalized.y}/8/1_1.png`,
    scale: 1,
    subX: 0,
    subY: 0,
  };
}

function getBaseMapTilePath(zoom: number, x: number, y: number, variant: "base" | "labels"): string {
  const normalized = normalizeTileCoordinates(x, y, zoom);
  const tileVariant = variant === "base" ? "dark_all" : "dark_only_labels";

  if (!normalized.isValid) {
    return "";
  }

  return `https://basemaps.cartocdn.com/${tileVariant}/${zoom}/${normalized.x}/${normalized.y}@2x.png`;
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

function formatRadarTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function RadarMapWidget({ lat, lon, compact = false, onExpand, onPanStart, onPanEnd }: Props) {
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panXY = useRef(new Animated.ValueXY()).current;

  const tile = latLonToTile(lat, lon, zoomLevel);

  const renderRadius = compact ? 1 : 2;
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

  const onPanStartRef = useRef(onPanStart);
  const onPanEndRef = useRef(onPanEnd);
  onPanStartRef.current = onPanStart;
  onPanEndRef.current = onPanEnd;

  const hasPanned = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        const shouldPan = Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4;
        if (shouldPan) hasPanned.current = true;
        return shouldPan;
      },
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        const shouldPan = Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4;
        if (shouldPan) hasPanned.current = true;
        return shouldPan;
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => hasPanned.current,
      onPanResponderGrant: () => {
        hasPanned.current = false;
        onPanStartRef.current?.();
        panXY.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: panXY.x, dy: panXY.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        panXY.flattenOffset();
        onPanEndRef.current?.();
        setTimeout(() => { hasPanned.current = false; }, 50);
      },
      onPanResponderTerminate: () => {
        panXY.flattenOffset();
        onPanEndRef.current?.();
        hasPanned.current = false;
      },
    })
  ).current;

  const fetchRadarFrames = useCallback(async (retries = 3) => {
    setLoading(true);
    setError(false);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Radar] Fetching RainViewer frames (attempt ${attempt}/${retries})...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timeout);

        if (!res.ok) {
          console.warn(`[Radar] HTTP ${res.status} on attempt ${attempt}`);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const radarFrames: RadarFrame[] = [];

        if (data.radar?.past) {
          data.radar.past.forEach((f: { path: string; time: number }) => {
            radarFrames.push({ path: f.path, time: f.time });
          });
        }
        if (data.radar?.nowcast) {
          data.radar.nowcast.forEach((f: { path: string; time: number }) => {
            radarFrames.push({ path: f.path, time: f.time });
          });
        }

        if (radarFrames.length > 0) {
          setFrames(radarFrames);
          setFrameIndex(radarFrames.length - 1);
          console.log("[Radar] Loaded", radarFrames.length, "frames");
          setLoading(false);
          return;
        }

        console.warn("[Radar] No frames in response");
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Radar] Attempt ${attempt} failed: ${message}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        console.error("[Radar] All fetch attempts failed");
      }
    }

    setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRadarFrames();
  }, [fetchRadarFrames]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % frames.length);
      }, 600);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, frames.length]);

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

  const currentFrame = frames[frameIndex];

  if (loading) {
    return (
      <Animated.View style={[compact ? styles.compactCard : styles.card, { opacity: fadeAnim }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={WeatherColors.accent} />
          <Text style={styles.loadingText}>Loading radar...</Text>
        </View>
      </Animated.View>
    );
  }

  if (error) {
    return (
      <Animated.View style={[compact ? styles.compactCard : styles.card, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.loadingContainer} onPress={() => fetchRadarFrames()}>
          <Text style={styles.errorText}>Radar unavailable</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[compact ? styles.compactCard : styles.card, { opacity: fadeAnim }]}>
      <View style={styles.radarHeader}>
        <Text style={styles.radarTitle}>
          {compact ? "Live Radar" : "Precipitation Radar"}
        </Text>
        <View style={styles.radarHeaderRight}>
          {currentFrame && (
            <Text style={styles.radarTime}>{formatRadarTime(currentFrame.time)}</Text>
          )}
          {compact && onExpand && (
            <TouchableOpacity
              onPress={onExpand}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Maximize2 size={14} color={WeatherColors.textTertiary} strokeWidth={1.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={[styles.mapContainer, compact && styles.compactMapContainer]}
        collapsable={false}
        {...panResponder.panHandlers}
      >
        <Animated.View
          pointerEvents="none"
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
            const baseMapUri = getBaseMapTilePath(zoomLevel, tileX, tileY, "base");
            const labelsUri = getBaseMapTilePath(zoomLevel, tileX, tileY, "labels");
            const radarInfo = currentFrame ? getRainViewerTileInfo(currentFrame.path, zoomLevel, tileX, tileY) : null;

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
                    style={[styles.tileImage, styles.baseTileLayer]}
                    resizeMode="cover"
                  />
                ) : null}
                {labelsUri ? (
                  <Image
                    source={{ uri: labelsUri }}
                    style={[styles.tileImage, styles.labelLayer]}
                    resizeMode="cover"
                  />
                ) : null}
                {radarInfo ? (
                  <View style={styles.radarClip} pointerEvents="none">
                    <Image
                      source={{ uri: radarInfo.uri }}
                      style={[
                        styles.radarOverlay,
                        {
                          position: "absolute" as const,
                          width: TILE_SIZE * radarInfo.scale,
                          height: TILE_SIZE * radarInfo.scale,
                          left: -radarInfo.subX * TILE_SIZE,
                          top: -radarInfo.subY * TILE_SIZE,
                        },
                      ]}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
          <View style={styles.centerDot} pointerEvents="none">
            <View style={styles.dot} />
          </View>
        </Animated.View>

        <View style={styles.mapDepthOverlay} pointerEvents="none" />
        <View style={styles.localGridOverlay} pointerEvents="none" />
        <View style={styles.mapBadge} pointerEvents="none">
          <Text style={styles.mapBadgeText}>HYPER-LOCAL • {zoomLevel}x</Text>
        </View>

        <View style={styles.mapControls} pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleZoomIn}
            style={[
              styles.mapControlButton,
              zoomLevel >= MAX_ZOOM && styles.mapControlDisabled,
            ]}
            activeOpacity={0.7}
            testID="radar-zoom-in"
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
            testID="radar-zoom-out"
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
            testID="radar-recenter"
          >
            <Locate size={16} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {!compact && (
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

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: frames.length > 0
                ? `${((frameIndex + 1) / frames.length) * 100}%`
                : "0%",
            },
          ]}
        />
      </View>

      <View style={compact ? styles.compactControls : styles.controls}>
        <TouchableOpacity
          onPress={stepBack}
          style={compact ? styles.compactControlButton : styles.controlButton}
        >
          <SkipBack
            size={compact ? 14 : 20}
            color={WeatherColors.textPrimary}
            strokeWidth={1.5}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={togglePlay}
          style={compact ? styles.compactPlayButton : styles.playButton}
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
          style={compact ? styles.compactControlButton : styles.controlButton}
        >
          <SkipForward
            size={compact ? 14 : 20}
            color={WeatherColors.textPrimary}
            strokeWidth={1.5}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

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
  radarHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  radarTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  radarHeaderRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  radarTime: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden" as const,
    aspectRatio: 1,
    backgroundColor: "#071017",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  compactMapContainer: {
    aspectRatio: 1.5,
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
  radarOverlay: {
    opacity: 0.96,
  },
  radarClip: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%" as const,
    height: "100%" as const,
    overflow: "hidden" as const,
  },
  baseTileLayer: {
    opacity: 0.92,
  },
  labelLayer: {
    opacity: 0.88,
  },
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
  centerDot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WeatherColors.accent,
    borderWidth: 2,
    borderColor: "#fff",
  },
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
    marginTop: 12,
    marginBottom: 8,
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
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  compactControlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: WeatherColors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  compactPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WeatherColors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
