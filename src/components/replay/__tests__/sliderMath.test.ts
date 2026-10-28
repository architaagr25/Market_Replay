import { positionOfTime, timeAtPosition } from "../sliderMath";

const MINUTE = 60_000;
const OPEN = Date.parse("2024-06-04T09:15:00+05:30");
const CLOSE = OPEN + 375 * MINUTE;

describe("timeAtPosition", () => {
  it("maps the ends of the track to the open and close", () => {
    expect(timeAtPosition(0, 300, OPEN, CLOSE)).toBe(OPEN);
    expect(timeAtPosition(300, 300, OPEN, CLOSE)).toBe(CLOSE);
  });

  it("snaps down to the start of a minute", () => {
    // 10% along is 37.5 minutes in
    expect(timeAtPosition(30, 300, OPEN, CLOSE)).toBe(OPEN + 37 * MINUTE);
  });

  it("clamps touches outside the track", () => {
    expect(timeAtPosition(-50, 300, OPEN, CLOSE)).toBe(OPEN);
    expect(timeAtPosition(900, 300, OPEN, CLOSE)).toBe(CLOSE);
  });

  it("copes with a track that hasn't been laid out yet", () => {
    expect(timeAtPosition(10, 0, OPEN, CLOSE)).toBe(OPEN);
  });
});

describe("positionOfTime", () => {
  it("is the inverse of timeAtPosition on minute boundaries", () => {
    const time = OPEN + 150 * MINUTE;
    expect(timeAtPosition(positionOfTime(time, 300, OPEN, CLOSE), 300, OPEN, CLOSE)).toBe(
      time,
    );
  });

  it("clamps times outside the session", () => {
    expect(positionOfTime(OPEN - MINUTE, 300, OPEN, CLOSE)).toBe(0);
    expect(positionOfTime(CLOSE + MINUTE, 300, OPEN, CLOSE)).toBe(300);
  });
});
