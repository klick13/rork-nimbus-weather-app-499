import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Animated,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  CalendarDays,
  Sun,
  CloudRain,
  Wind,
  Thermometer,
  Check,
  Umbrella,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WeatherColors } from "@/constants/colors";
import { useWeather } from "@/hooks/useWeatherContext";
import ProGate from "@/components/ProGate";
import type { DailyForecast } from "@/types/weather";

function getComfortScore(day: DailyForecast): { score: number; label: string; color: string } {
  let score = 50;
  const avgTemp = (day.high + day.low) / 2;

  if (avgTemp >= 60 && avgTemp <= 78) score += 25;
  else if (avgTemp >= 50 && avgTemp <= 85) score += 15;
  else score -= 10;

  if (day.precipChance < 20) score += 20;
  else if (day.precipChance < 40) score += 10;
  else if (day.precipChance > 60) score -= 15;

  const condId = day.condition.id;
  if (condId === "clear") score += 10;
  else if (condId === "partly-cloudy") score += 5;
  else if (condId === "rainy") score -= 10;
  else if (condId === "snow") score -= 15;

  score = Math.min(100, Math.max(0, score));
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";
  const color = score >= 80 ? "#34C759" : score >= 60 ? "#4A9FE8" : score >= 40 ? "#F4A436" : "#FF6B6B";
  return { score, label, color };
}

function getRecommendations(day: DailyForecast, isOutdoor: boolean): string[] {
  const recs: string[] = [];
  const avgTemp = (day.high + day.low) / 2;

  if (day.precipChance > 40) {
    recs.push(isOutdoor ? "Have a backup indoor venue ready" : "Rain won't affect indoor plans");
    if (isOutdoor) recs.push("Provide tents or covered areas");
  }

  if (avgTemp > 85) {
    recs.push("Provide shade and cold water stations");
    recs.push("Schedule activities for morning or evening");
  } else if (avgTemp < 45) {
    recs.push("Provide heating or warm beverages");
    recs.push("Suggest guests dress in warm layers");
  }

  if (day.condition.id === "clear" && isOutdoor) {
    recs.push("Apply sunscreen — clear skies expected");
  }

  if (recs.length === 0) {
    recs.push(isOutdoor ? "Great conditions for an outdoor event!" : "Perfect weather for your event!");
  }

  return recs;
}

function getWhatToBring(day: DailyForecast): string[] {
  const items: string[] = [];
  if (day.precipChance > 30) items.push("Umbrella");
  if ((day.high + day.low) / 2 > 75) items.push("Sunscreen");
  if (day.condition.id === "clear") items.push("Sunglasses");
  if (day.low < 55) items.push("Light jacket");
  if (day.low < 40) items.push("Warm layers");
  if ((day.high + day.low) / 2 > 80) items.push("Water bottle");
  if (items.length === 0) items.push("Dress comfortably");
  return items;
}

