import React from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import RadarMapWidget from "@/components/RadarMapWidget";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation, tempUnit } = useWeather();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AtmosphericBackground
        conditionId={selectedLocation.condition.id}
        isNight={selectedLocation.condition.icon === "moon" || selectedLocation.condition.icon === "cloud-moon"}
      />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Maps</Text>
          <Text style={styles.headerSubtitle}>
            {selectedLocation.name}
          </Text>
        </View>
      </View>
      <View style={[styles.mapWrapper, { paddingBottom: insets.bottom + 80 }]}>
        <RadarMapWidget
          lat={selectedLocation.lat}
          lon={selectedLocation.lon}
          compact={false}
          fullscreen={false}
          tempUnit={tempUnit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: WeatherColors.textSecondary,
  },
  mapWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
