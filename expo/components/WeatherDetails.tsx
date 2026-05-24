import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Thermometer,
  Droplets,
  Wind,
  Eye,
  Sun,
  Gauge,
  Sunrise,
  Sunset,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";
import { WeatherDetails as DetailsType } from "@/types/weather";

interface Props {
  details: DetailsType;
}

interface DetailItem {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}

function DetailCard({ item }: { item: DetailItem }) {
  const Icon = item.icon;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon size={18} color={item.color} strokeWidth={1.5} />
        <Text style={styles.cardLabel}>{item.label}</Text>
      </View>
      <Text style={[styles.cardValue, { color: item.color }]}>{item.value}</Text>
    </View>
  );
}

export default function WeatherDetails({ details }: Props) {
  const items: DetailItem[] = [
    {
      icon: Thermometer,
      label: "FEELS LIKE",
      value: `${details.feelsLike}°`,
      color: WeatherColors.neonPink,
    },
    {
      icon: Droplets,
      label: "HUMIDITY",
      value: `${details.humidity}%`,
      color: WeatherColors.precipBlue,
    },
    {
      icon: Wind,
      label: "WIND",
      value: `${details.windSpeed} mph ${details.windDirection}`,
      color: WeatherColors.accent,
    },
    {
      icon: Eye,
      label: "VISIBILITY",
      value: `${details.visibility} mi`,
      color: WeatherColors.textSecondary,
    },
    {
      icon: Sun,
      label: "UV INDEX",
      value: `${details.uvIndex}`,
      color: details.uvIndex >= 6 ? WeatherColors.neonPink : WeatherColors.neonYellow,
    },
    {
      icon: Gauge,
      label: "PRESSURE",
      value: `${details.pressure} hPa`,
      color: WeatherColors.neonPurple,
    },
    {
      icon: Sunrise,
      label: "SUNRISE",
      value: details.sunrise,
      color: WeatherColors.neonYellow,
    },
    {
      icon: Sunset,
      label: "SUNSET",
      value: details.sunset,
      color: WeatherColors.neonPink,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {items.map((item) => (
          <DetailCard key={item.label} item={item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: WeatherColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WeatherColors.cardBorder,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: WeatherColors.textTertiary,
    letterSpacing: 0.8,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "400" as const,
    color: WeatherColors.textPrimary,
  },
});