export default function EventPlannerScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useWeather();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [eventName, setEventName] = useState<string>("");
  const [isOutdoor, setIsOutdoor] = useState<boolean>(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const selectedDay = selectedLocation.daily[selectedDayIndex] ?? selectedLocation.daily[0];

  const comfort = useMemo(() => {
    if (!selectedDay) return { score: 0, label: "N/A", color: WeatherColors.textTertiary };
    return getComfortScore(selectedDay);
  }, [selectedDay]);

  const recommendations = useMemo(() => {
    if (!selectedDay) return [];
    return getRecommendations(selectedDay, isOutdoor);
  }, [selectedDay, isOutdoor]);

  const whatToBring = useMemo(() => {
    if (!selectedDay) return [];
    return getWhatToBring(selectedDay);
  }, [selectedDay]);

  const handleDaySelect = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDayIndex(index);
  }, []);

  if (!selectedDay) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Event Planner" }} />
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={WeatherColors.gradientClear} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} />
      <ProGate featureName="Event Weather Planner">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.header}>
              <CalendarDays size={20} color={WeatherColors.accent} strokeWidth={1.5} />
              <Text style={styles.title}>Event Planner</Text>
            </View>
            <Text style={styles.subtitle}>{selectedLocation.name} — Plan weather-safe events</Text>

            <View style={styles.eventNameCard}>
              <Text style={styles.inputLabel}>Event Name (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Birthday Party, Wedding"
                placeholderTextColor={WeatherColors.textTertiary}
                value={eventName}
                onChangeText={setEventName}
                testID="event-name-input"
              />
            </View>

            <View style={styles.venueToggle}>
              <TouchableOpacity
                style={[styles.venueOption, isOutdoor && styles.venueActive]}
                onPress={() => setIsOutdoor(true)}
                testID="venue-outdoor"
              >
                <Sun size={14} color={isOutdoor ? "#0B1A2E" : WeatherColors.textSecondary} strokeWidth={1.5} />
                <Text style={[styles.venueText, isOutdoor && styles.venueActiveText]}>Outdoor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.venueOption, !isOutdoor && styles.venueActive]}
                onPress={() => setIsOutdoor(false)}
                testID="venue-indoor"
              >
                <Umbrella size={14} color={!isOutdoor ? "#0B1A2E" : WeatherColors.textSecondary} strokeWidth={1.5} />
                <Text style={[styles.venueText, !isOutdoor && styles.venueActiveText]}>Indoor</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPicker}>
              {selectedLocation.daily.map((day, index) => {
                const isSelected = index === selectedDayIndex;
                const dayComfort = getComfortScore(day);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                    onPress={() => handleDaySelect(index)}
                    testID={`day-${index}`}
                  >
                    <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>{day.day}</Text>
                    <Text style={[styles.dayDate, isSelected && styles.dayDateSelected]}>{day.date}</Text>
                    <View style={[styles.dayScoreDot, { backgroundColor: dayComfort.color }]} />
                    <Text style={[styles.dayTemp, isSelected && styles.dayTempSelected]}>
                      {day.high}° / {day.low}°
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={[styles.comfortCard, { borderColor: `${comfort.color}30` }]}>
              <View style={styles.comfortHeader}>
                <Text style={styles.comfortTitle}>
                  {eventName || "Your Event"} — {selectedDay.day}, {selectedDay.date}
                </Text>
              </View>
              <View style={styles.comfortScoreRow}>
                <View style={styles.comfortScoreCircle}>
                  <Text style={[styles.comfortScore, { color: comfort.color }]}>{comfort.score}</Text>
                  <Text style={[styles.comfortLabel, { color: comfort.color }]}>{comfort.label}</Text>
                </View>
                <View style={styles.comfortDetails}>
                  <View style={styles.comfortDetailRow}>
                    <Thermometer size={14} color={WeatherColors.textSecondary} strokeWidth={1.5} />
                    <Text style={styles.comfortDetailText}>{selectedDay.high}° / {selectedDay.low}° — {selectedDay.condition.main}</Text>
                  </View>
                  <View style={styles.comfortDetailRow}>
                    <CloudRain size={14} color={WeatherColors.textSecondary} strokeWidth={1.5} />
                    <Text style={styles.comfortDetailText}>{selectedDay.precipChance}% chance of rain</Text>
                  </View>
                  <View style={styles.comfortDetailRow}>
                    <Wind size={14} color={WeatherColors.textSecondary} strokeWidth={1.5} />
                    <Text style={styles.comfortDetailText}>{selectedDay.condition.description}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.recsCard}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {recommendations.map((rec, i) => (
                <View key={i} style={styles.recRow}>
                  <Check size={14} color="#34C759" strokeWidth={2} />
                  <Text style={styles.recText}>{rec}</Text>
                </View>
              ))}
            </View>

            <View style={styles.bringCard}>
              <Text style={styles.sectionTitle}>What to Bring</Text>
              <View style={styles.bringChips}>
                {whatToBring.map((item, i) => (
                  <View key={i} style={styles.bringChip}>
                    <Text style={styles.bringChipText}>{item}</Text>
                  </View>
                ))}
              </View>
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
  eventNameCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 14,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder, marginBottom: 12,
  },
  inputLabel: { fontSize: 12, color: WeatherColors.textTertiary, marginBottom: 8, fontWeight: "500" as const },
  input: {
    fontSize: 16, color: WeatherColors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  venueToggle: { flexDirection: "row" as const, marginHorizontal: 16, gap: 10, marginBottom: 16 },
  venueOption: {
    flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const,
    gap: 6, paddingVertical: 10, borderRadius: 12,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder,
  },
  venueActive: { backgroundColor: WeatherColors.accent, borderColor: WeatherColors.accent },
  venueText: { fontSize: 14, fontWeight: "600" as const, color: WeatherColors.textSecondary },
  venueActiveText: { color: "#0B1A2E" },
  dayPicker: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  dayCard: {
    width: 70, paddingVertical: 12, borderRadius: 14, alignItems: "center" as const, gap: 4,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder,
  },
  dayCardSelected: { backgroundColor: "rgba(244, 164, 54, 0.15)", borderColor: WeatherColors.accent },
  dayName: { fontSize: 12, fontWeight: "600" as const, color: WeatherColors.textSecondary },
  dayNameSelected: { color: WeatherColors.accent },
  dayDate: { fontSize: 10, color: WeatherColors.textTertiary },
  dayDateSelected: { color: WeatherColors.accent },
  dayScoreDot: { width: 6, height: 6, borderRadius: 3, marginVertical: 2 },
  dayTemp: { fontSize: 11, color: WeatherColors.textSecondary, fontWeight: "500" as const },
  dayTempSelected: { color: WeatherColors.textPrimary },
  comfortCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 16,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, marginBottom: 12,
  },
  comfortHeader: { marginBottom: 14 },
  comfortTitle: { fontSize: 15, fontWeight: "600" as const, color: WeatherColors.textPrimary },
  comfortScoreRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 16 },
  comfortScoreCircle: { alignItems: "center" as const },
  comfortScore: { fontSize: 38, fontWeight: "800" as const, lineHeight: 42 },
  comfortLabel: { fontSize: 12, fontWeight: "700" as const },
  comfortDetails: { flex: 1, gap: 8 },
  comfortDetailRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  comfortDetailText: { fontSize: 13, color: WeatherColors.textSecondary },
  recsCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 14,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder, marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "600" as const, color: WeatherColors.textPrimary, marginBottom: 12 },
  recRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 10, marginBottom: 8 },
  recText: { fontSize: 13, color: WeatherColors.textSecondary, lineHeight: 18, flex: 1 },
  bringCard: {
    marginHorizontal: 16, padding: 16, borderRadius: 14,
    backgroundColor: WeatherColors.cardBackground, borderWidth: 1, borderColor: WeatherColors.cardBorder, marginBottom: 12,
  },
  bringChips: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  bringChip: {
    backgroundColor: "rgba(244, 164, 54, 0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(244, 164, 54, 0.2)",
  },
  bringChipText: { fontSize: 12, fontWeight: "600" as const, color: WeatherColors.accent },
});
