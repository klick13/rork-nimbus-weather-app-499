import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Animated,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  Droplets,
  Bell,
  BellOff,
  AlertTriangle,
  ChevronDown,
  Shield,
  MapPin,
  Clock,
  TrendingUp,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";

interface FloodGate {
  id: string;
  name: string;
  location: string;
  status: "open" | "closing" | "closed";
  lastUpdated: string;
  waterLevel: number;
  maxCapacity: number;
  distanceMi: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const GATE_PREFIXES = [
  "Spillway", "Floodway", "Canal Floodgate", "Control Structure",
  "Flood Barrier", "Water Gate", "Dam Gate", "Levee Gate",
  "Drainage Gate", "Overflow Structure",
];

const GATE_NAMES_FIRST = [
  "North", "South", "East", "West", "Central",
  "Upper", "Lower", "Old", "New", "Grand",
  "Lake", "River", "Bay", "Creek", "Harbor",
];

const STATUSES: Array<"open" | "closing" | "closed"> = ["open", "open", "open", "closing", "closed"];
const UPDATE_TIMES = ["3 min ago", "8 min ago", "12 min ago", "21 min ago", "34 min ago", "1 hr ago", "2 hr ago"];

function generateFloodGates(locationName: string, lat: number, lon: number): FloodGate[] {
  const seed = Math.abs(Math.round((lat * 1000 + lon * 1000)));
  const rand = seededRandom(seed);
  const count = 3 + Math.floor(rand() * 3);

  const gates: FloodGate[] = [];
  for (let i = 0; i < count; i++) {
    const firstName = GATE_NAMES_FIRST[Math.floor(rand() * GATE_NAMES_FIRST.length)];
    const suffix = GATE_PREFIXES[Math.floor(rand() * GATE_PREFIXES.length)];
    const status = STATUSES[Math.floor(rand() * STATUSES.length)];
    const waterLevel = status === "closed" ? 80 + Math.floor(rand() * 20) : status === "closing" ? 55 + Math.floor(rand() * 30) : 15 + Math.floor(rand() * 40);

    gates.push({
      id: `fg-${lat.toFixed(2)}-${lon.toFixed(2)}-${i}`,
      name: `${firstName} ${locationName.split(",")[0].split(" ")[0]} ${suffix}`,
      location: `Near ${locationName}`,
      status,
      lastUpdated: UPDATE_TIMES[Math.floor(rand() * UPDATE_TIMES.length)],
      waterLevel,
      maxCapacity: 100,
      distanceMi: parseFloat((1 + rand() * 60).toFixed(1)),
    });
  }

  return gates.sort((a, b) => a.distanceMi - b.distanceMi);
}

const STATUS_CONFIG = {
  open: {
    bg: "rgba(52, 199, 89, 0.1)",
    border: "rgba(52, 199, 89, 0.25)",
    color: "#34C759",
    label: "OPEN",
  },
  closing: {
    bg: "rgba(255, 149, 0, 0.1)",
    border: "rgba(255, 149, 0, 0.25)",
    color: "#FF9500",
    label: "CLOSING",
  },
  closed: {
    bg: "rgba(255, 59, 48, 0.1)",
    border: "rgba(255, 59, 48, 0.3)",
    color: "#FF3B30",
    label: "CLOSED",
  },
};

function FloodGateCard({ gate, index }: { gate: FloodGate; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const [expanded, setExpanded] = useState<boolean>(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const config = STATUS_CONFIG[gate.status];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  useEffect(() => {
    if (gate.status === "closing") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [gate.status, pulseAnim]);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [expanded, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const levelPct = Math.min(100, Math.max(0, gate.waterLevel));
  const levelColor =
    levelPct > 80 ? "#FF3B30" : levelPct > 60 ? "#FF9500" : levelPct > 40 ? "#FFCC00" : "#34C759";

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={toggleExpand}
        style={[styles.gateCard, { borderColor: config.border }]}
      >
        <View style={styles.gateHeader}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          </Animated.View>
          <View style={styles.gateInfo}>
            <Text style={styles.gateName}>{gate.name}</Text>
            <View style={styles.gateMetaRow}>
              <MapPin size={10} color={WeatherColors.textTertiary} strokeWidth={1.5} />
              <Text style={styles.gateMeta}>
                {gate.location} · {gate.distanceMi} mi away
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <ChevronDown size={16} color={WeatherColors.textTertiary} />
          </Animated.View>
        </View>

        {expanded && (
          <View style={styles.gateDetails}>
            <View style={[styles.detailDivider, { backgroundColor: config.border }]} />
            <View style={styles.waterLevelSection}>
              <View style={styles.waterLevelHeader}>
                <Droplets size={14} color={WeatherColors.precipBlue} strokeWidth={1.5} />
                <Text style={styles.waterLevelLabel}>Water Level</Text>
                <Text style={[styles.waterLevelPct, { color: levelColor }]}>{levelPct}%</Text>
              </View>
              <View style={styles.waterLevelBar}>
                <View
                  style={[
                    styles.waterLevelFill,
                    { width: `${levelPct}%`, backgroundColor: levelColor },
                  ]}
                />
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Clock size={12} color={WeatherColors.textTertiary} strokeWidth={1.5} />
                <Text style={styles.detailLabel}>Updated</Text>
                <Text style={styles.detailValue}>{gate.lastUpdated}</Text>
              </View>
              <View style={styles.detailItem}>
                <TrendingUp size={12} color={WeatherColors.textTertiary} strokeWidth={1.5} />
                <Text style={styles.detailLabel}>Capacity</Text>
                <Text style={styles.detailValue}>{gate.waterLevel}/{gate.maxCapacity}%</Text>
              </View>
            </View>
            {gate.status === "closing" && (
              <View style={styles.warningBanner}>
                <AlertTriangle size={14} color="#FF9500" strokeWidth={2} />
                <Text style={styles.warningText}>
                  Gate is actively closing. Expect traffic delays and possible road closures nearby.
                </Text>
              </View>
            )}
            {gate.status === "closed" && (
              <View style={styles.closedBanner}>
                <AlertTriangle size={14} color="#FF3B30" strokeWidth={2} />
                <Text style={styles.closedBannerText}>
                  Gate is fully closed. High water levels detected. Avoid the area if possible.
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function FloodGatesScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const floodGates = useMemo(
    () => generateFloodGates(selectedLocation.name, selectedLocation.lat, selectedLocation.lon),
    [selectedLocation.name, selectedLocation.lat, selectedLocation.lon]
  );

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, selectedLocation.id]);

  console.log("[FloodGates] Rendering for location:", selectedLocation.name, selectedLocation.lat, selectedLocation.lon, "gates:", floodGates.length);

  const closingCount = floodGates.filter((g) => g.status === "closing").length;
  const closedCount = floodGates.filter((g) => g.status === "closed").length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Flood Gate Alerts" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0A0F1A", "#0F1A2A", "#162030"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />
      <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Droplets size={20} color={WeatherColors.precipBlue} strokeWidth={1.5} />
            <Text style={styles.title}>Flood Gates</Text>
          </View>
          <Text style={styles.subtitle}>
            {selectedLocation.name} area — Monitor nearby flood gate status
          </Text>

          <Animated.View style={[styles.summaryCard, { opacity: fadeAnim }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{floodGates.length}</Text>
                <Text style={styles.summaryLabel}>Monitored</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: "#FF9500" }]}>{closingCount}</Text>
                <Text style={styles.summaryLabel}>Closing</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: "#FF3B30" }]}>{closedCount}</Text>
                <Text style={styles.summaryLabel}>Closed</Text>
              </View>
            </View>
          </Animated.View>

          <View style={styles.notifCard}>
            <View style={styles.notifLeft}>
              {notificationsEnabled ? (
                <Bell size={18} color={WeatherColors.accent} strokeWidth={1.5} />
              ) : (
                <BellOff size={18} color={WeatherColors.textTertiary} strokeWidth={1.5} />
              )}
              <View style={styles.notifText}>
                <Text style={styles.notifTitle}>Gate Status Alerts</Text>
                <Text style={styles.notifDesc}>
                  Get notified when gates close or water levels change
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => {
                setNotificationsEnabled(val);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{
                false: "rgba(255,255,255,0.1)",
                true: "rgba(244, 164, 54, 0.4)",
              }}
              thumbColor={notificationsEnabled ? WeatherColors.accent : "rgba(255,255,255,0.3)"}
              testID="flood-notif-toggle"
            />
          </View>

          {(closingCount > 0 || closedCount > 0) && (
            <View style={styles.alertBanner}>
              <Shield size={16} color="#FF9500" strokeWidth={1.5} />
              <Text style={styles.alertBannerText}>
                {closedCount > 0
                  ? `${closedCount} gate${closedCount > 1 ? "s" : ""} currently closed in your area`
                  : `${closingCount} gate${closingCount > 1 ? "s" : ""} actively closing nearby`}
              </Text>
            </View>
          )}

          <View style={styles.gateList}>
            <Text style={styles.sectionTitle}>Nearby Gates</Text>
            {floodGates.map((gate, i) => (
              <FloodGateCard key={gate.id} gate={gate} index={i} />
            ))}
          </View>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 20,
  },
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 18,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-around" as const,
  },
  summaryItem: {
    alignItems: "center" as const,
    gap: 2,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  notifCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginHorizontal: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 14,
    marginBottom: 14,
  },
  notifLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  notifText: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  notifDesc: {
    fontSize: 11,
    color: WeatherColors.textSecondary,
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginHorizontal: 16,
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 149, 0, 0.25)",
    padding: 12,
    gap: 10,
    marginBottom: 18,
  },
  alertBannerText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFB340",
    flex: 1,
  },
  gateList: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  gateCard: {
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    overflow: "hidden" as const,
  },
  gateHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gateInfo: {
    flex: 1,
  },
  gateName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  gateMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 2,
  },
  gateMeta: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 0.8,
  },
  gateDetails: {
    marginTop: 12,
  },
  detailDivider: {
    height: 1,
    marginBottom: 12,
    opacity: 0.5,
  },
  waterLevelSection: {
    marginBottom: 12,
  },
  waterLevelHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 8,
  },
  waterLevelLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: WeatherColors.textSecondary,
    flex: 1,
  },
  waterLevelPct: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  waterLevelBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  waterLevelFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  detailRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
    marginLeft: "auto" as const,
  },
  warningBanner: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    backgroundColor: "rgba(255, 149, 0, 0.08)",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: "#FFB340",
    flex: 1,
    lineHeight: 17,
  },
  closedBanner: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    backgroundColor: "rgba(255, 59, 48, 0.08)",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  closedBannerText: {
    fontSize: 12,
    color: "#FF6B6B",
    flex: 1,
    lineHeight: 17,
  },
});
