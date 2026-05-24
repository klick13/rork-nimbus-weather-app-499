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
import {
  Sparkles,
  Check,
  X as XIcon,
  Cigarette,
  Plane,
  Camera,
  Star,
  Waves,
  Footprints,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import { HobbyAlert } from "@/types/subscription";
import ProGate from "@/components/ProGate";

const ICON_MAP: Record<string, LucideIcon> = {
  Cigarette,
  Plane,
  Camera,
  Star,
  Waves,
  Footprints,
};

const STATUS_COLORS: Record<string, string> = {
  perfect: "#34C759",
  good: "#4A9FE8",
  fair: "#F4A436",
  poor: "#FF6B6B",
};

function buildHobbyAlerts(
  temp: number,
  humidity: number,
  windSpeed: number,
  visibility: number,
  precipChance: number,
  cloudCover: number,
): HobbyAlert[] {
  const cigarHumOk = humidity >= 55 && humidity <= 75;
  const cigarWindOk = windSpeed < 10;
  const cigarTempOk = temp >= 60 && temp <= 85;
  const cigarPrecipOk = precipChance < 20;
  const cigarMet = [cigarHumOk, cigarWindOk, cigarTempOk, cigarPrecipOk].filter(Boolean).length;
  const cigarStatus = cigarMet === 4 ? "perfect" : cigarMet >= 3 ? "good" : cigarMet >= 2 ? "fair" : "poor";

  const droneWindOk = windSpeed < 15;
  const droneGustOk = windSpeed < 20;
  const droneVisOk = visibility > 3;
  const dronePrecipOk = precipChance < 20;
  const droneMet = [droneWindOk, droneGustOk, droneVisOk, dronePrecipOk].filter(Boolean).length;
  const droneStatus = droneMet === 4 ? "perfect" : droneMet >= 3 ? "good" : droneMet >= 2 ? "fair" : "poor";

  const photoCloudOk = cloudCover >= 20 && cloudCover <= 60;
  const photoVisOk = visibility > 5;
  const photoHumOk = humidity < 80;
  const photoWindOk = windSpeed < 15;
  const photoMet = [photoCloudOk, photoVisOk, photoHumOk, photoWindOk].filter(Boolean).length;
  const photoStatus = photoMet === 4 ? "perfect" : photoMet >= 3 ? "good" : photoMet >= 2 ? "fair" : "poor";

  const starCloudOk = cloudCover < 20;
  const starHumOk = humidity < 60;
  const starMet = [starCloudOk, starHumOk].filter(Boolean).length;
  const starStatus = starMet === 2 ? "good" : starMet === 1 ? "fair" : "poor";

  const runTempOk = temp >= 40 && temp <= 70;
  const runHumOk = humidity < 75;
  const runWindOk = windSpeed < 15;
  const runMet = [runTempOk, runHumOk, runWindOk].filter(Boolean).length;
  const runStatus = runMet === 3 ? "perfect" : runMet >= 2 ? "good" : runMet >= 1 ? "fair" : "poor";

  return [
    {
      id: "cigar",
      name: "Cigar Smoking",
      icon: "Cigarette",
      description: "Ideal conditions for an outdoor cigar session",
      conditions: [
        { label: "Humidity", ideal: "55-75%", current: `${humidity}%`, met: cigarHumOk },
        { label: "Wind", ideal: "< 10 mph", current: `${windSpeed} mph`, met: cigarWindOk },
        { label: "Temperature", ideal: "60-85°F", current: `${temp}°F`, met: cigarTempOk },
        { label: "Precipitation", ideal: "< 20%", current: `${precipChance}%`, met: cigarPrecipOk },
      ],
      currentStatus: cigarStatus as HobbyAlert["currentStatus"],
      statusMessage: cigarStatus === "perfect" ? "Perfect conditions for a cigar!" : cigarStatus === "good" ? "Good conditions, minor issues" : cigarStatus === "fair" ? "Some conditions not ideal" : "Not recommended right now",
    },
    {
      id: "drone",
      name: "Drone Flying",
      icon: "Plane",
      description: "Safe conditions for recreational drone operation",
      conditions: [
        { label: "Wind Speed", ideal: "< 15 mph", current: `${windSpeed} mph`, met: droneWindOk },
        { label: "Wind Gusts", ideal: "< 20 mph", current: `${Math.round(windSpeed * 1.3)} mph`, met: droneGustOk },
        { label: "Visibility", ideal: "> 3 mi", current: `${visibility} mi`, met: droneVisOk },
        { label: "Precipitation", ideal: "< 20%", current: `${precipChance}%`, met: dronePrecipOk },
      ],
      currentStatus: droneStatus as HobbyAlert["currentStatus"],
      statusMessage: droneStatus === "perfect" ? "Excellent flying conditions!" : droneStatus === "good" ? "Good conditions, watch for gusts" : droneStatus === "fair" ? "Marginal conditions, fly carefully" : "Not safe for flying",
    },
    {
      id: "photography",
      name: "Golden Hour Photography",
      icon: "Camera",
      description: "Optimal light conditions for outdoor photography",
      conditions: [
        { label: "Cloud Cover", ideal: "20-60%", current: `${cloudCover}%`, met: photoCloudOk },
        { label: "Visibility", ideal: "> 5 mi", current: `${visibility} mi`, met: photoVisOk },
        { label: "Humidity", ideal: "< 80%", current: `${humidity}%`, met: photoHumOk },
        { label: "Wind", ideal: "< 15 mph", current: `${windSpeed} mph`, met: photoWindOk },
      ],
      currentStatus: photoStatus as HobbyAlert["currentStatus"],
      statusMessage: photoStatus === "perfect" ? "Excellent — partial clouds make dramatic skies" : photoStatus === "good" ? "Good light conditions expected" : photoStatus === "fair" ? "Conditions are okay, not ideal" : "Poor conditions for photography",
    },
    {
      id: "stargazing",
      name: "Stargazing",
      icon: "Star",
      description: "Clear skies for astronomical observation",
      conditions: [
        { label: "Cloud Cover", ideal: "< 20%", current: `${cloudCover}%`, met: starCloudOk },
        { label: "Humidity", ideal: "< 60%", current: `${humidity}%`, met: starHumOk },
      ],
      currentStatus: starStatus as HobbyAlert["currentStatus"],
      statusMessage: starStatus === "good" ? "Great night for stargazing!" : starStatus === "fair" ? "Some cloud cover may interfere" : "Too much cloud cover tonight",
    },
    {
      id: "running",
      name: "Outdoor Running",
      icon: "Footprints",
      description: "Comfortable conditions for distance running",
      conditions: [
        { label: "Temperature", ideal: "40-70°F", current: `${temp}°F`, met: runTempOk },
        { label: "Humidity", ideal: "< 75%", current: `${humidity}%`, met: runHumOk },
        { label: "Wind", ideal: "< 15 mph", current: `${windSpeed} mph`, met: runWindOk },
      ],
      currentStatus: runStatus as HobbyAlert["currentStatus"],
      statusMessage: runStatus === "perfect" ? "Perfect running weather!" : runStatus === "good" ? "Great running conditions" : runStatus === "fair" ? "Manageable, but not ideal" : "Consider indoor exercise today",
    },
  ];
}

function HobbyCard({ alert, index }: { alert: HobbyAlert; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const Icon = ICON_MAP[alert.icon] ?? Sparkles;
  const statusColor = STATUS_COLORS[alert.currentStatus] ?? WeatherColors.textSecondary;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        styles.hobbyCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.hobbyHeader}>
        <View style={[styles.hobbyIconWrap, { backgroundColor: `${statusColor}15` }]}>
          <Icon size={20} color={statusColor} strokeWidth={1.5} />
        </View>
        <View style={styles.hobbyTitleSection}>
          <Text style={styles.hobbyName}>{alert.name}</Text>
          <Text style={styles.hobbyDesc}>{alert.description}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {alert.currentStatus.charAt(0).toUpperCase() + alert.currentStatus.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.statusMessage}>{alert.statusMessage}</Text>

      <View style={styles.conditionsGrid}>
        {alert.conditions.map((cond) => (
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
              <Text style={styles.conditionCurrent}>{cond.current}</Text>
              <Text style={styles.conditionIdeal}>ideal: {cond.ideal}</Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function HobbyAlertsScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();

  const alerts = useMemo(() => {
    const details = selectedLocation.details;
    const precipChance = selectedLocation.hourly[0]?.precipChance ?? 0;
    const cloudCover = details.humidity > 80 ? 80 : details.humidity > 60 ? 50 : details.humidity > 40 ? 30 : 10;
    return buildHobbyAlerts(
      selectedLocation.currentTemp,
      details.humidity,
      details.windSpeed,
      details.visibility,
      precipChance,
      cloudCover,
    );
  }, [selectedLocation]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Hobby Alerts" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={WeatherColors.gradientClear}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />
      <ProGate featureName="Hobby Alerts">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Sparkles size={20} color={WeatherColors.accent} strokeWidth={1.5} />
            <Text style={styles.title}>Hobby Alerts</Text>
          </View>
          <Text style={styles.subtitle}>
            {selectedLocation.name} — Real-time condition monitoring
          </Text>

          <View style={styles.cardList}>
            {alerts.map((alert, index) => (
              <HobbyCard key={alert.id} alert={alert} index={index} />
            ))}
          </View>
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
  cardList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  hobbyCard: {
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 16,
  },
  hobbyHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 10,
  },
  hobbyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  hobbyTitleSection: {
    flex: 1,
  },
  hobbyName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  hobbyDesc: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700" as const,
    textTransform: "capitalize" as const,
  },
  statusMessage: {
    fontSize: 13,
    color: WeatherColors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  conditionsGrid: {
    gap: 8,
  },
  conditionRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  conditionLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  conditionLabel: {
    fontSize: 13,
    color: WeatherColors.textPrimary,
    fontWeight: "500" as const,
  },
  conditionRight: {
    alignItems: "flex-end" as const,
  },
  conditionCurrent: {
    fontSize: 13,
    color: WeatherColors.textPrimary,
    fontWeight: "600" as const,
  },
  conditionIdeal: {
    fontSize: 10,
    color: WeatherColors.textTertiary,
  },
});
