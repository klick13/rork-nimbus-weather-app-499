import { Tabs } from "expo-router";
import { CloudSun, MapPin, Crown, Map, AlertTriangle, Settings } from "lucide-react-native";
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
          backgroundColor: "rgba(7, 11, 20, 0.92)",
          borderTopColor: "rgba(0, 201, 232, 0.10)",
          borderTopWidth: 0.5,
          ...(Platform.OS === "web" ? { height: 60 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
          letterSpacing: 0.3,
        },
        tabBarIconStyle: {
          marginBottom: 2,
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
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <Map color={color} size={size} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <AlertTriangle color={color} size={size} strokeWidth={1.5} />
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
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} strokeWidth={1.5} />
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

    </Tabs>
  );
}
