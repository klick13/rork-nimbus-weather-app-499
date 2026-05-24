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
import { Sprout, Snowflake, Thermometer, Droplets, Sun, AlertTriangle, Check, X as XIcon } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import ProGate from "@/components/ProGate";

interface FrostData {
  riskLevel: "none" | "light" | "moderate" | "severe";
  riskColor: string;
  riskLabel: string;
  message: string;
  hoursUntilFrost: number | null;
}

function calculateFrostRisk(temp: number, dewPoint: number, windSpeed: number, low: number): FrostData {
  const frostTemp = 36;

  if (low <= 28) {
    return { riskLevel: "severe", riskColor: "#FF6B6B", riskLabel: "Severe", message: "Hard freeze expected. Protect all outdoor plants.", hoursUntilFrost: null };
  }
  if (low <= frostTemp) {
    const hoursEstimate = Math.max(1, Math.round((temp - frostTemp) / 3));
    return { riskLevel: "moderate", riskColor: "#F4A436", riskLabel: "Moderate", message: "Light frost possible tonight. Cover tender plants.", hoursUntilFrost: hoursEstimate };
  }
  if (low <= 40 && dewPoint < 35 && windSpeed < 5) {
    return { riskLevel: "light", riskColor: "#FFD60A", riskLabel: "Light", message: "Frost unlikely but monitor overnight lows.", hoursUntilFrost: null };
  }
  return { riskLevel: "none", riskColor: "#34C759", riskLabel: "None", message: "No frost risk. Plants are safe.", hoursUntilFrost: null };
}

interface GardenCondition {
  label: string;
  value: string;
  ideal: string;
  met: boolean;
}

function getGardenConditions(temp: number, humidity: number, windSpeed: number, uvIndex: number): GardenCondition[] {
  return [
    { label: "Temperature", value: `${temp}°F`, ideal: "50-85°F", met: temp >= 50 && temp <= 85 },
    { label: "Humidity", value: `${humidity}%`, ideal: "40-70%", met: humidity >= 40 && humidity <= 70 },
    { label: "Wind", value: `${windSpeed} mph`, ideal: "< 15 mph", met: windSpeed < 15 },
    { label: "UV Index", value: `${uvIndex}`, ideal: "3-7", met: uvIndex >= 3 && uvIndex <= 7 },
  ];
}

function getWateringAdvice(temp: number, humidity: number, windSpeed: number, precipChance: number): { advice: string; color: string } {
  if (precipChance > 60) return { advice: "Rain expected — skip watering today", color: "#4A9FE8" };
  if (temp > 85 && humidity < 40) return { advice: "Hot & dry — water deeply in early morning", color: "#FF6B6B" };
  if (temp > 75 && windSpeed > 10) return { advice: "Windy conditions — water at soil level to reduce evaporation", color: "#F4A436" };
  if (temp < 45) return { advice: "Cool temps — reduce watering frequency", color: "#4A9FE8" };
  return { advice: "Normal conditions — water as usual in early morning", color: "#34C759" };
}

function getGrowingDegreeDays(high: number, low: number): number {
  const base = 50;
  const avg = (high + low) / 2;
  return Math.max(0, Math.round(avg - base));
}

