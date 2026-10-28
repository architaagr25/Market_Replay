import { router, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CandleChart } from "@/components/chart/CandleChart";
import { findDay } from "@/data/catalog";
import { loadDay } from "@/data/loadDay";
import type { TradingDay } from "@/data/types";
import { type Account, STARTING_CASH } from "@/engine/paperBroker";
import { summarizeSession } from "@/engine/sessionSummary";
import { getResult } from "@/state/sessionResults";
import { type Palette, usePalette, useThemedStyles } from "@/theme";
import { formatRupees } from "@/utils/format";

export default function ResultScreen() {
  const styles = useThemedStyles(createStyles);
  const { day: id } = useLocalSearchParams<{ day: string }>();
  const entry = findDay(id);
  const account = getResult(id);

  // Results live in memory, so after a full reload there's nothing to show
  if (!entry || !account) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: "Results" }} />
        <Text style={styles.emptyText}>No finished replay to show.</Text>
        <Button label="Pick a day" onPress={() => router.dismissAll()} />
      </View>
    );
  }

  return <Result title={entry.title} day={loadDay(entry)} account={account} />;
}

function Result({
  title,
  day,
  account,
}: {
  title: string;
  day: TradingDay;
  account: Account;
}) {
  const colors = usePalette();
  const styles = useThemedStyles(createStyles);
  const summary = summarizeSession(account, day);
  const vsHold = summary.netPnl - summary.buyAndHold.pnl;
  const didNothing = summary.tradeCount === 0;
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: 16 + insets.bottom }]}
    >
      <Stack.Screen options={{ title: "Your results" }} />

      <View style={styles.hero}>
        <Text style={styles.caption}>{title}</Text>
        <Text style={[styles.pnl, { color: pnlColor(summary.netPnl, colors) }]}>
          {formatRupees(summary.netPnl, { signed: true })}
        </Text>
        <Text style={styles.caption}>
          {summary.returnPercent >= 0 ? "+" : ""}
          {summary.returnPercent.toFixed(2)}% on ₹{STARTING_CASH / 1_00_000} lakh
          {summary.openPosition !== 0 && " · open position valued at the close"}
        </Text>
      </View>

      <View style={styles.chart}>
        <CandleChart
          candles={day.candles}
          lastPrice={summary.closePrice}
          prevClose={day.prevClose}
          trades={account.trades}
          fitAll
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Against buy and hold</Text>
        <Text style={styles.body}>
          Buying {summary.buyAndHold.quantity} units at the open and holding to the close
          would have made{" "}
          <Text
            style={{ color: pnlColor(summary.buyAndHold.pnl, colors), fontWeight: "600" }}
          >
            {formatRupees(summary.buyAndHold.pnl, { signed: true })}
          </Text>
          .
        </Text>
        {!didNothing && (
          <Text style={[styles.verdict, { color: pnlColor(vsHold, colors) }]}>
            {vsHold >= 0 ? "You beat it by " : "You trailed it by "}
            {formatRupees(Math.abs(vsHold))}
          </Text>
        )}
      </View>

      <View style={styles.stats}>
        <Stat label="Trades" value={String(summary.tradeCount)} />
        <Stat
          label="Win rate"
          value={summary.winRate === null ? "–" : `${Math.round(summary.winRate * 100)}%`}
        />
        <Stat
          label="Best trade"
          value={
            summary.bestTrade
              ? formatRupees(summary.bestTrade.realizedPnl, { signed: true })
              : "–"
          }
        />
        <Stat
          label="Worst trade"
          value={
            summary.worstTrade
              ? formatRupees(summary.worstTrade.realizedPnl, { signed: true })
              : "–"
          }
        />
        <Stat label="Brokerage" value={formatRupees(summary.charges)} />
      </View>

      <View style={styles.actions}>
        <Button label="Back to the replay" onPress={() => router.back()} secondary />
        <Button label="Pick another day" onPress={() => router.dismissAll()} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.caption}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Button({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

function pnlColor(amount: number, colors: Palette) {
  if (Math.abs(amount) < 0.005) return colors.text;
  return amount > 0 ? colors.up : colors.down;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 24,
    },
    emptyText: {
      fontSize: 15,
      color: colors.muted,
    },
    hero: {
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
    },
    pnl: {
      fontSize: 36,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    caption: {
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
    },
    chart: {
      height: 220,
      padding: 8,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    card: {
      gap: 6,
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    verdict: {
      fontSize: 15,
      fontWeight: "700",
    },
    stats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    stat: {
      flexGrow: 1,
      flexBasis: "30%",
      padding: 12,
      gap: 2,
      borderRadius: 10,
      backgroundColor: colors.background,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      gap: 10,
    },
    button: {
      height: 48,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.up,
    },
    buttonSecondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.85,
    },
    buttonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "700",
    },
    buttonTextSecondary: {
      color: colors.text,
    },
  });
