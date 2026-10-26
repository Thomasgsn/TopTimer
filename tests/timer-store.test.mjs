import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { useTimerStore } from "../src/stores/timer.ts";

function memoryPersistence() {
  const saved = [];
  return {
    saved,
    saveTimer: async (timer) => {
      saved.push(timer.elapsedMs);
    },
  };
}

let now = 0;
let realNow;

beforeEach((context) => {
  // The store registers its keyboard and IPC listeners when mounted, which
  // these tests do not need.
  context.mock.method(console, "warn", () => {});
  realNow = Date.now;
  now = 1_000_000;
  Date.now = () => now;
});

afterEach(() => {
  Date.now = realNow;
});

test("the stopwatch restarts paused from the saved elapsed time", () => {
  const timer = useTimerStore({
    initialTimer: { elapsedMs: 3_725_000 },
    persistence: memoryPersistence(),
  });
  assert.equal(timer.running.value, false);
  assert.deepEqual([timer.hours.value, timer.minutes.value, timer.seconds.value], [1, 2, 5]);
  assert.equal(timer.canReset.value, true);
});

test("starting, pausing and resetting save the elapsed time", () => {
  const persistence = memoryPersistence();
  const timer = useTimerStore({ initialTimer: null, persistence });
  assert.equal(timer.canReset.value, false);

  timer.toggle();
  assert.equal(timer.running.value, true);
  now += 42_000;
  timer.toggle();
  assert.equal(timer.running.value, false);
  assert.equal(timer.elapsedMs.value, 42_000);

  timer.reset();
  assert.equal(timer.elapsedMs.value, 0);
  assert.deepEqual(persistence.saved, [0, 42_000, 0]);
});

test("quitting saves the current run, and quits even if saving fails", async (context) => {
  context.mock.method(console, "error", () => {});
  const persistence = memoryPersistence();
  let quits = 0;
  const timer = useTimerStore({
    initialTimer: null,
    persistence,
    quitApp: async () => {
      quits += 1;
    },
  });
  timer.toggle();
  now += 5_000;
  await timer.requestQuit();
  assert.equal(persistence.saved.at(-1), 5_000);
  assert.equal(quits, 1);
  timer.toggle(); // stops the display interval so the test can end

  const failing = useTimerStore({
    initialTimer: null,
    persistence: { saveTimer: () => Promise.reject(new Error("disk full")) },
    quitApp: async () => {
      quits += 1;
    },
  });
  await failing.requestQuit();
  assert.equal(quits, 2);
});
