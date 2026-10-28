import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CandleChart } from "@/components/chart/CandleChart";
import { ReplayControls } from "@/components/replay/ReplayControls";
import { TimeSlider } from "@/components/replay/TimeSlider";
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
  const [notice, setNotice] = useState<string | null>(null);

  const seek = (time: number) => {
    const result = replay.seek(time);
    setNotice(result.ok ? null : result.reason);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title }} />
      <Text style={styles.price}>{replay.snapshot.lastPrice.toFixed(2)}</Text>
      <View style={styles.chart}>
        <CandleChart
          candles={replay.snapshot.candles}
          prevClose={day.prevClose}
          trades={replay.account.trades}
          lastPrice={replay.snapshot.lastPrice}
        />
      </View>
      <ReplayControls
        time={replay.time}
        isPlaying={replay.isPlaying}
        isFinished={replay.isFinished}
        speed={replay.speed}
        onPlay={replay.isFinished ? replay.restart : replay.play}
        onPause={replay.pause}
        onSpeedChange={replay.setSpeed}
      />
      <TimeSlider
        time={replay.time}
        start={replay.start}
        end={replay.end}
        halts={replay.halts}
        onSeek={seek}
      />
      {notice && <Text style={styles.notice}>{notice}</Text>}
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
  notice: {
    fontSize: 13,
    color: colors.down,
  },
});
