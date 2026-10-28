import { DAYS } from "@/data/catalog";
import { loadDay } from "@/data/loadDay";

import { makeDay, MINUTE, OPEN } from "../__fixtures__/makeDay";
import { eventsForDay, latestEvent } from "../events";

describe("eventsForDay", () => {
  it("places news at its IST clock time", () => {
    const day = makeDay([[100, 100.5, 99.5, 100]]);

    const [event] = eventsForDay(day, [{ at: "09:15", title: "Counting under way" }]);

    expect(event).toMatchObject({
      time: OPEN,
      title: "Counting under way",
      kind: "news",
    });
  });

  it("calls out a gap at the open", () => {
    // Previous close 100, opens at 97
    const day = makeDay([[97, 97.5, 96.5, 97]], 100);

    expect(eventsForDay(day)[0]).toMatchObject({ title: "Opens 3.0% lower", time: OPEN });
  });

  it("fires a milestone when price first reaches it, not before", () => {
    const day = makeDay([
      [100, 100.5, 99.5, 100],
      [100, 100.2, 97.5, 98], // falls through -2% during this minute
      [98, 98, 95, 95.5], // and -4% during this one
    ]);

    const events = eventsForDay(day);

    expect(events.map((e) => e.title)).toEqual([
      "Nifty down 2% on the day",
      "Nifty down 4% on the day",
    ]);
    expect(events[0]!.time).toBeGreaterThan(OPEN + MINUTE);
    expect(events[0]!.time).toBeLessThan(OPEN + 2 * MINUTE);
  });

  it("doesn't repeat milestones already passed at the open", () => {
    // Opens 3% down, then falls to -4%
    const day = makeDay([[97, 97, 95.5, 96]], 100);

    const titles = eventsForDay(day).map((e) => e.title);

    expect(titles).not.toContain("Nifty down 2% on the day");
    expect(titles).toContain("Nifty down 4% on the day");
  });

  it("announces trading resuming after the halt on 13 March 2020", () => {
    const covid = loadDay(DAYS.find((d) => d.id === "2020-03-13")!);

    const resume = eventsForDay(covid).find((e) => e.kind === "halt");

    expect(resume).toMatchObject({
      title: "Trading resumes",
      time: Date.parse("2020-03-13T10:21:00+05:30"),
    });
  });

  it("returns events in time order", () => {
    const election = loadDay(DAYS.find((d) => d.id === "2024-06-04")!);
    const times = eventsForDay(election, [{ at: "12:00", title: "Midday" }]).map(
      (e) => e.time,
    );

    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

describe("latestEvent", () => {
  const events = eventsForDay(makeDay([[100, 100.5, 99.5, 100]]), [
    { at: "09:30", title: "First" },
    { at: "10:00", title: "Second" },
  ]);

  it("is null before anything has happened", () => {
    expect(latestEvent(events, OPEN)).toBeNull();
  });

  it("picks the most recent event", () => {
    // 09:45: after the 09:30 item, before the 10:00 one
    expect(latestEvent(events, OPEN + 30 * MINUTE)!.title).toBe("First");
    expect(latestEvent(events, OPEN + 50 * MINUTE)!.title).toBe("Second");
  });
});
