import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Wind, ChevronRight } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import { fetchAirQuality } from "@/utils/weatherApi";

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
  if (aqi <= 100) {
    return "Acceptable air quality. Sensitive individuals should limit prolonged outdoor exertion.";
  }
  if (aqi <= 150) {
    return "Sensitive groups may experience health effects. Reduce prolonged outdoor exertion.";
  }
  if (aqi <= 200) {
    return "Everyone may begin to experience health effects. Avoid prolonged outdoor exertion.";
  }
  return "Health alert: everyone may experience serious health effects. Stay indoors.";
}

function getPollenLevel(count: number): { label: string; color: string } {
  if (count <= 2) return { label: "Low", color: "#34C759" };
  if (count <= 10) return { label: "Moderate", color: "#FFD60A" };
  if (count <= 25) return { label: "High", color: "#F4A436" };
  return { label: "Very High", color: "#FF6B6B" };
}

export default function PollenAirQualityCard() {
  const { selectedLocation } = useWeather();
  const router = useRouter();

  const airQuery = useQuery({
    queryKey: ["air-quality", selectedLocation.lat, selectedLocation.lon],
    queryFn: () => fetchAirQuality(selectedLocation.lat, selectedLocation.lon),
    staleTime: 10 * 60 * 1000,
  });

  const data = airQuery.data;

  const topPollen = useMemo(() => {
    if (!data) return null;
    const types = [
      { name: "Grass", count: data.grassPollen },
      { name: "Birch", count: data.birchPollen },
      { name: "Ragweed", count: data.ragweedPollen },
      { name: "Alder", count: data.alderPollen },
    ];
    return types.reduce((max, current) =>
      current.count > max.count ? current : max
    );
  }, [data]);

  const handlePress = () => {
    router.push("/pro/pollen-air-quality" as never);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
      testID="pollen-air-quality-card"
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Wind size={18} color={WeatherColors.accentCool} strokeWidth={1.5} />
          <Text style={styles.title}>Air Quality</Text>
        </View>
        <ChevronRight size={18} color={WeatherColors.textTertiary} strokeWidth={2} />
      </View>

      {airQuery.isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={WeatherColors.accentCool} />
          <Text style={styles.loadingText}>Loading air quality...</Text>
        </View>
      ) : data ? (
        <View style={styles.contentRow}>
          <View style={styles.aqiSection}>
            <Text
              style={[styles.aqiScore, { color: getAQIColor(data.usAqi) }]}
            >
              {data.usAqi}
            </Text>
            <View
              style={[
                styles.aqiPill,
                { backgroundColor: `${getAQIColor(data.usAqi)}20` },
              ]}
            >
              <View
                style={[
                  styles.aqiDot,
                  { backgroundColor: getAQIColor(data.usAqi) },
                ]}
              />
              <Text
                style={[
                  styles.aqiLabel,
                  { color: getAQIColor(data.usAqi) },
                ]}
              >
                {getAQILabel(data.usAqi)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            {topPollen && topPollen.count > 0 ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Top pollen</Text>
                <View style={styles.pollenRow}>
                  <Text style={styles.pollenName}>{topPollen.name}</Text>
                  <View
                    style={[
                      styles.pollenPill,
                      {
                        backgroundColor: `${getPollenLevel(topPollen.count).color}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pollenLevel,
                        { color: getPollenLevel(topPollen.count).color },
                      ]}
                    >
                      {getPollenLevel(topPollen.count).label}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Top pollen</Text>
                <Text style={styles.infoValue}>None detected</Text>
              </View>
            )}
            <Text style={styles.advice} numberOfLines={2}>
              {getHealthAdvice(data.usAqi)}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.errorText}>Unable to load air quality data</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.2,
  },
  loadingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
  },
  contentRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  aqiSection: {
    alignItems: "center" as const,
    minWidth: 70,
  },
  aqiScore: {
    fontSize: 38,
    fontWeight: "800" as const,
    lineHeight: 42,
  },
  aqiPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  aqiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aqiLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  divider: {
    width: 1,
    height: 56,
    backgroundColor: WeatherColors.separator,
  },
  infoSection: {
    flex: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  infoLabel: {
    fontSize: 12,
    color: WeatherColors.textTertiary,
    fontWeight: "500" as const,
  },
  infoValue: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    fontWeight: "500" as const,
  },
  pollenRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  pollenName: {
    fontSize: 13,
    color: WeatherColors.textPrimary,
    fontWeight: "600" as const,
  },
  pollenPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  pollenLevel: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  advice: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    lineHeight: 17,
  },
  errorText: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    paddingVertical: 12,
  },
});
