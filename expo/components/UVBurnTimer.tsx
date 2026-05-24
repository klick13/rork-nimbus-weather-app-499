import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Sun, Shield, Clock } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";

interface UVBurnTimerProps {
  uvIndex: number;
}

const SKIN_TYPES = [
  { id: 1, label: "I", desc: "Very Fair", factor: 0.67, color: "#FFE0CC" },
  { id: 2, label: "II", desc: "Fair", factor: 1.0, color: "#FFD1A9" },
  { id: 3, label: "III", desc: "Medium", factor: 1.33, color: "#D4A574" },
  { id: 4, label: "IV", desc: "Olive", factor: 1.67, color: "#B8884B" },
  { id: 5, label: "V", desc: "Brown", factor: 2.5, color: "#8B5E3C" },
  { id: 6, label: "VI", desc: "Dark", factor: 3.33, color: "#5C3A21" },
];

function getUVColor(uv: number): string {
  if (uv <= 2) return "#34C759";
  if (uv <= 5) return "#FFD60A";
  if (uv <= 7) return "#F4A436";
  if (uv <= 10) return "#FF6B6B";
  return "#9B59B6";
}

function getUVLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

export default function UVBurnTimer({ uvIndex }: UVBurnTimerProps) {
  const [skinType, setSkinType] = useState<number>(1);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const uvColor = getUVColor(uvIndex);
  const uvLabel = getUVLabel(uvIndex);

  const burnMinutes = useMemo(() => {
    if (uvIndex <= 0) return null;
    const factor = SKIN_TYPES[skinType]?.factor ?? 1.0;
    return Math.round((200 / uvIndex) * factor);
  }, [uvIndex, skinType]);

  useEffect(() => {
    if (uvIndex >= 6) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [uvIndex, pulseAnim]);

  const formatBurnTime = (mins: number | null): string => {
    if (!mins || mins > 300) return "Low risk";
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins} min`;
  };

  const getProtectionTip = (): string => {
    if (uvIndex <= 2) return "Minimal protection needed";
    if (uvIndex <= 5) return "Wear sunscreen SPF 30+";
    if (uvIndex <= 7) return "Seek shade during midday hours";
    if (uvIndex <= 10) return "Avoid sun exposure 10am-4pm";
    return "Stay indoors if possible";
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sun size={18} color={uvColor} strokeWidth={1.5} />
        <Text style={styles.headerTitle}>UV BURN TIMER</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.uvSection}>
          <Animated.View
            style={[
              styles.uvCircle,
              { borderColor: uvColor, transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={[styles.uvNumber, { color: uvColor }]}>{uvIndex}</Text>
            <Text style={[styles.uvLabel, { color: uvColor }]}>{uvLabel}</Text>
          </Animated.View>

          <View style={styles.burnInfo}>
            <View style={styles.burnTimeRow}>
              <Clock size={18} color={WeatherColors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.burnTimeLabel}>Time to burn</Text>
            </View>
            <Text
              style={[
                styles.burnTimeValue,
                {
                  color:
                    burnMinutes && burnMinutes < 30
                      ? "#FF6B6B"
                      : burnMinutes && burnMinutes < 60
                      ? "#F4A436"
                      : "#34C759",
                },
              ]}
            >
              {formatBurnTime(burnMinutes)}
            </Text>
            <View style={styles.protectionRow}>
              <Shield size={14} color={WeatherColors.textTertiary} strokeWidth={1.5} />
              <Text style={styles.protectionTip}>{getProtectionTip()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.skinSelector}>
          <Text style={styles.skinLabel}>Skin Type</Text>
          <View style={styles.skinPills}>
            {SKIN_TYPES.map((type, idx) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.skinPill,
                  {
                    backgroundColor:
                      skinType === idx ? type.color : "rgba(255,255,255,0.06)",
                  },
                ]}
                onPress={() => setSkinType(idx)}
                testID={`skin-type-${type.id}`}
              >
                <Text
                  style={[
                    styles.skinPillText,
                    {
                      color:
                        skinType === idx ? "#0B1A2E" : WeatherColors.textSecondary,
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
    overflow: "hidden" as const,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 1.2,
  },
  body: {
    padding: 16,
    paddingTop: 12,
  },
  uvSection: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
    marginBottom: 14,
  },
  uvCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  uvNumber: {
    fontSize: 34,
    fontWeight: "800" as const,
  },
  uvLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    marginTop: -2,
  },
  burnInfo: {
    flex: 1,
  },
  burnTimeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginBottom: 2,
  },
  burnTimeLabel: {
    fontSize: 15,
    color: WeatherColors.textSecondary,
  },
  burnTimeValue: {
    fontSize: 31,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  protectionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  protectionTip: {
    fontSize: 14,
    color: WeatherColors.textTertiary,
  },
  skinSelector: {
    borderTopWidth: 1,
    borderTopColor: WeatherColors.separator,
    paddingTop: 12,
  },
  skinLabel: {
    fontSize: 14,
    color: WeatherColors.textTertiary,
    marginBottom: 8,
    fontWeight: "500" as const,
  },
  skinPills: {
    flexDirection: "row" as const,
    gap: 6,
  },
  skinPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center" as const,
  },
  skinPillText: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
});
