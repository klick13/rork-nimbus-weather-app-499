import { Stack } from "expo-router";
import React from "react";
import { WeatherColors } from "@/constants/colors";

export default function LocationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: WeatherColors.backgroundDark },
      }}
    />
  );
}
