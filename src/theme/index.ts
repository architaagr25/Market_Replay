import { useMemo } from "react";
import { useColorScheme } from "react-native";

const light = {
  up: "#00b386",
  down: "#eb5b3c",
  warning: "#e8a200",
  /** Candles where nothing traded, like the minutes of a halt. */
  flat: "#a3a5b0",
  text: "#1b1d21",
  muted: "#7c7e8c",
  grid: "#e9e9ef",
  border: "#dcdce4",
  /** Cards, panels and the chart. */
  background: "#ffffff",
  /** Behind the cards. */
  screen: "#f6f6f9",
  /** Text and icons on top of a coloured button. */
  onAccent: "#ffffff",
};

export type Palette = typeof light;

// Same green and red in both modes, so a gain looks like a gain however the
// phone is set up. Only the neutrals change.
const dark: Palette = {
  ...light,
  flat: "#5d5f6b",
  text: "#ececf1",
  muted: "#8d8f9c",
  grid: "#26272e",
  border: "#33343d",
  background: "#16171c",
  screen: "#0d0e11",
};

/** The palette for the phone's current light or dark setting. */
export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

/**
 * Builds a component's styles from the current palette and rebuilds them only
 * when the phone switches between light and dark. `create` should be defined
 * outside the component so it doesn't change on every render.
 */
export function useThemedStyles<T>(create: (palette: Palette) => T): T {
  const palette = usePalette();
  return useMemo(() => create(palette), [create, palette]);
}
