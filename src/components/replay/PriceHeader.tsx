import { StyleSheet, Text, View } from "react-native";

import { type Palette, usePalette, useThemedStyles } from "@/theme";
import { formatChange, formatPrice } from "@/utils/format";

export function PriceHeader({ price, prevClose }: { price: number; prevClose: number }) {
  const colors = usePalette();
  const styles = useThemedStyles(createStyles);
  const changeColor =
    price > prevClose ? colors.up : price < prevClose ? colors.down : colors.muted;

  return (
    <View accessible accessibilityLabel={`Nifty 50 at ${formatPrice(price)}`}>
      <Text style={styles.symbol}>NIFTY 50</Text>
      <Text style={styles.price}>{formatPrice(price)}</Text>
      <Text style={[styles.change, { color: changeColor }]}>
        {formatChange(price, prevClose)}
      </Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    symbol: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      color: colors.muted,
    },
    price: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    change: {
      fontSize: 14,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
  });
