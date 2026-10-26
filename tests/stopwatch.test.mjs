import assert from "node:assert/strict";
import test from "node:test";
import {
  elapsedAt,
  isRunning,
  pause,
  pausedStopwatch,
  splitDuration,
  start,
} from "../src/stopwatch.ts";

test("a run adds the time between start and pause", () => {
  let stopwatch = start(pausedStopwatch(), 1_000);
  assert.equal(isRunning(stopwatch), true);
  assert.equal(elapsedAt(stopwatch, 4_500), 3_500);

  stopwatch = pause(stopwatch, 6_000);
  assert.equal(isRunning(stopwatch), false);
  assert.equal(elapsedAt(stopwatch, 60_000), 5_000);
});

test("pausing and resuming accumulates the runs", () => {
  let stopwatch = pausedStopwatch(10_000);
  stopwatch = start(stopwatch, 0);
  stopwatch = pause(stopwatch, 2_000);
  stopwatch = start(stopwatch, 50_000);
  assert.equal(elapsedAt(stopwatch, 51_000), 13_000);
});

test("elapsed time follows the clock, however rarely it is read", () => {
  // WebKit slows timers down in hidden windows: no tick may be lost.
  const stopwatch = start(pausedStopwatch(), 0);
  assert.equal(elapsedAt(stopwatch, 3 * 3_600_000), 3 * 3_600_000);
});

test("starting twice keeps the first start time", () => {
  const stopwatch = start(start(pausedStopwatch(), 1_000), 5_000);
  assert.equal(elapsedAt(stopwatch, 6_000), 5_000);
});

test("a clock set backwards never makes the stopwatch go back", () => {
  const stopwatch = start(pausedStopwatch(2_000), 10_000);
  assert.equal(elapsedAt(stopwatch, 9_000), 2_000);
});

test("durations are split into hours, minutes and seconds", () => {
  assert.deepEqual(splitDuration(0), { hours: 0, minutes: 0, seconds: 0 });
  assert.deepEqual(splitDuration(59_999), { hours: 0, minutes: 0, seconds: 59 });
  assert.deepEqual(splitDuration(3_661_000), { hours: 1, minutes: 1, seconds: 1 });
  assert.deepEqual(splitDuration(100 * 3_600_000), { hours: 100, minutes: 0, seconds: 0 });
});
