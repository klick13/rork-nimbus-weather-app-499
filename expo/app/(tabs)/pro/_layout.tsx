import { Stack, useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { WeatherColors } from "@/constants/colors";

export default function ProLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: false,
        headerTintColor: WeatherColors.textPrimary,
        headerTitle: "",
        headerStyle: { backgroundColor: WeatherColors.backgroundDark },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: WeatherColors.backgroundDark },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ paddingRight: 12 }}
          >
            <ChevronLeft size={24} color={WeatherColors.textPrimary} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
