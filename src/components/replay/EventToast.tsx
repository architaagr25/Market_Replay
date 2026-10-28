import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import type { MarketEvent } from "@/engine/events";
import { type Palette, usePalette, useThemedStyles } from "@/theme";
import { formatTime } from "@/utils/format";

const ICONS = {
  news: "newspaper-outline",
  milestone: "pulse",
  halt: "play-circle-outline",
} as const;

export function EventToast({
  event,
  onDismiss,
}: {
  event: MarketEvent;
  onDismiss: () => void;
}) {
  const colors = usePalette();
  const styles = useThemedStyles(createStyles);

  const icon =
    event.tone === "down"
      ? "trending-down"
      : event.tone === "up"
        ? "trending-up"
        : ICONS[event.kind];
  const tint =
    event.tone === "down" ? colors.down : event.tone === "up" ? colors.up : colors.text;

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      style={styles.wrapper}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.toast}
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityHint="Tap to dismiss"
      >
        <Ionicons name={icon} size={20} color={tint} />
        <View style={styles.text}>
          <Text style={styles.title}>
            <Text style={styles.time}>{formatTime(event.time)} </Text>
            {event.title}
          </Text>
          {event.body && <Text style={styles.body}>{event.body}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    wrapper: {
      position: "absolute",
      top: 8,
      left: 12,
      right: 12,
    },
    toast: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      // Lifts it off the chart in light mode; harmless in dark
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    time: {
      color: colors.muted,
      fontVariant: ["tabular-nums"],
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    body: {
      fontSize: 13,
      color: colors.muted,
    },
  });
