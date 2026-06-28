export default {
  light: {
    text: "#FFFFFF",
    background: "#070B14",
    tint: "#00C9E8",
    tabIconDefault: "#3A3A4A",
    tabIconSelected: "#00C9E8",
  },
};

export const WeatherColors = {
  // Core palette — matched to screenshots
  backgroundDark: "#070B14",
  backgroundMid: "#090D1A",
  backgroundLight: "#0E1220",
  cardBackground: "rgba(11, 16, 30, 0.65)",
  cardBorder: "rgba(0, 201, 232, 0.14)",
  cardBorderHover: "rgba(0, 201, 232, 0.22)",
  accent: "#00C9E8",
  accentWarm: "#FF3D71",
  accentCool: "#00C9E8",
  neonGreen: "#3DFF9A",
  neonPink: "#FF3D71",
  neonYellow: "#F0FF00",
  neonPurple: "#BF40FF",
  textPrimary: "#EDEDF5",
  textSecondary: "rgba(237, 237, 245, 0.58)",
  textTertiary: "rgba(237, 237, 245, 0.33)",
  separator: "rgba(0, 201, 232, 0.07)",

  // Atmospheric gradients
  gradientClear: ["#070B14", "#090D1C", "#0E1226"] as const,
  gradientCloudy: ["#090B14", "#0D1020", "#13162A"] as const,
  gradientRainy: ["#050910", "#0A0E1A", "#0E1224"] as const,
  gradientSunny: ["#070B14", "#0A0E1A", "#101428"] as const,
  gradientNight: ["#040710", "#070911", "#0B0E1A"] as const,

  // Weather-specific accents
  tempHigh: "#FF3D71",
  tempLow: "#00C9E8",
  precipBlue: "#00B4D8",
  uvHigh: "#FF3D71",

  // Glows — refined for lower opacity, atmospheric feel
  glowCyan: "rgba(0, 201, 232, 0.12)",
  glowGreen: "rgba(61, 255, 154, 0.10)",
  glowPink: "rgba(255, 61, 113, 0.10)",
};
