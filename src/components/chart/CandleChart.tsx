import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";

import { colors } from "@/constants/colors";
import type { Candle } from "@/data/types";

import { CANDLE_SPACING, computeLayout } from "./chartLayout";

const BODY_WIDTH = CANDLE_SPACING * 0.7;

interface Props {
  candles: readonly Candle[];
  lastPrice: number;
}

export function CandleChart({ candles, lastPrice }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const layout = useMemo(
    () => computeLayout({ candles, lastPrice, ...size }),
    [candles, lastPrice, size],
  );

  // All green candles go into one path and all red ones into another, so the
  // canvas draws four shapes per frame however many candles are visible,
  // instead of a few hundred separate Rect and Line elements.
  const paths = useMemo(() => {
    const upBodies = Skia.PathBuilder.Make();
    const downBodies = Skia.PathBuilder.Make();
    const upWicks = Skia.PathBuilder.Make();
    const downWicks = Skia.PathBuilder.Make();

    for (let i = layout.firstIndex; i < candles.length; i++) {
      const candle = candles[i]!;
      const up = candle.close >= candle.open;
      const cx = layout.x(i);

      const wicks = up ? upWicks : downWicks;
      wicks.moveTo(cx, layout.y(candle.high));
      wicks.lineTo(cx, layout.y(candle.low));

      const top = layout.y(Math.max(candle.open, candle.close));
      const bottom = layout.y(Math.min(candle.open, candle.close));
      // Keep doji candles visible as a thin line rather than nothing
      const height = Math.max(1, bottom - top);
      (up ? upBodies : downBodies).addRect(
        Skia.XYWHRect(cx - BODY_WIDTH / 2, top, BODY_WIDTH, height),
      );
    }

    return {
      upBodies: upBodies.detach(),
      downBodies: downBodies.detach(),
      upWicks: upWicks.detach(),
      downWicks: downWicks.detach(),
    };
  }, [candles, layout]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Path path={paths.upWicks} color={colors.up} style="stroke" strokeWidth={1} />
          <Path
            path={paths.downWicks}
            color={colors.down}
            style="stroke"
            strokeWidth={1}
          />
          <Path path={paths.upBodies} color={colors.up} />
          <Path path={paths.downBodies} color={colors.down} />
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
