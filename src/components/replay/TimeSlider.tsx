import { useEffect, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { colors } from "@/constants/colors";
import type { Halt } from "@/engine/halts";
import { formatTime } from "@/utils/format";

import { positionOfTime, timeAtPosition } from "./sliderMath";

const THUMB_SIZE = 20;

interface Props {
  time: number;
  start: number;
  end: number;
  halts: readonly Halt[];
  onSeek: (time: number) => void;
}

/**
 * Scrubber for the whole session. The thumb follows the finger on the UI
 * thread; the replay itself is told about the new time through onSeek, at
 * most once per minute of market time crossed, so dragging doesn't flood
 * React with updates.
 */
export function TimeSlider({ time, start, end, halts, onSeek }: Props) {
  const [width, setWidth] = useState(0);
  const trackWidth = useSharedValue(0);
  const playhead = useSharedValue(time);
  const dragging = useSharedValue(false);
  const dragTime = useSharedValue(time);

  useEffect(() => {
    playhead.set(time);
  }, [playhead, time]);

  const onLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.width;
    setWidth(measured);
    trackWidth.set(measured);
  };

  const scrubTo = (x: number) => {
    "worklet";
    const next = timeAtPosition(x, trackWidth.get(), start, end);
    if (next !== dragTime.get()) {
      dragTime.set(next);
      scheduleOnRN(onSeek, next);
    }
  };

  // minDistance 0 makes a plain tap on the track jump straight there too
  const gesture = usePanGesture({
    minDistance: 0,
    onActivate: (event) => {
      "worklet";
      dragging.set(true);
      scrubTo(event.x);
    },
    onUpdate: (event) => {
      "worklet";
      scrubTo(event.x);
    },
    onFinalize: () => {
      "worklet";
      dragging.set(false);
    },
  });

  // While dragging the thumb shows where the finger is. Otherwise it shows
  // where the replay actually is, which also snaps it back if a jump was
  // refused (rewinding after a trade).
  const thumbStyle = useAnimatedStyle(() => {
    const at = dragging.get() ? dragTime.get() : playhead.get();
    return {
      transform: [{ translateX: positionOfTime(at, trackWidth.get(), start, end) }],
    };
  });

  const fillStyle = useAnimatedStyle(() => ({
    width: positionOfTime(playhead.get(), trackWidth.get(), start, end),
  }));

  return (
    <View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.hitArea}
          onLayout={onLayout}
          accessibilityRole="adjustable"
          accessibilityLabel="Replay time"
          accessibilityValue={{ text: formatTime(time) }}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
            {width > 0 &&
              halts.map((halt) => {
                const left = positionOfTime(halt.start, width, start, end);
                const right = positionOfTime(halt.end, width, start, end);
                return (
                  <View
                    key={halt.start}
                    style={[styles.halt, { left, width: right - left }]}
                  />
                );
              })}
          </View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
      <View style={styles.labels}>
        <Text style={styles.label}>{formatTime(start)}</Text>
        <Text style={styles.label}>{formatTime(end)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Taller than the track so it's easy to grab with a thumb
  hitArea: {
    height: 32,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.grid,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.up,
  },
  halt: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: colors.warning,
  },
  thumb: {
    position: "absolute",
    left: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.up,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    color: colors.muted,
  },
});
