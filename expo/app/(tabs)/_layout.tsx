import { Tabs } from "expo-router";
import { CloudSun, MapPin, Crown, Users } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { WeatherColors } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: WeatherColors.accent,
        tabBarInactiveTintColor: WeatherColors.textTertiary,
        tabBarStyle: {
          backgroundColor: "rgba(5, 5, 8, 0.97)",
          borderTopColor: "rgba(0, 240, 255, 0.08)",
          borderTopWidth: 0.5,
          ...(Platform.OS === "web" ? { height: 60 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600" as const,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="(weather)"
        options={{
          title: "Weather",
          tabBarIcon: ({ color, size }) => (
            <CloudSun color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: "Locations",
          tabBarIcon: ({ color, size }) => (
            <MapPin color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="pro"
        options={{
          title: "Pro",
          tabBarIcon: ({ color, size }) => (
            <Crown color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
    </Tabs>
  );
}
