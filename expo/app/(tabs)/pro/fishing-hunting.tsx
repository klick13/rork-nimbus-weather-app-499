import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Fish, Moon, Clock, Thermometer, Wind, Droplets, Target } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";

function getMoonPhase(): { name: string; emoji: string; illumination: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.5305882;
  const phaseNorm = phase - Math.floor(phase);

  if (phaseNorm < 0.0625) return { name: "New Moon", emoji: "New", illumination: 0 };
  if (phaseNorm < 0.1875) return { name: "Waxing Crescent", emoji: "Wax Cresc", illumination: 25 };
  if (phaseNorm < 0.3125) return { name: "First Quarter", emoji: "1st Qtr", illumination: 50 };
  if (phaseNorm < 0.4375) return { name: "Waxing Gibbous", emoji: "Wax Gibb", illumination: 75 };
  if (phaseNorm < 0.5625) return { name: "Full Moon", emoji: "Full", illumination: 100 };
  if (phaseNorm < 0.6875) return { name: "Waning Gibbous", emoji: "Wan Gibb", illumination: 75 };
  if (phaseNorm < 0.8125) return { name: "Last Quarter", emoji: "Last Qtr", illumination: 50 };
  if (phaseNorm < 0.9375) return { name: "Waning Crescent", emoji: "Wan Cresc", illumination: 25 };
  return { name: "New Moon", emoji: "New", illumination: 0 };
}

