import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Shield,
  Thermometer,
  Droplets,
  Wind,
  CloudLightning,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";

interface PetSafetyProps {
  temp: number;
  humidity: number;
  windSpeed: number;
  conditionId: string;
}

interface PetHazard {
  id: string;
  label: string;
  level: "safe" | "caution" | "danger";
  message: string;
  icon: LucideIcon;
}

const LEVEL_COLORS: Record<string, string> = {
  safe: "#34C759",
  caution: "#F4A436",
  danger: "#FF6B6B",
};

function getPavementDanger(temp: number): { level: "safe" | "caution" | "danger"; message: string } {
  if (temp >= 87) return { level: "danger", message: "Pavement can burn paws! Walk on grass." };
  if (temp >= 77) return { level: "caution", message: "Pavement may be hot. Check with hand first." };
  return { level: "safe", message: "Pavement temperature is safe for paws." };
}

function getHeatRisk(temp: number, humidity: number): { level: "safe" | "caution" | "danger"; message: string } {
  const heatIndex = temp + (humidity > 40 ? (humidity - 40) * 0.15 : 0);
  if (heatIndex >= 95) return { level: "danger", message: "Heat stroke risk! Keep pets indoors." };
  if (heatIndex >= 80) return { level: "caution", message: "Limit outdoor time. Provide shade & water." };
  return { level: "safe", message: "Comfortable for outdoor activities." };
}

function getColdRisk(temp: number, windSpeed: number): { level: "safe" | "caution" | "danger"; message: string } {
  const windChill = temp - (windSpeed > 5 ? windSpeed * 0.7 : 0);
  if (windChill <= 20) return { level: "danger", message: "Frostbite risk! Limit walks to 10-15 min." };
  if (windChill <= 40) return { level: "caution", message: "Short-hair breeds may need coats." };
  return { level: "safe", message: "No cold weather concerns for most breeds." };
}

function getStormRisk(conditionId: string, windSpeed: number): { level: "safe" | "caution" | "danger"; message: string } {
  if (conditionId === "rainy" && windSpeed > 20) return { level: "danger", message: "Thunderstorms — keep anxious pets indoors." };
  if (conditionId === "rainy" || windSpeed > 15) return { level: "caution", message: "Storms possible. Have a safe space ready." };
  return { level: "safe", message: "No storm-related anxiety concerns." };
}

export default function PetSafetyAlerts({ temp, humidity, windSpeed, conditionId }: PetSafetyProps) {
  const hazards = useMemo((): PetHazard[] => {
    const pavement = getPavementDanger(temp);
    const heat = getHeatRisk(temp, humidity);
    const cold = getColdRisk(temp, windSpeed);
    const storm = getStormRisk(conditionId, windSpeed);
    return [
      { id: "pavement", label: "Paw Safety", level: pavement.level, message: pavement.message, icon: Thermometer },
      { id: "heat", label: "Heat Stroke", level: heat.level, message: heat.message, icon: Droplets },
      { id: "cold", label: "Cold Exposure", level: cold.level, message: cold.message, icon: Wind },
      { id: "storm", label: "Storm Anxiety", level: storm.level, message: storm.message, icon: CloudLightning },
    ];
  }, [temp, humidity, windSpeed, conditionId]);

  const overallLevel = useMemo(() => {
    if (hazards.some((h) => h.level === "danger")) return "danger";
    if (hazards.some((h) => h.level === "caution")) return "caution";
    return "safe";
  }, [hazards]);

  const overallColor = LEVEL_COLORS[overallLevel] ?? "#34C759";
  const overallLabel =
    overallLevel === "safe"
      ? "Safe for Pets"
      : overallLevel === "caution"
      ? "Use Caution"
      : "Keep Pets Inside";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={18} color={overallColor} strokeWidth={1.5} />
        <Text style={styles.headerTitle}>PET SAFETY</Text>
        <View style={[styles.overallPill, { backgroundColor: `${overallColor}20` }]}>
          <View style={[styles.dot, { backgroundColor: overallColor }]} />
          <Text style={[styles.overallText, { color: overallColor }]}>{overallLabel}</Text>
        </View>
      </View>

      <View style={styles.hazardList}>
        {hazards.map((hazard) => {
          const HIcon = hazard.icon;
          const color = LEVEL_COLORS[hazard.level] ?? "#34C759";
          return (
            <View key={hazard.id} style={styles.hazardRow}>
              <View style={[styles.hazardIcon, { backgroundColor: `${color}15` }]}>
                <HIcon size={18} color={color} strokeWidth={1.5} />
              </View>
              <View style={styles.hazardInfo}>
                <Text style={styles.hazardLabel}>{hazard.label}</Text>
                <Text style={styles.hazardMessage} numberOfLines={1}>
                  {hazard.message}
                </Text>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: `${color}20` }]}>
                <Text style={[styles.levelText, { color }]}>
                  {hazard.level === "safe" ? "OK" : hazard.level === "caution" ? "!" : "!!"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 16,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 1.2,
    flex: 1,
  },
  overallPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  overallText: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  hazardList: {
    gap: 10,
  },
  hazardRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  hazardIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  hazardInfo: {
    flex: 1,
  },
  hazardLabel: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  hazardMessage: {
    fontSize: 14,
    color: WeatherColors.textTertiary,
    marginTop: 1,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  levelText: {
    fontSize: 15,
    fontWeight: "800" as const,
  },
});
