import { Canvas, Group, Line, Rect, vec } from "@shopify/react-native-skia";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { DAYS } from "@/data/catalog";

const GREEN = "#00b386";
const RED = "#eb5b3c";

// A few hand-placed candles as a placeholder logo. Mostly here to confirm
// Skia renders before the real chart exists.
const candles = [
  { x: 12, wickTop: 30, wickBottom: 90, bodyTop: 45, bodyBottom: 80, up: true },
  { x: 44, wickTop: 10, wickBottom: 70, bodyTop: 20, bodyBottom: 50, up: true },
  { x: 76, wickTop: 25, wickBottom: 100, bodyTop: 35, bodyBottom: 85, up: false },
];

export default function Home() {
  return (
    <View style={styles.container}>
      <Canvas style={styles.logo}>
        {candles.map((c) => {
          const color = c.up ? GREEN : RED;
          return (
            <Group key={c.x}>
              <Line
                p1={vec(c.x + 8, c.wickTop)}
                p2={vec(c.x + 8, c.wickBottom)}
                color={color}
                strokeWidth={2}
              />
              <Rect
                x={c.x}
                y={c.bodyTop}
                width={16}
                height={c.bodyBottom - c.bodyTop}
                color={color}
              />
            </Group>
          );
        })}
      </Canvas>
      <Text style={styles.title}>Market Replay</Text>
      {DAYS.map((day) => (
        <Link key={day.id} href={{ pathname: "/replay/[day]", params: { day: day.id } }}>
          <Text style={styles.link}>{day.title}</Text>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  logo: {
    width: 104,
    height: 110,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  link: {
    fontSize: 16,
    color: GREEN,
    paddingVertical: 4,
  },
});
