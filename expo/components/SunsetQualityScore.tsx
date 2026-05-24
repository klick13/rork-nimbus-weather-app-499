import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Sunset, Eye, Droplets, Wind, Cloud } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";

interface SunsetQualityProps {
  humidity: number;
  visibility: number;
  windSpeed: number;
  sunset: string;
  cloudCover: number;
}

function calculateSunsetScore(humidity: number, visibility: number, cloudCover: number): number {
  let score = 0;

  if (cloudCover >= 30 && cloudCover <= 70) score += 35;
  else if (cloudCover >= 20 && cloudCover <= 80) score += 25;
  else if (cloudCover < 20) score += 10;
  else score += 5;

  if (humidity >= 30 && humidity <= 60) score += 25;
  else if (humidity >= 20 && humidity <= 70) score += 18;
  else if (humidity > 70) score += 8;
  else score += 12;

  if (visibility >= 8) score += 20;
  else if (visibility >= 5) score += 15;
  else if (visibility >= 3) score += 8;
  else score += 3;

  if (humidity >= 40 && humidity <= 55) score += 20;
  else if (humidity >= 30 && humidity <= 65) score += 14;
  else score += 7;

  return Math.min(100, Math.max(0, score));
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Stunning";
  if (score >= 60) return "Beautiful";
  if (score >= 40) return "Average";
  return "Poor";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#FF6B8A";
  if (score >= 60) return "#F4A436";
  if (score >= 40) return "#4A9FE8";
  return WeatherColors.textTertiary;
}

function getTimeUntilSunset(sunsetStr: string): string {
  try {
    const now = new Date();
    const parts = sunsetStr.split(" ");
    if (parts.length < 2) return "";
    const timePart = parts[0] ?? "";
    const ampm = parts[1] ?? "";
    const timeParts = timePart.split(":");
    let hour = parseInt(timeParts[0] ?? "0", 10);
    const min = parseInt(timeParts[1] ?? "0", 10);
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const sunsetDate = new Date();
    sunsetDate.setHours(hour, min, 0, 0);

    const diff = sunsetDate.getTime() - now.getTime();
    if (diff <= 0) return "Sunset has passed";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m until sunset`;
    return `${mins}m until sunset`;
  } catch {
    return "";
  }
}

export default function SunsetQualityScore({
  humidity,
  visibility,
  windSpeed,
  sunset,
  cloudCover,
}: SunsetQualityProps) {
  const score = useMemo(
    () => calculateSunsetScore(humidity, visibility, cloudCover),
    [humidity, visibility, cloudCover]
  );
  const label = getScoreLabel(score);
  const color = getScoreColor(score);
  const timeUntil = getTimeUntilSunset(sunset);
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: score / 100,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score, fillAnim]);

  const barWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const factors = [
    { icon: Cloud, label: "Clouds", value: `${cloudCover}%`, good: cloudCover >= 30 && cloudCover <= 70 },
    { icon: Droplets, label: "Humidity", value: `${humidity}%`, good: humidity >= 30 && humidity <= 60 },
    { icon: Eye, label: "Visibility", value: `${visibility} mi`, good: visibility >= 5 },
    { icon: Wind, label: "Wind", value: `${windSpeed} mph`, good: windSpeed < 15 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sunset size={18} color="#FF6B8A" strokeWidth={1.5} />
        <Text style={styles.headerTitle}>SUNSET QUALITY</Text>
      </View>

      <View style={styles.scoreSection}>
        <View style={styles.scoreLeft}>
          <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
        </View>
        <View style={styles.scoreRight}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
          </View>
          {timeUntil ? <Text style={styles.timeUntil}>{timeUntil}</Text> : null}
        </View>
      </View>

      <View style={styles.factorGrid}>
        {factors.map((f) => {
          const FIcon = f.icon;
          return (
            <View key={f.label} style={styles.factorItem}>
              <FIcon
                size={16}
                color={f.good ? "#34C759" : WeatherColors.textTertiary}
                strokeWidth={1.5}
              />
              <Text style={styles.factorLabel}>{f.label}</Text>
              <Text
                style={[
                  styles.factorValue,
                  { color: f.good ? "#34C759" : WeatherColors.textSecondary },
                ]}
              >
                {f.value}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 16,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 1.2,
  },
  scoreSection: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
    marginBottom: 14,
  },
  scoreLeft: {
    alignItems: "center" as const,
  },
  scoreNumber: {
    fontSize: 54,
    fontWeight: "800" as const,
    lineHeight: 58,
  },
  scoreLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  scoreRight: {
    flex: 1,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden" as const,
    marginBottom: 8,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  timeUntil: {
    fontSize: 15,
    color: WeatherColors.textSecondary,
  },
  factorGrid: {
    flexDirection: "row" as const,
    borderTopWidth: 1,
    borderTopColor: WeatherColors.separator,
    paddingTop: 12,
    gap: 4,
  },
  factorItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 4,
  },
  factorLabel: {
    fontSize: 13,
    color: WeatherColors.textTertiary,
  },
  factorValue: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
