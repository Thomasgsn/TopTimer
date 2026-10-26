import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

class MemoryStorage {
  #values = new Map();
  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }
  setItem(key, value) {
    this.#values.set(key, String(value));
  }
  removeItem(key) {
    this.#values.delete(key);
  }
  keys() {
    return this.#values.keys();
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

afterEach(() => {
  delete globalThis.localStorage;
});

const settings = { locale: "fr", alwaysOnTop: false, autostartInitialized: true, draggable: false };

test("timer, settings and position survive a reload", async () => {
  const { BrowserPersistence } = await import("../src/persistence.ts");
  const persistence = new BrowserPersistence();
  await persistence.load();
  await persistence.saveTimer({ elapsedMs: 90_500 });
  await persistence.saveSettings(settings);
  await persistence.saveWindowPosition({ x: -40, y: 120 });

  const reloaded = await new BrowserPersistence().load();
  assert.deepEqual(reloaded, {
    schemaVersion: 1,
    timer: { elapsedMs: 90_500 },
    settings,
    windowPosition: { x: -40, y: 120 },
  });
});

test("an empty storage starts without data", async () => {
  const { BrowserPersistence } = await import("../src/persistence.ts");
  assert.deepEqual(await new BrowserPersistence().load(), {
    schemaVersion: 1,
    timer: null,
    settings: null,
    windowPosition: null,
  });
});

test("data from a newer version is reported and never overwritten", async () => {
  const { BrowserPersistence } = await import("../src/persistence.ts");
  const newer = JSON.stringify({ schemaVersion: 2, timer: { elapsedMs: 1 } });
  localStorage.setItem("toptimer.data.v1", newer);

  await assert.rejects(new BrowserPersistence().load(), /schema 2/);
  assert.equal(localStorage.getItem("toptimer.data.v1"), newer);
});

test("unreadable data is kept aside before starting over", async () => {
  const { BrowserPersistence } = await import("../src/persistence.ts");
  localStorage.setItem("toptimer.data.v1", "not json");

  const loaded = await new BrowserPersistence().load();
  assert.equal(loaded.timer, null);
  const keys = [...localStorage.keys()];
  assert.ok(keys.some((key) => key.startsWith("toptimer.data.v1.corrupt-")));
});

test("settings saved before the position lock existed keep the widget movable", async () => {
  const { normalizeAppData } = await import("../src/persistence.ts");
  const data = normalizeAppData({
    schemaVersion: 1,
    timer: { elapsedMs: -5 },
    settings: { locale: "de", alwaysOnTop: true, autostartInitialized: false },
    windowPosition: { x: 1.5, y: 2 },
  });
  assert.equal(data.settings.draggable, true);
  assert.equal(data.timer, null);
  assert.equal(data.windowPosition, null);
});
