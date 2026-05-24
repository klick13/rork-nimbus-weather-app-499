import React, { useRef, useEffect, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { Wind, Heart, AlertTriangle, Droplets } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import { fetchAirQuality } from "@/utils/weatherApi";
import ProGate from "@/components/ProGate";

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return "#34C759";
  if (aqi <= 100) return "#FFD60A";
  if (aqi <= 150) return "#F4A436";
  if (aqi <= 200) return "#FF6B6B";
  if (aqi <= 300) return "#9B59B6";
  return "#7B241C";
}

function getAQILabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (Sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function getHealthAdvice(aqi: number): string {
  if (aqi <= 50) return "Air quality is satisfactory. Enjoy outdoor activities.";
  if (aqi <= 100) return "Acceptable air quality. Sensitive individuals should limit prolonged outdoor exertion.";
  if (aqi <= 150) return "Members of sensitive groups may experience health effects. Reduce prolonged outdoor exertion.";
  if (aqi <= 200) return "Everyone may begin to experience health effects. Avoid prolonged outdoor exertion.";
  return "Health alert: everyone may experience serious health effects. Stay indoors.";
}

function getPollenLevel(count: number): { label: string; color: string } {
  if (count <= 2) return { label: "Low", color: "#34C759" };
  if (count <= 10) return { label: "Moderate", color: "#FFD60A" };
  if (count <= 25) return { label: "High", color: "#F4A436" };
  return { label: "Very High", color: "#FF6B6B" };
}

function AQIGauge({ aqi, color }: { aqi: number; color: string }) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: Math.min(aqi / 300, 1),
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [aqi, fillAnim]);

  const barWidth = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeTrack}>
        <LinearGradient
          colors={["#34C759", "#FFD60A", "#F4A436", "#FF6B6B", "#9B59B6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gaugeGradient}
        />
        <Animated.View style={[styles.gaugeIndicator, { left: barWidth }]}>
          <View style={[styles.gaugeKnob, { backgroundColor: color }]} />
        </Animated.View>
      </View>
      <View style={styles.gaugeLabels}>
        <Text style={styles.gaugeMin}>0</Text>
        <Text style={styles.gaugeMid}>150</Text>
        <Text style={styles.gaugeMax}>300+</Text>
      </View>
    </View>
  );
}