export default function GardeningScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();
  const details = selectedLocation.details;
  const precipChance = selectedLocation.hourly[0]?.precipChance ?? 0;

  const frostData = useMemo(
    () => calculateFrostRisk(selectedLocation.currentTemp, details.dewPoint, details.windSpeed, selectedLocation.low),
    [selectedLocation.currentTemp, details.dewPoint, details.windSpeed, selectedLocation.low]
  );

  const gardenConditions = useMemo(
    () => getGardenConditions(selectedLocation.currentTemp, details.humidity, details.windSpeed, details.uvIndex),
    [selectedLocation.currentTemp, details.humidity, details.windSpeed, details.uvIndex]
  );

  const wateringAdvice = useMemo(
    () => getWateringAdvice(selectedLocation.currentTemp, details.humidity, details.windSpeed, precipChance),
    [selectedLocation.currentTemp, details.humidity, details.windSpeed, precipChance]
  );

  const gdd = useMemo(
    () => getGrowingDegreeDays(selectedLocation.high, selectedLocation.low),
    [selectedLocation.high, selectedLocation.low]
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const plantingScore = useMemo(() => {
    const metCount = gardenConditions.filter((c) => c.met).length;
    if (frostData.riskLevel === "severe") return { label: "Poor", color: "#FF6B6B", score: 15 };
    if (frostData.riskLevel === "moderate") return { label: "Fair", color: "#F4A436", score: 35 };
    if (metCount >= 3) return { label: "Excellent", color: "#34C759", score: 90 };
    if (metCount >= 2) return { label: "Good", color: "#4A9FE8", score: 70 };
    return { label: "Fair", color: "#F4A436", score: 45 };
  }, [gardenConditions, frostData.riskLevel]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Gardening" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0B1A12", "#122A18", "#1A3A22"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} />
      <ProGate featureName="Gardening & Frost Alerts">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.header}>
              <Sprout size={20} color="#34C759" strokeWidth={1.5} />
              <Text style={styles.title}>Garden Forecast</Text>
            </View>
            <Text style={styles.subtitle}>{selectedLocation.name} — Planting & frost conditions</Text>

            <View style={[styles.frostCard, { borderColor: `${frostData.riskColor}30` }]}>
              <View style={styles.frostHeader}>
                <View style={[styles.frostIconWrap, { backgroundColor: `${frostData.riskColor}15` }]}>
                  <Snowflake size={20} color={frostData.riskColor} strokeWidth={1.5} />
                </View>
                <View style={styles.frostTitleSection}>
                  <Text style={styles.frostTitle}>Frost Risk</Text>
                  <Text style={[styles.frostLevel, { color: frostData.riskColor }]}>{frostData.riskLabel}</Text>
                </View>
                {frostData.riskLevel !== "none" && (
                  <View style={[styles.alertBadge, { backgroundColor: `${frostData.riskColor}20` }]}>
                    <AlertTriangle size={12} color={frostData.riskColor} strokeWidth={2} />
                  </View>
                )}
              </View>
              <Text style={styles.frostMessage}>{frostData.message}</Text>
              <View style={styles.frostStats}>
                <View style={styles.frostStat}>
                  <Text style={styles.frostStatLabel}>Tonight's Low</Text>
                  <Text style={styles.frostStatValue}>{selectedLocation.low}°F</Text>
                </View>
                <View style={styles.frostStat}>
                  <Text style={styles.frostStatLabel}>Dew Point</Text>
                  <Text style={styles.frostStatValue}>{details.dewPoint}°F</Text>
                </View>
                <View style={styles.frostStat}>
                  <Text style={styles.frostStatLabel}>Wind</Text>
                  <Text style={styles.frostStatValue}>{details.windSpeed} mph</Text>
                </View>
              </View>
            </View>

            <View style={styles.plantingCard}>
              <View style={styles.plantingHeader}>
                <Sprout size={16} color={plantingScore.color} strokeWidth={1.5} />
                <Text style={styles.plantingTitle}>Planting Conditions</Text>
                <View style={[styles.scorePill, { backgroundColor: `${plantingScore.color}20` }]}>
                  <Text style={[styles.scoreText, { color: plantingScore.color }]}>{plantingScore.label}</Text>
                </View>
              </View>
              <View style={styles.conditionsGrid}>
                {gardenConditions.map((cond) => (
                  <View key={cond.label} style={styles.conditionRow}>
                    <View style={styles.conditionLeft}>
                      {cond.met ? (
                        <Check size={13} color="#34C759" strokeWidth={2.5} />
                      ) : (
                        <XIcon size={13} color="#FF6B6B" strokeWidth={2.5} />
                      )}
                      <Text style={styles.conditionLabel}>{cond.label}</Text>
                    </View>
                    <View style={styles.conditionRight}>
                      <Text style={styles.conditionValue}>{cond.value}</Text>
                      <Text style={styles.conditionIdeal}>ideal: {cond.ideal}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Droplets size={16} color="#4A9FE8" strokeWidth={1.5} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Watering Advice</Text>
                  <Text style={[styles.infoMessage, { color: wateringAdvice.color }]}>{wateringAdvice.advice}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Sun size={16} color="#F4A436" strokeWidth={1.5} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Growing Degree Days</Text>
                  <Text style={styles.infoMessage}>Today: {gdd} GDD (base 50°F)</Text>
                </View>
              </View>
            </View>

            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Thermometer size={14} color={WeatherColors.accent} strokeWidth={1.5} />
                <Text style={styles.tipsTitle}>Today's Garden Tips</Text>
              </View>
              {[
                selectedLocation.currentTemp > 85
                  ? "Water deeply in early morning to prevent evaporation"
                  : "Ideal temperature for transplanting seedlings",
                details.uvIndex >= 7
                  ? "High UV — newly planted seedlings may need shade cloth"
                  : "UV levels are moderate — good for plant growth",
                details.windSpeed > 15
                  ? "Stake tall plants and protect young seedlings from wind"
                  : "Calm enough for pesticide/fertilizer application",
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
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
  frostCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, marginBottom: 12,
  },
  frostHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, marginBottom: 10 },
  frostIconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: "center" as const, justifyContent: "center" as const },
  frostTitleSection: { flex: 1 },
  frostTitle: { fontSize: 16, fontWeight: "600" as const, color: WeatherColors.textPrimary },
  frostLevel: { fontSize: 13, fontWeight: "700" as const, marginTop: 1 },
  alertBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center" as const, justifyContent: "center" as const },
  frostMessage: { fontSize: 13, color: WeatherColors.textSecondary, lineHeight: 18, marginBottom: 12 },
  frostStats: { flexDirection: "row" as const, gap: 12 },
  frostStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 10, alignItems: "center" as const },
  frostStatLabel: { fontSize: 10, color: WeatherColors.textTertiary, marginBottom: 4 },
  frostStatValue: { fontSize: 16, fontWeight: "700" as const, color: WeatherColors.textPrimary },
  plantingCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder, marginBottom: 12,
  },
  plantingHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 14 },
  plantingTitle: { fontSize: 15, fontWeight: "600" as const, color: WeatherColors.textPrimary, flex: 1 },
  scorePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  scoreText: { fontSize: 11, fontWeight: "700" as const },
  conditionsGrid: { gap: 10 },
  conditionRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  conditionLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  conditionLabel: { fontSize: 13, color: WeatherColors.textPrimary, fontWeight: "500" as const },
  conditionRight: { alignItems: "flex-end" as const },
  conditionValue: { fontSize: 13, color: WeatherColors.textPrimary, fontWeight: "600" as const },
  conditionIdeal: { fontSize: 10, color: WeatherColors.textTertiary },
  infoCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 14,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder, marginBottom: 12,
  },
  infoRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "600" as const, color: WeatherColors.textPrimary, marginBottom: 4 },
  infoMessage: { fontSize: 13, lineHeight: 18 },
  tipsCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 14,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder, marginBottom: 12,
  },
  tipsHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: 15, fontWeight: "600" as const, color: WeatherColors.textPrimary },
  tipRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 10, marginBottom: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#34C759", marginTop: 6 },
  tipText: { fontSize: 13, color: WeatherColors.textSecondary, lineHeight: 18, flex: 1 },
});
