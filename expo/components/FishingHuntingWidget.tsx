import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Fish, Moon, Target, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";

function getMoonPhase(): { name: string; illumination: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.5305882;
  const phaseNorm = phase - Math.floor(phase);

  if (phaseNorm < 0.0625) return { name: "New Moon", illumination: 0 };
  if (phaseNorm < 0.1875) return { name: "Waxing Crescent", illumination: 25 };
  if (phaseNorm < 0.3125) return { name: "First Quarter", illumination: 50 };
  if (phaseNorm < 0.4375) return { name: "Waxing Gibbous", illumination: 75 };
  if (phaseNorm < 0.5625) return { name: "Full Moon", illumination: 100 };
  if (phaseNorm < 0.6875) return { name: "Waning Gibbous", illumination: 75 };
  if (phaseNorm < 0.8125) return { name: "Last Quarter", illumination: 50 };
  if (phaseNorm < 0.9375) return { name: "Waning Crescent", illumination: 25 };
  return { name: "New Moon", illumination: 0 };
}

function getActivityLevel(
  pressure: number,
  temp: number,
  windSpeed: number,
  type: "fish" | "game"
): { level: string; score: number; color: string } {
  let score = 50;

  if (type === "fish") {
    if (pressure >= 1010 && pressure <= 1020) score += 20;
    else if (pressure < 1005 || pressure > 1025) score -= 15;
    if (temp >= 55 && temp <= 75) score += 15;
    else if (temp < 40 || temp > 90) score -= 20;
    if (windSpeed < 10) score += 10;
    else if (windSpeed > 20) score -= 15;
  } else {
    if (temp >= 35 && temp <= 60) score += 20;
    else if (temp > 80) score -= 20;
    if (windSpeed >= 5 && windSpeed <= 15) score += 15;
    else if (windSpeed > 25) score -= 15;
    if (pressure < 1010) score += 10;
  }

  score = Math.min(100, Math.max(0, score));
  const level = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";
  const color = score >= 80 ? "#34C759" : score >= 60 ? "#4A9FE8" : score >= 40 ? "#F4A436" : "#FF6B6B";
  return { level, score, color };
}

function MiniActivityBar({ label, score, color, index }: { label: string; score: number; color: string; index: number }) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: score / 100,
      duration: 800,
      delay: index * 150 + 200,
      useNativeDriver: false,
    }).start();
  }, [barAnim, score, index]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.activityRow}>
      <View style={styles.activityLabelRow}>
        <Text style={styles.activityLabel}>{label}</Text>
        <Text style={[styles.activityScore, { color }]}>{score}</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function FishingHuntingWidget() {
  const { selectedLocation } = useWeather();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const details = selectedLocation.details;

  const moonPhase = useMemo(() => getMoonPhase(), []);
  const fishActivity = useMemo(
    () => getActivityLevel(details.pressure, selectedLocation.currentTemp, details.windSpeed, "fish"),
    [details.pressure, selectedLocation.currentTemp, details.windSpeed]
  );
  const gameActivity = useMemo(
    () => getActivityLevel(details.pressure, selectedLocation.currentTemp, details.windSpeed, "game"),
    [details.pressure, selectedLocation.currentTemp, details.windSpeed]
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Fish size={20} color="#34C759" strokeWidth={1.5} />
          <Text style={styles.headerTitle}>FISH & HUNT</Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/pro/fishing-hunting" as never);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="fishing-hunting-widget-expand"
        >
          <Text style={styles.viewAllText}>Details</Text>
          <ChevronRight size={16} color={WeatherColors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.moonRow}>
        <View style={styles.moonVisual}>
          <View style={[styles.moonCircle, { opacity: moonPhase.illumination / 100 }]} />
          <View style={styles.moonCircleOutline} />
        </View>
        <View style={styles.moonInfo}>
          <Text style={styles.moonName}>{moonPhase.name}</Text>
          <Text style={styles.moonIllum}>{moonPhase.illumination}% illumination</Text>
        </View>
      </View>

      <View style={styles.activitiesSection}>
        <View style={styles.activityItem}>
          <View style={styles.activityIconRow}>
            <View style={[styles.activityIconWrap, { backgroundColor: `${fishActivity.color}15` }]}>
              <Fish size={18} color={fishActivity.color} strokeWidth={1.5} />
            </View>
            <View style={[styles.levelPill, { backgroundColor: `${fishActivity.color}20` }]}>
              <Text style={[styles.levelText, { color: fishActivity.color }]}>{fishActivity.level}</Text>
            </View>
          </View>
          <MiniActivityBar label="Fishing" score={fishActivity.score} color={fishActivity.color} index={0} />
        </View>

        <View style={styles.activityDivider} />

        <View style={styles.activityItem}>
          <View style={styles.activityIconRow}>
            <View style={[styles.activityIconWrap, { backgroundColor: `${gameActivity.color}15` }]}>
              <Target size={18} color={gameActivity.color} strokeWidth={1.5} />
            </View>
            <View style={[styles.levelPill, { backgroundColor: `${gameActivity.color}20` }]}>
              <Text style={[styles.levelText, { color: gameActivity.color }]}>{gameActivity.level}</Text>
            </View>
          </View>
          <MiniActivityBar label="Hunting" score={gameActivity.score} color={gameActivity.color} index={1} />
        </View>
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
  moonRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: "rgba(255, 214, 10, 0.05)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  moonVisual: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  moonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFD60A",
    position: "absolute" as const,
  },
  moonCircleOutline: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "rgba(255, 214, 10, 0.3)",
  },
  moonInfo: {
    flex: 1,
  },
  moonName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
  },
  moonIllum: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
    marginTop: 1,
  },
  activitiesSection: {
    gap: 10,
  },
  activityItem: {
    gap: 6,
  },
  activityIconRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  levelPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  activityDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  activityRow: {
    gap: 4,
  },
  activityLabelRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: WeatherColors.textSecondary,
  },
  activityScore: {
    fontSize: 17,
    fontWeight: "700" as const,
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden" as const,
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
});
