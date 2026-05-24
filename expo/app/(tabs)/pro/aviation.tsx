import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  Plane,
  Eye,
  Wind,
  AlertTriangle,
  Snowflake,
  Mountain,
  Cloud,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import { fetchAviationData } from "@/utils/weatherApi";
import ProGate from "@/components/ProGate";

const FLIGHT_CAT_COLORS: Record<string, { bg: string; text: string }> = {
  VFR: { bg: "rgba(52, 199, 89, 0.15)", text: "#34C759" },
  MVFR: { bg: "rgba(74, 159, 232, 0.15)", text: "#4A9FE8" },
  IFR: { bg: "rgba(255, 107, 107, 0.15)", text: "#FF6B6B" },
  LIFR: { bg: "rgba(200, 50, 200, 0.15)", text: "#C832C8" },
};

const SEVERITY_COLORS: Record<string, string> = {
  none: "#34C759",
  light: "#4A9FE8",
  moderate: "#F4A436",
  severe: "#FF6B6B",
};

interface AviationMetric {
  icon: LucideIcon;
  label: string;
  value: string;
  severity: string;
}

export default function AviationScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();

  const aviationQuery = useQuery({
    queryKey: ["aviation", selectedLocation.lat, selectedLocation.lon],
    queryFn: () => fetchAviationData(selectedLocation.lat, selectedLocation.lon),
    staleTime: 10 * 60 * 1000,
  });

  const data = aviationQuery.data;
  const catColor = data ? (FLIGHT_CAT_COLORS[data.flightCategory] ?? FLIGHT_CAT_COLORS.VFR) : FLIGHT_CAT_COLORS.VFR;

  const metrics: AviationMetric[] = data ? [
    { icon: Cloud, label: "CEILING", value: `${data.ceilingFt.toLocaleString()} ft`, severity: data.ceilingFt > 3000 ? "none" : data.ceilingFt > 1000 ? "moderate" : "severe" },
    { icon: Eye, label: "VISIBILITY", value: `${data.visibilitySM} SM`, severity: data.visibilitySM >= 5 ? "none" : data.visibilitySM >= 3 ? "moderate" : "severe" },
    { icon: Wind, label: "WIND SHEAR", value: data.windShear ? "Reported" : "None", severity: data.windShear ? "severe" : "none" },
    { icon: AlertTriangle, label: "TURBULENCE", value: data.turbulence.charAt(0).toUpperCase() + data.turbulence.slice(1), severity: data.turbulence },
    { icon: Snowflake, label: "ICING RISK", value: data.icingRisk.charAt(0).toUpperCase() + data.icingRisk.slice(1), severity: data.icingRisk },
    { icon: Mountain, label: "DENSITY ALT", value: `${data.densityAltitude} ft`, severity: data.densityAltitude > 2000 ? "moderate" : "none" },
  ] : [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Aviation Weather" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0B1A2E", "#1A2840", "#2A3850"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />
      <ProGate featureName="Aviation Weather">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Plane size={20} color={WeatherColors.accentWarm} strokeWidth={1.5} />
            <Text style={styles.title}>Aviation Weather</Text>
          </View>
          <Text style={styles.subtitle}>{selectedLocation.name} — Aviation conditions</Text>

          {aviationQuery.isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WeatherColors.accent} />
              <Text style={styles.loadingText}>Fetching aviation data...</Text>
            </View>
          )}

          {aviationQuery.isError && (
            <View style={styles.errorContainer}>
              <AlertTriangle size={32} color={WeatherColors.accentWarm} strokeWidth={1.5} />
              <Text style={styles.errorTitle}>Could not load aviation data</Text>
              <Text style={styles.errorText}>Check your connection and try again</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => aviationQuery.refetch()}
                activeOpacity={0.7}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {data && (
            <>
              <View style={styles.metarCard}>
                <Text style={styles.metarLabel}>METAR</Text>
                <Text style={styles.metarValue}>{data.metar}</Text>
              </View>

              <View style={styles.flightCatCard}>
                <LinearGradient
                  colors={[catColor.bg, "rgba(0,0,0,0)"]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.flightCatRow}>
                  <Text style={styles.flightCatLabel}>Flight Category</Text>
                  <View style={[styles.flightCatBadge, { backgroundColor: catColor.bg }]}>
                    <View style={[styles.flightCatDot, { backgroundColor: catColor.text }]} />
                    <Text style={[styles.flightCatText, { color: catColor.text }]}>
                      {data.flightCategory}
                    </Text>
                  </View>
                </View>
                <Text style={styles.flightCatDesc}>
                  {data.flightCategory === "VFR" && "Visual Flight Rules — Ceiling > 3000ft, Visibility > 5SM"}
                  {data.flightCategory === "MVFR" && "Marginal VFR — Ceiling 1000-3000ft, Visibility 3-5SM"}
                  {data.flightCategory === "IFR" && "Instrument Flight Rules — Ceiling 500-1000ft, Visibility 1-3SM"}
                  {data.flightCategory === "LIFR" && "Low IFR — Ceiling < 500ft, Visibility < 1SM"}
                </Text>
              </View>

              <View style={styles.metricsGrid}>
                {metrics.map((metric, index) => (
                  <MetricItem key={metric.label} metric={metric} index={index} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </ProGate>
    </View>
  );
}

function MetricItem({ metric, index }: { metric: AviationMetric; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const Icon = metric.icon;
  const severityColor = SEVERITY_COLORS[metric.severity] ?? WeatherColors.textSecondary;

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
        <Icon size={14} color={severityColor} strokeWidth={1.5} />
        <Text style={styles.metricLabel}>{metric.label}</Text>
      </View>
      <Text style={[styles.metricValue, { color: severityColor }]}>{metric.value}</Text>
    </Animated.View>
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
  errorContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 60,
    gap: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: "rgba(244, 164, 54, 0.15)",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.accent,
  },
  metarCard: {
    marginHorizontal: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  metarLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  metarValue: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: WeatherColors.accentCool,
    lineHeight: 20,
  },
  flightCatCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden" as const,
  },
  flightCatRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  flightCatLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  flightCatBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  flightCatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  flightCatText: {
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: 1,
  },
  flightCatDesc: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    lineHeight: 18,
  },
  metricsGrid: {
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
  metricValue: {
    fontSize: 20,
    fontWeight: "500" as const,
  },
});
