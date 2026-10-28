import { renderHook } from "@testing-library/react-native";
import * as ReactNative from "react-native";

import { usePalette } from "..";

describe("usePalette", () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ["light", "#ffffff"],
    ["dark", "#16171c"],
  ] as const)("follows the phone's %s setting", async (scheme, background) => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(scheme);

    const { result } = await renderHook(() => usePalette());

    expect(result.current.background).toBe(background);
  });

  it("keeps gains green and losses red in both modes", async () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");
    const light = (await renderHook(() => usePalette())).result.current;
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");
    const dark = (await renderHook(() => usePalette())).result.current;

    expect(dark.up).toBe(light.up);
    expect(dark.down).toBe(light.down);
  });
});
