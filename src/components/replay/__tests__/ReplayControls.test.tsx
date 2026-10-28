import { fireEvent, render, screen } from "@testing-library/react-native";

import { ReplayControls } from "../ReplayControls";

const OPEN = Date.parse("2024-06-04T09:15:00+05:30");

async function setup(overrides: Partial<Parameters<typeof ReplayControls>[0]> = {}) {
  const props = {
    time: OPEN,
    isPlaying: false,
    isFinished: false,
    speed: 60,
    onPlay: jest.fn(),
    onPause: jest.fn(),
    onSpeedChange: jest.fn(),
    ...overrides,
  };
  await render(<ReplayControls {...props} />);
  return { props };
}

describe("ReplayControls", () => {
  it("shows the market time", async () => {
    await setup();

    expect(screen.getByText("09:15")).toBeTruthy();
  });

  it("plays when paused", async () => {
    const { props } = await setup();

    fireEvent.press(screen.getByLabelText("Play"));

    expect(props.onPlay).toHaveBeenCalled();
  });

  it("pauses when playing", async () => {
    const { props } = await setup({ isPlaying: true });

    fireEvent.press(screen.getByLabelText("Pause"));

    expect(props.onPause).toHaveBeenCalled();
  });

  it("offers to replay again once the day is over", async () => {
    await setup({ isFinished: true });

    expect(screen.getByLabelText("Replay from the open")).toBeTruthy();
  });

  it("marks the current speed and changes it on press", async () => {
    const { props } = await setup({ speed: 60 });

    expect(screen.getByLabelText("60 times speed")).toBeSelected();
    expect(screen.getByLabelText("300 times speed")).not.toBeSelected();

    fireEvent.press(screen.getByLabelText("300 times speed"));
    expect(props.onSpeedChange).toHaveBeenCalledWith(300);
  });
});
