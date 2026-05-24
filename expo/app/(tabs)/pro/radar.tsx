import React, { useRef, useEffect } from "react";
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
  Radar as RadarIcon,
  Clock,
} from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import ProGate from "@/components/ProGate";
import RadarMapWidget from "@/components/RadarMapWidget";

const ARCHIVED_EVENTS = [
  { date: "Feb 9, 2026", event: "Winter Storm", maxPrecip: "0.78 in", duration: "14h" },
  { date: "Feb 3, 2026", event: "Cold Front", maxPrecip: "0.45 in", duration: "8h" },
  { date: "Jan 28, 2026", event: "Atmospheric River", maxPrecip: "2.1 in", duration: "36h" },
  { date: "Jan 15, 2026", event: "Rain Showers", maxPrecip: "0.32 in", duration: "6h" },
  { date: "Jan 8, 2026", event: "Heavy Fog", maxPrecip: "0.02 in", duration: "18h" },
];

export default function RadarScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Radar Archives" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0A0F1A", "#121A2A", "#1A2535"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />
      <ProGate featureName="Radar Archives">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <RadarIcon size={20} color={WeatherColors.uvHigh} strokeWidth={1.5} />
            <Text style={styles.title}>Radar Archives</Text>
          </View>
          <Text style={styles.subtitle}>
            {selectedLocation.name} — Live precipitation radar & storm history
          </Text>

          <View style={styles.radarCardWrap}>
            <RadarMapWidget
              lat={selectedLocation.lat}
              lon={selectedLocation.lon}
              compact={false}
            />
          </View>

          <View style={styles.archiveSection}>
            <Text style={styles.archiveSectionTitle}>Past Events</Text>
            {ARCHIVED_EVENTS.map((event, i) => (
              <ArchiveRow key={event.date} event={event} index={i} />
            ))}
          </View>
        </ScrollView>
      </ProGate>
    </View>
  );
}

function ArchiveRow({
  event,
  index,
}: {
  event: typeof ARCHIVED_EVENTS[0];
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: 300 + index * 60,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  return (
    <Animated.View style={[styles.archiveRow, { opacity: fadeAnim }]}>
      <View style={styles.archiveIconWrap}>
        <Clock size={14} color={WeatherColors.textTertiary} strokeWidth={1.5} />
      </View>
      <View style={styles.archiveText}>
        <Text style={styles.archiveEvent}>{event.event}</Text>
        <Text style={styles.archiveDate}>{event.date}</Text>
      </View>
      <View style={styles.archiveStats}>
        <Text style={styles.archivePrecip}>{event.maxPrecip}</Text>
        <Text style={styles.archiveDuration}>{event.duration}</Text>
      </View>
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
  radarCardWrap: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  archiveSection: {
    paddingHorizontal: 16,
  },
  archiveSectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  archiveRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  archiveIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  archiveText: {
    flex: 1,
  },
  archiveEvent: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textPrimary,
  },
  archiveDate: {
    fontSize: 12,
    color: WeatherColors.textSecondary,
    marginTop: 1,
  },
  archiveStats: {
    alignItems: "flex-end" as const,
  },
  archivePrecip: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.precipBlue,
  },
  archiveDuration: {
    fontSize: 11,
    color: WeatherColors.textTertiary,
    marginTop: 1,
  },
});
