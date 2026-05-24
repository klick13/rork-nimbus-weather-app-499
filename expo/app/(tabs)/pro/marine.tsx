import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  Anchor,
  Waves,
  Thermometer,
  Wind,
  Eye,
  Navigation,
  Clock,
  ArrowUp,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import { fetchMarineData } from "@/utils/weatherApi";
import { MarineConditions } from "@/types/subscription";
import ProGate from "@/components/ProGate";

interface MarineMetric {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  color: string;
}

function MetricCard({ metric, index }: { metric: MarineMetric; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const Icon = metric.icon;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  return (
    <Animated.View style={[styles.metricCard, { opacity: fadeAnim }]}>
      <View style={styles.metricHeader}>
        <Icon size={14} color={metric.color} strokeWidth={1.5} />
        <Text style={styles.metricLabel}>{metric.label}</Text>
      </View>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{metric.value}</Text>
        <Text style={styles.metricUnit}>{metric.unit}</Text>
      </View>
    </Animated.View>
  );
}

function buildMetrics(data: MarineConditions): MarineMetric[] {
  return [
    { icon: Waves, label: "WAVE HEIGHT", value: `${data.waveHeight}`, unit: "ft", color: WeatherColors.precipBlue },
    { icon: Clock, label: "WAVE PERIOD", value: `${data.wavePeriod}`, unit: "sec", color: WeatherColors.accentCool },
    { icon: Navigation, label: "SWELL DIR", value: data.swellDirection, unit: "", color: WeatherColors.textSecondary },
    { icon: Thermometer, label: "SEA TEMP", value: `${data.seaTemp}`, unit: "°F", color: WeatherColors.accentWarm },
    { icon: ArrowUp, label: "TIDE", value: data.tideStatus, unit: "", color: "#34C759" },
    { icon: Clock, label: "NEXT TIDE", value: data.nextTide.replace("High at ", "").replace("Low at ", ""), unit: data.nextTide.startsWith("High") ? "High" : "Low", color: WeatherColors.accent },
    { icon: Eye, label: "VISIBILITY", value: `${data.visibility}`, unit: "mi", color: WeatherColors.textSecondary },
    { icon: Wind, label: "WIND GUST", value: `${data.windGust}`, unit: "mph", color: WeatherColors.uvHigh },
  ];
}

export default function MarineScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();

  const marineQuery = useQuery({
    queryKey: ["marine", selectedLocation.lat, selectedLocation.lon],
    queryFn: () => fetchMarineData(selectedLocation.lat, selectedLocation.lon),
    staleTime: 10 * 60 * 1000,
  });

  const data = marineQuery.data;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Marine & Coastal" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0A1520", "#112240", "#1A3A5A"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />
      <ProGate featureName="Marine Conditions">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Anchor size={20} color={WeatherColors.precipBlue} strokeWidth={1.5} />
            <Text style={styles.title}>Marine & Coastal</Text>
          </View>
          <Text style={styles.subtitle}>
            {selectedLocation.name} — Coastal conditions
          </Text>

          {marineQuery.isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WeatherColors.accent} />
              <Text style={styles.loadingText}>Fetching marine data...</Text>
            </View>
          )}

          {data && (
            <>
              <View style={styles.heroCard}>
                <LinearGradient
                  colors={["rgba(92, 184, 255, 0.1)", "rgba(92, 184, 255, 0.02)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.heroRow}>
                  <View style={styles.heroItem}>
                    <Text style={styles.heroValue}>{data.waveHeight} ft</Text>
                    <Text style={styles.heroLabel}>Waves</Text>
                  </View>
                  <View style={styles.heroDivider} />
                  <View style={styles.heroItem}>
                    <Text style={styles.heroValue}>{data.seaTemp}°F</Text>
                    <Text style={styles.heroLabel}>Sea Temp</Text>
                  </View>
                  <View style={styles.heroDivider} />
                  <View style={styles.heroItem}>
                    <Text style={styles.heroValue}>{data.tideStatus}</Text>
                    <Text style={styles.heroLabel}>Tide</Text>
                  </View>
                </View>
              </View>

              <View style={styles.grid}>
                {buildMetrics(data).map((metric, i) => (
                  <MetricCard key={metric.label} metric={metric} index={i} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </ProGate>
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
  loadingContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: WeatherColors.textSecondary,
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(92, 184, 255, 0.15)",
    padding: 20,
    marginBottom: 20,
    overflow: "hidden" as const,
  },
  heroRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-around" as const,
  },
  heroItem: {
    alignItems: "center" as const,
  },
  heroValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
  },
  heroLabel: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: WeatherColors.separator,
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    paddingHorizontal: 16,
    gap: 10,
  },
  metricCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 14,
    gap: 8,
  },
  metricHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 0.8,
  },
  metricValueRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 3,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "400" as const,
    color: WeatherColors.textPrimary,
  },
  metricUnit: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
  },
});
