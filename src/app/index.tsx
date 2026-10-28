import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayCard } from "@/components/DayCard";
import { DAYS } from "@/data/catalog";
import { STARTING_CASH } from "@/engine/paperBroker";
import { type Palette, useThemedStyles } from "@/theme";

export default function Home() {
  const styles = useThemedStyles(createStyles);
  // Android draws edge to edge, so keep the last card clear of the nav bar
  const insets = useSafeAreaInsets();

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: 16 + insets.bottom }]}
      data={DAYS}
      keyExtractor={(day) => day.id}
      renderItem={({ item }) => <DayCard day={item} />}
      ListHeaderComponent={
        <View style={styles.intro}>
          <Text style={styles.heading}>Pick a day to relive</Text>
          <Text style={styles.body}>
            Watch the Nifty 50 move minute by minute and trade it with ₹
            {STARTING_CASH / 1_00_000} lakh of practice money. You only see what traders
            saw at the time.
          </Text>
        </View>
      }
    />
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    intro: {
      gap: 6,
      marginBottom: 4,
    },
    heading: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
    },
  });