export default function PollenAirQualityScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();

  const airQuery = useQuery({
    queryKey: ["air-quality", selectedLocation.lat, selectedLocation.lon],
    queryFn: () => fetchAirQuality(selectedLocation.lat, selectedLocation.lon),
    staleTime: 10 * 60 * 1000,
  });

  const data = airQuery.data;
  const aqiColor = data ? getAQIColor(data.usAqi) : "#34C759";
  const aqiLabel = data ? getAQILabel(data.usAqi) : "Loading";

  const pollenTypes = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Grass", count: data.grassPollen, ...getPollenLevel(data.grassPollen) },
      { name: "Birch", count: data.birchPollen, ...getPollenLevel(data.birchPollen) },
      { name: "Ragweed", count: data.ragweedPollen, ...getPollenLevel(data.ragweedPollen) },
      { name: "Alder", count: data.alderPollen, ...getPollenLevel(data.alderPollen) },
    ];
  }, [data]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (data) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [data, fadeAnim]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Air Quality" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={WeatherColors.gradientClear} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} />
      <ProGate featureName="Pollen & Air Quality">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Wind size={20} color="#4A9FE8" strokeWidth={1.5} />
            <Text style={styles.title}>Air Quality</Text>
          </View>
          <Text style={styles.subtitle}>{selectedLocation.name} — Pollen & pollutants</Text>

          {airQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WeatherColors.accent} />
              <Text style={styles.loadingText}>Loading air quality data...</Text>
            </View>
          ) : data ? (
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={[styles.aqiCard, { borderColor: `${aqiColor}30` }]}>
                <View style={styles.aqiHeader}>
                  <View style={styles.aqiScoreSection}>
                    <Text style={[styles.aqiScore, { color: aqiColor }]}>{data.usAqi}</Text>
                    <Text style={[styles.aqiLabel, { color: aqiColor }]}>US AQI</Text>
                  </View>
                  <View style={styles.aqiInfo}>
                    <Text style={[styles.aqiStatus, { color: aqiColor }]}>{aqiLabel}</Text>
                    <AQIGauge aqi={data.usAqi} color={aqiColor} />
                  </View>
                </View>
                <View style={styles.healthRow}>
                  <Heart size={14} color={aqiColor} strokeWidth={1.5} />
                  <Text style={styles.healthAdvice}>{getHealthAdvice(data.usAqi)}</Text>
                </View>
              </View>

              <View style={styles.pollutantsCard}>
                <Text style={styles.sectionTitle}>Pollutants</Text>
                <View style={styles.pollutantsGrid}>
                  {[
                    { label: "PM2.5", value: `${data.pm25}`, unit: "ug/m3", warn: data.pm25 > 25 },
                    { label: "PM10", value: `${data.pm10}`, unit: "ug/m3", warn: data.pm10 > 50 },
                    { label: "Ozone", value: `${data.ozone}`, unit: "ug/m3", warn: data.ozone > 100 },
                    { label: "NO2", value: `${data.no2}`, unit: "ug/m3", warn: data.no2 > 40 },
                    { label: "SO2", value: `${data.so2}`, unit: "ug/m3", warn: data.so2 > 20 },
                    { label: "CO", value: `${data.co}`, unit: "ug/m3", warn: data.co > 4000 },
                  ].map((p) => (
                    <View key={p.label} style={styles.pollutantItem}>
                      <Text style={styles.pollutantLabel}>{p.label}</Text>
                      <Text style={[styles.pollutantValue, { color: p.warn ? "#FF6B6B" : WeatherColors.textPrimary }]}>{p.value}</Text>
                      <Text style={styles.pollutantUnit}>{p.unit}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.pollenCard}>
                <View style={styles.pollenHeader}>
                  <Droplets size={16} color="#FFD60A" strokeWidth={1.5} />
                  <Text style={styles.sectionTitle}>Pollen Index</Text>
                </View>
                {pollenTypes.map((pollen) => (
                  <View key={pollen.name} style={styles.pollenRow}>
                    <Text style={styles.pollenName}>{pollen.name}</Text>
                    <View style={styles.pollenBarTrack}>
                      <View style={[styles.pollenBarFill, { width: `${Math.min(100, pollen.count * 4)}%`, backgroundColor: pollen.color }]} />
                    </View>
                    <View style={[styles.pollenLevelPill, { backgroundColor: `${pollen.color}20` }]}>
                      <Text style={[styles.pollenLevelText, { color: pollen.color }]}>{pollen.label}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {data.usAqi > 100 && (
                <View style={styles.alertCard}>
                  <AlertTriangle size={16} color="#FF6B6B" strokeWidth={1.5} />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>Health Advisory</Text>
                    <Text style={styles.alertMessage}>
                      Consider wearing a mask outdoors. Keep windows closed and use air purification indoors.
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          ) : null}
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
  loadingContainer: { alignItems: "center" as const, paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14, color: WeatherColors.textSecondary },
  aqiCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, marginBottom: 12,
  },
  aqiHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 16, marginBottom: 14 },
  aqiScoreSection: { alignItems: "center" as const },
  aqiScore: { fontSize: 44, fontWeight: "800" as const, lineHeight: 48 },
  aqiLabel: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5 },
  aqiInfo: { flex: 1 },
  aqiStatus: { fontSize: 16, fontWeight: "700" as const, marginBottom: 10 },
  healthRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8, borderTopWidth: 1, borderTopColor: WeatherColors.separator, paddingTop: 12 },
  healthAdvice: { fontSize: 13, color: WeatherColors.textSecondary, lineHeight: 18, flex: 1 },
  gaugeContainer: { marginTop: 4 },
  gaugeTrack: { height: 10, borderRadius: 5, overflow: "hidden" as const, backgroundColor: "rgba(255,255,255,0.06)" },
  gaugeGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 5, opacity: 0.5 },
  gaugeIndicator: { position: "absolute" as const, top: -2, marginLeft: -7 },
  gaugeKnob: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#FFFFFF" },
  gaugeLabels: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 4 },
  gaugeMin: { fontSize: 9, color: WeatherColors.textTertiary },
  gaugeMid: { fontSize: 9, color: WeatherColors.textTertiary },
  gaugeMax: { fontSize: 9, color: WeatherColors.textTertiary },
  pollutantsCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder, marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600" as const, color: WeatherColors.textPrimary, marginBottom: 14 },
  pollutantsGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  pollutantItem: {
    width: "30%" as const, backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10, padding: 10, alignItems: "center" as const,
  },
  pollutantLabel: { fontSize: 10, color: WeatherColors.textTertiary, fontWeight: "600" as const, marginBottom: 4 },
  pollutantValue: { fontSize: 18, fontWeight: "700" as const },
  pollutantUnit: { fontSize: 9, color: WeatherColors.textTertiary, marginTop: 1 },
  pollenCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder, marginBottom: 12,
  },
  pollenHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 14 },
  pollenRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginBottom: 10 },
  pollenName: { fontSize: 13, color: WeatherColors.textPrimary, fontWeight: "500" as const, width: 65 },
  pollenBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" as const },
  pollenBarFill: { height: "100%", borderRadius: 3 },
  pollenLevelPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, minWidth: 60, alignItems: "center" as const },
  pollenLevelText: { fontSize: 10, fontWeight: "700" as const },
  alertCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 14,
    backgroundColor: "rgba(255, 107, 107, 0.08)", borderWidth: 1, borderColor: "rgba(255, 107, 107, 0.2)",
    flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 10, marginBottom: 12,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: "600" as const, color: "#FF6B6B", marginBottom: 4 },
  alertMessage: { fontSize: 13, color: WeatherColors.textSecondary, lineHeight: 18 },
});
