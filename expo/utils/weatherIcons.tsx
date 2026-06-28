import React from "react";
import { View } from "react-native";
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  Snowflake,
  Wind,
  CloudFog,
  Zap,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

const iconMap: Record<string, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  "cloud-rain": CloudRain,
  "cloud-drizzle": CloudDrizzle,
  "cloud-snow": CloudSnow,
  "cloud-lightning": CloudLightning,
  snowflake: Snowflake,
  wind: Wind,
  "cloud-fog": CloudFog,
};

export function getWeatherIcon(iconName: string): LucideIcon {
  return iconMap[iconName] ?? Cloud;
}

// ── Per-condition neon icon colors ────────────────────────────────────────

const SUN_COLOR = "#FFB800";
const MOON_COLOR = "#E2E6F2";
const CLOUD_WHITE = "#E8ECF4";
const THUNDERSTORM_CLOUD = "#2A2850";
const THUNDERSTORM_GLOW = "rgba(90, 85, 160, 0.35)";
const THUNDERSTORM_LIGHTNING_RED = "#FF3D71";
const THUNDERSTORM_LIGHTNING_GREEN = "#3DFF9A";
const THUNDERSTORM_OUTLINE = "#E8ECF4";
const RAIN_BLUE = "#48CAE4";
const DRIZZLE_BLUE = "#7EC8E3";
const SNOW_ICE = "#D8E8F0";
const WIND_BLUE = "#B0C8E0";
const FOG_GRAY = "#A0A8B0";

/**
 * Returns the neon color for a given weather icon name.
 * Distinct per condition so symbols pop instead of blending in.
 */
export function getWeatherIconColor(iconName: string): string {
  switch (iconName) {
    case "sun":
      return SUN_COLOR;
    case "moon":
      return MOON_COLOR;
    case "cloud":
      return CLOUD_WHITE;
    case "cloud-sun":
      return SUN_COLOR;
    case "cloud-moon":
      return MOON_COLOR;
    case "cloud-lightning":
      return THUNDERSTORM_CLOUD;
    case "cloud-rain":
      return RAIN_BLUE;
    case "cloud-drizzle":
      return DRIZZLE_BLUE;
    case "cloud-snow":
      return SNOW_ICE;
    case "snowflake":
      return SNOW_ICE;
    case "wind":
      return WIND_BLUE;
    case "cloud-fog":
      return FOG_GRAY;
    default:
      return CLOUD_WHITE;
  }
}

// ── Thunderstorm icon — dark cloud silhouette with red+blue lightning bolts ──

interface ThunderstormIconProps {
  size?: number;
  strokeWidth?: number;
}

export function ThunderstormIcon({ size = 54, strokeWidth = 1.5 }: ThunderstormIconProps) {
  const boltSize = size * 0.42;
  const boltOffsetX = size * 0.16;
  const boltOffsetY = size * 0.08;

  return (
    <View style={{ width: size + 4, height: size + 4, alignItems: "center", justifyContent: "center" }}>
      {/* Neon white outline behind the cloud */}
      <Cloud
        size={size + 4}
        color={THUNDERSTORM_OUTLINE}
        strokeWidth={strokeWidth + 6}
        style={{ position: "absolute", opacity: 0.5 }}
      />
      {/* Glow halo */}
      <Cloud
        size={size + 4}
        color={THUNDERSTORM_GLOW}
        strokeWidth={strokeWidth + 4}
        style={{ position: "absolute", opacity: 0.5 }}
      />
      {/* Dark cloud body */}
      <Cloud
        size={size}
        color={THUNDERSTORM_CLOUD}
        strokeWidth={strokeWidth + 0.5}
        fill={THUNDERSTORM_CLOUD}
        style={{ position: "absolute" }}
      />
      {/* Red lightning bolt — left side, angled */}
      <View style={{ position: "absolute", left: -boltOffsetX, top: boltOffsetY }}>
        <Zap size={boltSize} color={THUNDERSTORM_LIGHTNING_RED} strokeWidth={strokeWidth + 0.5} fill={THUNDERSTORM_LIGHTNING_RED} />
      </View>
      {/* Green lightning bolt — right side */}
      <View style={{ position: "absolute", left: boltOffsetX, top: boltOffsetY }}>
        <Zap size={boltSize} color={THUNDERSTORM_LIGHTNING_GREEN} strokeWidth={strokeWidth + 0.5} fill={THUNDERSTORM_LIGHTNING_GREEN} />
      </View>
    </View>
  );
}
