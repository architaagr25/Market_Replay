import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { Candle } from "@/data/types";
import { formatPrice, formatTime } from "@/utils/format";

/** Open, high, low and close of the candle under the crosshair. */
export function CrosshairTooltip({ candle }: { candle: Candle }) {
  const closeColor = candle.close >= candle.open ? colors.up : colors.down;

  return (
    <View style={styles.tooltip} pointerEvents="none">
      <Text style={styles.time}>{formatTime(candle.time)}</Text>
      <Value label="O" value={candle.open} />
      <Value label="H" value={candle.high} />
      <Value label="L" value={candle.low} />
      <Value label="C" value={candle.close} color={closeColor} />
    </View>
  );
}

function Value({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Text style={styles.label}>
      {label}{" "}
      <Text style={[styles.value, color ? { color } : null]}>{formatPrice(value)}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: "absolute",
    top: 0,
    left: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  time: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  label: {
    fontSize: 11,
    color: colors.muted,
  },
  value: {
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
});
