import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { Halt } from "@/engine/halts";
import { formatTime } from "@/utils/format";

export function HaltBanner({ halt }: { halt: Halt }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="pause-circle" size={20} color={colors.warning} />
      <View style={styles.text}>
        <Text style={styles.title}>Trading halted</Text>
        <Text style={styles.body}>
          No orders can be placed. Trading resumes at {formatTime(halt.end)}.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.warning + "1f",
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  body: {
    fontSize: 13,
    color: colors.text,
  },
});
