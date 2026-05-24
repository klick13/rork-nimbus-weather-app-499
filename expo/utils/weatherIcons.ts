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
