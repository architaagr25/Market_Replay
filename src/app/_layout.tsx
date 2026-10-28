import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { colors } from "@/constants/colors";

export default function RootLayout() {
  // Gesture handler needs a root view above every screen that uses gestures:
  // the chart's long-press crosshair and the time slider both do.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Market Replay" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
