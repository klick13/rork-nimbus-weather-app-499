import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  Droplets,
  AlertTriangle,
  MapPin,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
  open: { bg: "rgba(52, 199, 89, 0.1)", color: "#34C759", label: "OPEN" },
  closing: { bg: "rgba(255, 149, 0, 0.1)", color: "#FF9500", label: "CLOSING" },
  closed: { bg: "rgba(255, 59, 48, 0.1)", color: "#FF3B30", label: "CLOSED" },
};

function CompactGateRow({ gate }: { gate: FloodGate }) {
  const config = STATUS_CONFIG[gate.status];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (gate.status === "closing") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [gate.status, pulseAnim]);

  return (
    <View style={styles.gateRow}>
      <Animated.View style={{ opacity: pulseAnim }}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
      </Animated.View>
      <View style={styles.gateRowInfo}>
        <Text style={styles.gateRowName} numberOfLines={1}>{gate.name}</Text>
        <Text style={styles.gateRowMeta}>{gate.distanceMi} mi away</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusPillText, { color: config.color }]}>{config.label}</Text>
      </View>
    </View>
  );
}

export default function FloodGateWidget() {
  const { selectedLocation } = useWeather();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const floodGates = useMemo(
    () => generateFloodGates(selectedLocation.name, selectedLocation.lat, selectedLocation.lon),
    [selectedLocation.name, selectedLocation.lat, selectedLocation.lon]
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const closingCount = floodGates.filter((g) => g.status === "closing").length;
  const closedCount = floodGates.filter((g) => g.status === "closed").length;
  const hasWarning = closingCount > 0 || closedCount > 0;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Droplets size={20} color={WeatherColors.precipBlue} strokeWidth={1.5} />
          <Text style={styles.headerTitle}>FLOOD GATES</Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/pro/flood-gates" as never);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="flood-gate-widget-expand"
        >
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronRight size={16} color={WeatherColors.accent} />
        </TouchableOpacity>
      </View>

      {hasWarning && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={17} color="#FF9500" strokeWidth={2} />
          <Text style={styles.warningText}>
            {closedCount > 0
              ? `${closedCount} gate${closedCount > 1 ? "s" : ""} closed nearby`
              : `${closingCount} gate${closingCount > 1 ? "s" : ""} actively closing`}
          </Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{floodGates.length}</Text>
          <Text style={styles.summaryLabel}>Monitored</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, closingCount > 0 && { color: "#FF9500" }]}>{closingCount}</Text>
          <Text style={styles.summaryLabel}>Closing</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, closedCount > 0 && { color: "#FF3B30" }]}>{closedCount}</Text>
          <Text style={styles.summaryLabel}>Closed</Text>
        </View>
      </View>

      <View style={styles.gateList}>
        {floodGates.slice(0, 3).map((gate) => (
          <CompactGateRow key={gate.id} gate={gate} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 14,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 1.2,
  },
  viewAllButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },
  warningBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 149, 0, 0.08)",
    borderRadius: 10,
    padding: 9,
    gap: 8,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#FFB340",
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-around" as const,
    paddingVertical: 8,
    marginBottom: 8,
  },
  summaryItem: {
    alignItems: "center" as const,
    gap: 1,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gateList: {
    gap: 6,
  },
  gateRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gateRowInfo: {
    flex: 1,
  },
  gateRowName: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  gateRowMeta: {
    fontSize: 13,
    color: WeatherColors.textTertiary,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 0.6,
  },
});
