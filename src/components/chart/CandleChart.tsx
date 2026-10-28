import {
  Canvas,
  DashPathEffect,
  Line,
  matchFont,
  Path,
  Rect,
  Skia,
  Text,
  vec,
} from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { type LayoutChangeEvent, Platform, StyleSheet, View } from "react-native";

import { colors } from "@/constants/colors";
import type { Candle } from "@/data/types";
import { formatPrice, formatTime } from "@/utils/format";

import { priceTicks, timeTicks } from "./axes";
import { CANDLE_SPACING, computeLayout, PRICE_AXIS_WIDTH } from "./chartLayout";

const BODY_WIDTH = CANDLE_SPACING * 0.7;
const LABEL_SIZE = 10;
const PRICE_TAG_HEIGHT = 16;

interface Props {
  candles: readonly Candle[];
  lastPrice: number;
  /** Previous session's close. Colours the price tag green or red. */
  prevClose: number;
}

export function CandleChart({ candles, lastPrice, prevClose }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  // System font, so there's no font file to bundle and load
  const font = useMemo(
    () =>
      matchFont({
        fontFamily: Platform.select({ ios: "Helvetica", default: "sans-serif" }),
        fontSize: LABEL_SIZE,
      }),
    [],
  );

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

  const lastY = layout.y(lastPrice);

  // Price labels that would sit under the last-price tag are dropped rather
  // than drawn on top of each other.
  const prices = useMemo(
    () =>
      priceTicks(layout.minPrice, layout.maxPrice).filter(
        (price) => Math.abs(layout.y(price) - lastY) > PRICE_TAG_HEIGHT,
      ),
    [layout, lastY],
  );

  const times = useMemo(
    () => timeTicks(candles, layout.firstIndex, CANDLE_SPACING),
    [candles, layout.firstIndex],
  );

  const tagColor = lastPrice >= prevClose ? colors.up : colors.down;
  const { plot } = layout;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          {prices.map((price) => {
            const y = layout.y(price);
            return (
              <Line
                key={`grid-${price}`}
                p1={vec(plot.left, y)}
                p2={vec(plot.right, y)}
                color={colors.grid}
                strokeWidth={1}
              />
            );
          })}

          <Path path={paths.upWicks} color={colors.up} style="stroke" strokeWidth={1} />
          <Path
            path={paths.downWicks}
            color={colors.down}
            style="stroke"
            strokeWidth={1}
          />
          <Path path={paths.upBodies} color={colors.up} />
          <Path path={paths.downBodies} color={colors.down} />

          {prices.map((price) => (
            <Text
              key={`price-${price}`}
              x={plot.right + 6}
              y={layout.y(price) + LABEL_SIZE / 3}
              text={formatPrice(price)}
              font={font}
              color={colors.muted}
            />
          ))}

          {times.map((index) => {
            const label = formatTime(candles[index]!.time);
            const width = font.measureText(label).width;
            return (
              <Text
                key={`time-${index}`}
                x={layout.x(index) - width / 2}
                y={size.height - 6}
                text={label}
                font={font}
                color={colors.muted}
              />
            );
          })}

          <Line p1={vec(plot.left, lastY)} p2={vec(plot.right, lastY)} color={tagColor}>
            <DashPathEffect intervals={[4, 4]} />
          </Line>
          <Rect
            x={plot.right}
            y={lastY - PRICE_TAG_HEIGHT / 2}
            width={PRICE_AXIS_WIDTH}
            height={PRICE_TAG_HEIGHT}
            color={tagColor}
          />
          <Text
            x={plot.right + 6}
            y={lastY + LABEL_SIZE / 3}
            text={formatPrice(lastPrice)}
            font={font}
            color="#ffffff"
          />
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
