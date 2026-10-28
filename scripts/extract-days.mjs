#!/usr/bin/env node
// Pulls individual trading days out of the Nifty 50 one-minute CSV and writes
// each one as a small JSON file the app can bundle.
//
// Usage:
//   node scripts/extract-days.mjs "<path to NIFTY 50_minute.csv>" 2024-06-04 2021-02-01
//
// The source CSV is ~58 MB, so it's streamed line by line rather than loaded
// whole. Its timestamps are plain IST wall-clock times with no offset.

import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

const OUT_DIR = path.join(import.meta.dirname, "..", "src", "data", "days");

const [csvPath, ...dates] = process.argv.slice(2);

if (!csvPath || dates.length === 0) {
  console.error('Usage: node scripts/extract-days.mjs "<csv path>" <YYYY-MM-DD> [...]');
  process.exit(1);
}

for (const date of dates) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`Not a date: ${date}`);
    process.exit(1);
  }
}

const wanted = new Set(dates);
const days = new Map(); // date -> { prevClose, candles }

// The previous session's last close, so the app can show the day's % change
// the same way a broker would. Updated as we walk past each day.
let lastDate = null;
let lastClose = null;
let closeBeforeLastDate = null;

const lines = readline.createInterface({
  input: createReadStream(csvPath),
  crlfDelay: Infinity,
});

let header = true;
for await (const line of lines) {
  if (header) {
    header = false;
    continue;
  }
  if (!line) continue;

  const [stamp, open, high, low, close] = line.split(",");
  const date = stamp.slice(0, 10);

  if (date !== lastDate) {
    closeBeforeLastDate = lastClose;
    lastDate = date;
  }
  lastClose = Number(close);

  if (!wanted.has(date)) continue;

  let day = days.get(date);
  if (!day) {
    day = { prevClose: closeBeforeLastDate, candles: [] };
    days.set(date, day);
  }

  // "2024-06-04 09:15:00" in IST -> UTC epoch milliseconds
  const time = Date.parse(`${stamp.replace(" ", "T")}+05:30`);
  day.candles.push([time, Number(open), Number(high), Number(low), Number(close)]);
}

await mkdir(OUT_DIR, { recursive: true });

for (const date of dates) {
  const day = days.get(date);
  if (!day) {
    console.error(`No rows found for ${date} (holiday or weekend?)`);
    process.exitCode = 1;
    continue;
  }

  // Candles are stored as [time, open, high, low, close] tuples to keep the
  // bundled files small. One row per line keeps diffs readable.
  const rows = day.candles.map((c) => `    ${JSON.stringify(c)}`).join(",\n");
  const json = `{\n  "date": "${date}",\n  "prevClose": ${day.prevClose},\n  "candles": [\n${rows}\n  ]\n}\n`;

  const file = path.join(OUT_DIR, `${date}.json`);
  await writeFile(file, json);
  console.log(
    `${date}: ${day.candles.length} candles -> ${path.relative(process.cwd(), file)}`,
  );
}
