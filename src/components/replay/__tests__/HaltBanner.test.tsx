import { render, screen } from "@testing-library/react-native";

import { HaltBanner } from "../HaltBanner";

describe("HaltBanner", () => {
  it("says when trading will resume", async () => {
    await render(
      <HaltBanner
        halt={{
          start: Date.parse("2020-03-13T09:22:00+05:30"),
          end: Date.parse("2020-03-13T10:21:00+05:30"),
        }}
      />,
    );

    expect(screen.getByText("Trading halted")).toBeTruthy();
    expect(
      screen.getByText("No orders can be placed. Trading resumes at 10:21."),
    ).toBeTruthy();
  });
});
