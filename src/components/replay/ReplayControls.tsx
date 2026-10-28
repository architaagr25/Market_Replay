import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SPEEDS } from "@/engine/replayClock";
import { type Palette, usePalette, useThemedStyles } from "@/theme";
import { formatTime } from "@/utils/format";

interface Props {
  time: number;
  isPlaying: boolean;
  isFinished: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: number) => void;
}

export function ReplayControls({
  time,
  isPlaying,
  isFinished,
  speed,
  onPlay,
  onPause,
  onSpeedChange,
}: Props) {
  const colors = usePalette();
  const styles = useThemedStyles(createStyles);
  const icon = isPlaying ? "pause" : isFinished ? "refresh" : "play";
  const label = isPlaying ? "Pause" : isFinished ? "Replay from the open" : "Play";

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        onPress={isPlaying ? onPause : onPlay}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
      >
        <Ionicons name={icon} size={22} color={colors.onAccent} />
      </Pressable>

      <Text style={styles.clock} accessibilityLabel={`Market time ${formatTime(time)}`}>
        {formatTime(time)}
      </Text>

      <View style={styles.speeds} accessibilityRole="radiogroup">
        {SPEEDS.map((option) => {
          const selected = option === speed;
          return (
            <Pressable
              key={option}
              style={[styles.speed, selected && styles.speedSelected]}
              onPress={() => onSpeedChange(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option} times speed`}
            >
              <Text style={[styles.speedText, selected && styles.speedTextSelected]}>
                {option}×
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    playButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.up,
    },
    pressed: {
      opacity: 0.8,
    },
    clock: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
      minWidth: 52,
    },
    speeds: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 4,
    },
    speed: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.grid,
    },
    speedSelected: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    speedText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: "500",
    },
    speedTextSelected: {
      color: colors.background,
    },
  });