function getSolunarPeriods(): { major: string[]; minor: string[] } {
  const now = new Date();
  const hour = now.getHours();
  const majorStart1 = (hour + 3) % 24;
  const majorStart2 = (hour + 15) % 24;
  const minorStart1 = (hour + 6) % 24;
  const minorStart2 = (hour + 18) % 24;

  const formatPeriod = (h: number): string => {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const endH = (h + 2) % 24;
    const endAmpm = endH >= 12 ? "PM" : "AM";
    const endH12 = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH;
    return `${h12}:00 ${ampm} - ${endH12}:00 ${endAmpm}`;
  };

  return {
    major: [formatPeriod(majorStart1), formatPeriod(majorStart2)],
    minor: [formatPeriod(minorStart1), formatPeriod(minorStart2)],
  };
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

interface ActivityCardProps {
  title: string;
  icon: LucideIcon;
  score: number;
  level: string;
  levelColor: string;
  factors: { label: string; value: string; good: boolean }[];
  index: number;
}

function ActivityCard({ title, icon: Icon, score, level, levelColor, factors, index }: ActivityCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true }),
    ]).start();
    Animated.timing(barAnim, { toValue: score / 100, duration: 1000, delay: index * 100 + 200, useNativeDriver: false }).start();
  }, [fadeAnim, slideAnim, barAnim, index, score]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <Animated.View style={[styles.activityCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.activityHeader}>
        <View style={[styles.activityIconWrap, { backgroundColor: `${levelColor}15` }]}>
          <Icon size={20} color={levelColor} strokeWidth={1.5} />
        </View>
        <View style={styles.activityTitleSection}>
          <Text style={styles.activityTitle}>{title}</Text>
          <View style={styles.activityScoreRow}>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: levelColor }]} />
            </View>
            <Text style={[styles.activityScore, { color: levelColor }]}>{score}</Text>
          </View>
        </View>
        <View style={[styles.levelPill, { backgroundColor: `${levelColor}20` }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>{level}</Text>
        </View>
      </View>

      <View style={styles.factorsGrid}>
        {factors.map((f) => (
          <View key={f.label} style={styles.factorRow}>
            <Text style={styles.factorLabel}>{f.label}</Text>
            <Text style={[styles.factorValue, { color: f.good ? "#34C759" : WeatherColors.textSecondary }]}>{f.value}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function FishingHuntingScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();
  const details = selectedLocation.details;

  const moonPhase = useMemo(() => getMoonPhase(), []);
  const solunar = useMemo(() => getSolunarPeriods(), []);
  const fishActivity = useMemo(
    () => getActivityLevel(details.pressure, selectedLocation.currentTemp, details.windSpeed, "fish"),
    [details.pressure, selectedLocation.currentTemp, details.windSpeed]
  );
  const gameActivity = useMemo(
    () => getActivityLevel(details.pressure, selectedLocation.currentTemp, details.windSpeed, "game"),
    [details.pressure, selectedLocation.currentTemp, details.windSpeed]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Fishing & Hunting" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0B1A1E", "#122A20", "#1A3A2B"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} />
      <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Fish size={20} color="#34C759" strokeWidth={1.5} />
            <Text style={styles.title}>Fish & Hunt</Text>
          </View>
          <Text style={styles.subtitle}>{selectedLocation.name} — Conditions & Solunar</Text>

          <View style={styles.moonCard}>
            <View style={styles.moonHeader}>
              <Moon size={18} color="#FFD60A" strokeWidth={1.5} />
              <Text style={styles.moonTitle}>Moon Phase</Text>
            </View>
            <View style={styles.moonBody}>
              <View style={styles.moonVisual}>
                <View style={[styles.moonCircle, { opacity: moonPhase.illumination / 100 }]} />
                <View style={styles.moonCircleOutline} />
              </View>
              <View style={styles.moonInfo}>
                <Text style={styles.moonName}>{moonPhase.name}</Text>
                <Text style={styles.moonIllum}>{moonPhase.illumination}% illumination</Text>
              </View>
            </View>
          </View>

          <View style={styles.solunarCard}>
            <View style={styles.solunarHeader}>
              <Clock size={16} color={WeatherColors.accent} strokeWidth={1.5} />
              <Text style={styles.solunarTitle}>Solunar Feeding Times</Text>
            </View>
            <View style={styles.solunarSection}>
              <View style={styles.solunarBadge}>
                <Target size={12} color="#34C759" strokeWidth={2} />
                <Text style={styles.solunarBadgeText}>MAJOR</Text>
              </View>
              {solunar.major.map((period, i) => (
                <Text key={`maj-${i}`} style={styles.solunarTime}>{period}</Text>
              ))}
            </View>
            <View style={styles.solunarDivider} />
            <View style={styles.solunarSection}>
              <View style={[styles.solunarBadge, { backgroundColor: "rgba(74, 159, 232, 0.15)" }]}>
                <Target size={12} color="#4A9FE8" strokeWidth={2} />
                <Text style={[styles.solunarBadgeText, { color: "#4A9FE8" }]}>MINOR</Text>
              </View>
              {solunar.minor.map((period, i) => (
                <Text key={`min-${i}`} style={styles.solunarTime}>{period}</Text>
              ))}
            </View>
          </View>

          <ActivityCard
            title="Fishing Activity"
            icon={Fish}
            score={fishActivity.score}
            level={fishActivity.level}
            levelColor={fishActivity.color}
            index={0}
            factors={[
              { label: "Pressure", value: `${details.pressure} mb`, good: details.pressure >= 1010 && details.pressure <= 1020 },
              { label: "Temperature", value: `${selectedLocation.currentTemp}°F`, good: selectedLocation.currentTemp >= 55 && selectedLocation.currentTemp <= 75 },
              { label: "Wind", value: `${details.windSpeed} mph`, good: details.windSpeed < 10 },
              { label: "Humidity", value: `${details.humidity}%`, good: details.humidity < 80 },
            ]}
          />

          <ActivityCard
            title="Hunting Activity"
            icon={Target}
            score={gameActivity.score}
            level={gameActivity.level}
            levelColor={gameActivity.color}
            index={1}
            factors={[
              { label: "Temperature", value: `${selectedLocation.currentTemp}°F`, good: selectedLocation.currentTemp >= 35 && selectedLocation.currentTemp <= 60 },
              { label: "Wind", value: `${details.windSpeed} mph`, good: details.windSpeed >= 5 && details.windSpeed <= 15 },
              { label: "Pressure", value: `${details.pressure} mb`, good: details.pressure < 1010 },
              { label: "Moon", value: moonPhase.emoji, good: moonPhase.illumination < 50 },
            ]}
          />
        </ScrollView>
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
  moonCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    marginBottom: 12,
  },
  moonHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 12 },
  moonTitle: { fontSize: 15, fontWeight: "600" as const, color: WeatherColors.textPrimary },
  moonBody: { flexDirection: "row" as const, alignItems: "center" as const, gap: 16 },
  moonVisual: { width: 56, height: 56, alignItems: "center" as const, justifyContent: "center" as const },
  moonCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFD60A", position: "absolute" as const },
  moonCircleOutline: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255, 214, 10, 0.3)" },
  moonInfo: { flex: 1 },
  moonName: { fontSize: 18, fontWeight: "700" as const, color: WeatherColors.textPrimary },
  moonIllum: { fontSize: 13, color: WeatherColors.textSecondary, marginTop: 2 },
  solunarCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    marginBottom: 12,
  },
  solunarHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 14 },
  solunarTitle: { fontSize: 15, fontWeight: "600" as const, color: WeatherColors.textPrimary },
  solunarSection: { gap: 6 },
  solunarBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: "rgba(52, 199, 89, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start" as const,
    marginBottom: 4,
  },
  solunarBadgeText: { fontSize: 10, fontWeight: "800" as const, color: "#34C759", letterSpacing: 0.8 },
  solunarTime: { fontSize: 14, color: WeatherColors.textPrimary, fontWeight: "500" as const, paddingLeft: 4 },
  solunarDivider: { height: 1, backgroundColor: WeatherColors.separator, marginVertical: 12 },
  activityCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    marginBottom: 12,
  },
  activityHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, marginBottom: 14 },
  activityIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const },
  activityTitleSection: { flex: 1 },
  activityTitle: { fontSize: 16, fontWeight: "600" as const, color: WeatherColors.textPrimary, marginBottom: 4 },
  activityScoreRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" as const },
  barFill: { height: "100%", borderRadius: 3 },
  activityScore: { fontSize: 14, fontWeight: "700" as const, minWidth: 24 },
  levelPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  levelText: { fontSize: 11, fontWeight: "700" as const },
  factorsGrid: { gap: 8 },
  factorRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  factorLabel: { fontSize: 13, color: WeatherColors.textTertiary, fontWeight: "500" as const },
  factorValue: { fontSize: 13, fontWeight: "600" as const },
});
