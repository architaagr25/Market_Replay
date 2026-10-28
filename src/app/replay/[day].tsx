import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CandleChart } from "@/components/chart/CandleChart";
import { colors } from "@/constants/colors";
import { findDay } from "@/data/catalog";
import { loadDay } from "@/data/loadDay";
import type { TradingDay } from "@/data/types";
import { useReplay } from "@/hooks/useReplay";

export default function ReplayScreen() {
  const { day: id } = useLocalSearchParams<{ day: string }>();
  const entry = findDay(id);

  if (!entry) {
    return (
      <View style={styles.center}>
        <Text>No replay for {id}</Text>
      </View>
    );
  }

  // Keyed on the date so switching days gives a fresh clock and account
  return <Replay key={entry.id} title={entry.title} day={loadDay(entry)} />;
}

function Replay({ title, day }: { title: string; day: TradingDay }) {
  const replay = useReplay(day);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />
      <Text style={styles.price}>{replay.snapshot.lastPrice.toFixed(2)}</Text>
      <View style={styles.chart}>
        <CandleChart
          candles={replay.snapshot.candles}
          prevClose={day.prevClose}
          lastPrice={replay.snapshot.lastPrice}
        />
      </View>
      <Pressable
        style={styles.button}
        onPress={replay.isPlaying ? replay.pause : replay.play}
      >
        <Text style={styles.buttonText}>{replay.isPlaying ? "Pause" : "Play"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  price: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  chart: {
    height: 320,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: colors.up,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
