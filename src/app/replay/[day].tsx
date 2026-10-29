import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CandleChart } from "@/components/chart/CandleChart";
import { EventToast } from "@/components/replay/EventToast";
import { HaltBanner } from "@/components/replay/HaltBanner";
import { OrderPanel } from "@/components/replay/OrderPanel";
import { PriceHeader } from "@/components/replay/PriceHeader";
import { ReplayControls } from "@/components/replay/ReplayControls";
import { TimeSlider } from "@/components/replay/TimeSlider";
import { type DayEntry, findDay } from "@/data/catalog";
import { loadDay } from "@/data/loadDay";
import type { TradingDay } from "@/data/types";
import { eventsForDay } from "@/engine/events";
import { useEventFeed } from "@/hooks/useEventFeed";
import { useReplay } from "@/hooks/useReplay";
import { useStopHitFeedback } from "@/hooks/useStopHitFeedback";
import { saveResult } from "@/state/sessionResults";
import { type Palette, useThemedStyles } from "@/theme";

export default function ReplayScreen() {
  const styles = useThemedStyles(createStyles);
  const { day: id } = useLocalSearchParams<{ day: string }>();
  const entry = findDay(id);

  if (!entry) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.missing}>No replay found for {id}.</Text>
        <Pressable onPress={() => router.dismissAll()} accessibilityRole="button">
          <Text style={styles.missingLink}>Pick a day</Text>
        </Pressable>
      </View>
    );
  }

  // Keyed on the date so switching days gives a fresh clock and account
  return <Replay key={entry.id} entry={entry} day={loadDay(entry)} />;
}

function Replay({ entry, day }: { entry: DayEntry; day: TradingDay }) {
  const styles = useThemedStyles(createStyles);
  const replay = useReplay(day);
  const events = useMemo(() => eventsForDay(day, entry.news), [day, entry.news]);
  const feed = useEventFeed(events, replay.time);
  useStopHitFeedback(replay.account.trades);
  const [notice, setNotice] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const seek = (time: number) => {
    const result = replay.seek(time);
    setNotice(result.ok ? null : result.reason);
  };

  const confirmReset = () => {
    Alert.alert("Start over?", "This clears your trades and goes back to the open.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start over",
        style: "destructive",
        onPress: () => {
          replay.reset();
          setNotice(null);
        },
      },
    ]);
  };

  const hasTraded = replay.account.trades.length > 0;

  const showResults = () => {
    saveResult(day.date, replay.account);
    router.push({ pathname: "/result/[day]", params: { day: day.date } });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: 16 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen
          options={{
            title: entry.title,
            headerRight: hasTraded
              ? () => (
                  <Pressable
                    onPress={confirmReset}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.reset}>Reset</Text>
                  </Pressable>
                )
              : undefined,
          }}
        />
        <PriceHeader price={replay.snapshot.lastPrice} prevClose={day.prevClose} />
        {replay.halt && <HaltBanner halt={replay.halt} />}
        {replay.isFinished && (
          <Pressable
            style={({ pressed }) => [styles.results, pressed && { opacity: 0.85 }]}
            onPress={showResults}
            accessibilityRole="button"
          >
            <Text style={styles.resultsText}>Market closed · See your results</Text>
          </Pressable>
        )}
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
        <OrderPanel
          account={replay.account}
          price={replay.snapshot.lastPrice}
          isHalted={replay.halt !== null}
          onOrder={replay.placeOrder}
          onSetStopLoss={replay.setStopLoss}
        />
      </ScrollView>
      {feed.event && (
        // Keyed so each new event animates in rather than swapping text in place
        <EventToast key={feed.event.id} event={feed.event} onDismiss={feed.dismiss} />
      )}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: colors.screen,
    },
    missing: {
      fontSize: 15,
      color: colors.muted,
    },
    missingLink: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.up,
    },
    results: {
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
      backgroundColor: colors.text,
    },
    resultsText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: "700",
    },
    reset: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.down,
    },
    chart: {
      height: 280,
    },
    notice: {
      fontSize: 13,
      color: colors.down,
    },
  });
