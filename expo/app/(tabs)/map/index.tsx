import React from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import RadarMapWidget from "@/components/RadarMapWidget";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation, tempUnit } = useWeather();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.mapWrapper, { paddingTop: insets.top, paddingBottom: insets.bottom + 60 }]}>
        <RadarMapWidget
          lat={selectedLocation.lat}
          lon={selectedLocation.lon}
          compact={false}
          fullscreen={true}
          tempUnit={tempUnit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  mapWrapper: {
    flex: 1,
  },
});
