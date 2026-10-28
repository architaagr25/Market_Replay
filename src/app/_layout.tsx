import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { usePalette } from "@/theme";

export default function RootLayout() {
  const colors = usePalette();

  // Gesture handler needs a root view above every screen that uses gestures:
  // the chart's long-press crosshair and the time slider both do.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.screen },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Market Replay" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
