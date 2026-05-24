import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { MapPin, Navigation, Crosshair } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";
import { LocationWeather, TempUnit } from "@/types/weather";
import { getWeatherIcon } from "@/utils/weatherIcons";

interface Props {
  location: LocationWeather;
  tempUnit: TempUnit;
  onToggleUnit: () => void;
}

export default function CurrentWeather({ location, tempUnit, onToggleUnit }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const unitScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [location.id, fadeAnim, slideAnim]);

  const handleToggleUnit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(unitScaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(unitScaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onToggleUnit();
  }, [onToggleUnit, unitScaleAnim]);

  const WeatherIcon = getWeatherIcon(location.condition.icon);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.locationRow}>
        {location.isCurrentLocation ? (
          <Navigation size={18} color={WeatherColors.neonGreen} fill={WeatherColors.neonGreen} />
        ) : (
          <MapPin size={18} color={WeatherColors.accent} />
        )}
        <Text style={styles.locationName}>{location.name}</Text>
        {location.isCurrentLocation && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
      <Text style={styles.regionText}>
        {location.region}{location.region && location.country ? ", " : ""}{location.country}
      </Text>

      <View style={styles.coordsRow}>
        <Crosshair size={13} color={WeatherColors.accent} strokeWidth={1.5} />
        <Text style={styles.coordsText}>
          {location.lat.toFixed(4)}°{location.lat >= 0 ? "N" : "S"}, {Math.abs(location.lon).toFixed(4)}°{location.lon >= 0 ? "E" : "W"}
        </Text>
      </View>

      <View style={styles.tempRow}>
        <View style={styles.tempContainer}>
          <Text style={styles.temperature}>{location.currentTemp}°</Text>
          <Animated.View style={{ transform: [{ scale: unitScaleAnim }] }}>
            <TouchableOpacity
              onPress={handleToggleUnit}
              style={styles.unitToggle}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              testID="unit-toggle"
            >
              <Text style={[styles.unitText, tempUnit === "F" && styles.unitActive]}>F</Text>
              <View style={styles.unitDivider} />
              <Text style={[styles.unitText, tempUnit === "C" && styles.unitActive]}>C</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        <View style={styles.conditionContainer}>
          <WeatherIcon size={54} color={WeatherColors.accent} strokeWidth={1.5} />
          <Text style={styles.conditionText}>{location.condition.main}</Text>
        </View>
      </View>

      <View style={styles.hiLoRow}>
        <View style={styles.hiLoContainer}>
          <Text style={styles.hiText}>H:{location.high}°</Text>
          <Text style={styles.loText}>L:{location.low}°</Text>
        </View>
        <Text style={styles.updatedText}>Updated {location.lastUpdated}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  locationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  locationName: {
    fontSize: 28,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(57, 255, 20, 0.1)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(57, 255, 20, 0.25)",
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: WeatherColors.neonGreen,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: WeatherColors.neonGreen,
    letterSpacing: 0.8,
  },
  regionText: {
    fontSize: 16,
    color: WeatherColors.textSecondary,
    marginTop: 2,
    marginLeft: 24,
  },
  coordsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginTop: 4,
    marginLeft: 20,
  },
  coordsText: {
    fontSize: 14,
    color: WeatherColors.accent,
    fontWeight: "500" as const,
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  tempRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginTop: 16,
  },
  tempContainer: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
  },
  temperature: {
    fontSize: 96,
    fontWeight: "200" as const,
    color: WeatherColors.textPrimary,
    letterSpacing: -4,
    lineHeight: 100,
  },
  unitToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(0, 240, 255, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 12,
    marginLeft: 2,
    gap: 4,
  },
  unitText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
  },
  unitActive: {
    color: WeatherColors.accent,
  },
  unitDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(0, 240, 255, 0.2)",
  },
  conditionContainer: {
    alignItems: "center" as const,
    gap: 6,
  },
  conditionText: {
    fontSize: 19,
    color: WeatherColors.textSecondary,
    fontWeight: "500" as const,
  },
  hiLoRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginTop: 4,
  },
  hiLoContainer: {
    flexDirection: "row" as const,
    gap: 12,
  },
  hiText: {
    fontSize: 19,
    color: WeatherColors.neonPink,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
  },
  loText: {
    fontSize: 19,
    color: WeatherColors.accent,
    fontWeight: "500" as const,
    letterSpacing: 0.5,
  },
  updatedText: {
    fontSize: 15,
    color: WeatherColors.textTertiary,
  },
});
