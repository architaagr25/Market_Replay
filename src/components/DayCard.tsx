import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { DayEntry, DayMood } from "@/data/catalog";
import { formatDate } from "@/utils/format";

const MOODS: Record<DayMood, { label: string; color: string }> = {
  crash: { label: "Crash", color: colors.down },
  rally: { label: "Rally", color: colors.up },
  whipsaw: { label: "Whipsaw", color: colors.warning },
};

export function DayCard({ day }: { day: DayEntry }) {
  const mood = MOODS[day.mood];

  return (
    <Link href={{ pathname: "/replay/[day]", params: { day: day.id } }} asChild>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityHint="Opens the replay for this day"
      >
        <View style={styles.header}>
          <Text style={styles.date}>{formatDate(day.id)}</Text>
          <View style={[styles.chip, { backgroundColor: mood.color + "1a" }]}>
            <Text style={[styles.chipText, { color: mood.color }]}>{mood.label}</Text>
          </View>
        </View>
        <Text style={styles.title}>{day.title}</Text>
        <Text style={styles.summary}>{day.summary}</Text>
        <View style={styles.footer}>
          <Text style={styles.cta}>Replay this day</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.up} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 13,
    color: colors.muted,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 4,
  },
  cta: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.up,
  },
});
