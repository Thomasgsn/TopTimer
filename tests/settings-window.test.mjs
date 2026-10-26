import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, test } from "node:test";
import { clearMocks, mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { fitInArea, useSettingsWindow } from "../src/stores/settingsWindow.ts";

beforeEach(() => {
  globalThis.window = {};
  globalThis.isTauri = true;
  mockWindows("main");
});

afterEach(() => {
  clearMocks();
  delete globalThis.window;
  delete globalThis.isTauri;
});

const screen = { position: { x: 0, y: 50 }, size: { width: 2880, height: 1700 } };

function mockNativeWindow({ position = { x: 180, y: 90 }, fail = () => false } = {}) {
  const original = { size: { width: 400, height: 200 }, position };
  const state = structuredClone(original);
  const calls = [];

  mockIPC((command, payload) => {
    const operation = command.replace("plugin:window|", "");
    const value = JSON.parse(JSON.stringify(payload ?? {})).value;
    calls.push(operation);
    if (fail(operation)) throw new Error("Simulated native window failure");
    switch (operation) {
      case "inner_size":
        return { ...state.size };
      case "outer_position":
        return { ...state.position };
      case "scale_factor":
        return 2;
      case "current_monitor":
        return {
          name: "Built-in",
          size: { width: 2880, height: 1800 },
          position: { x: 0, y: 0 },
          workArea: screen,
          scaleFactor: 2,
        };
      case "set_size":
        state.size = value.Physical ?? {
          width: value.Logical.width * 2,
          height: value.Logical.height * 2,
        };
        break;
      case "set_position":
        state.position = value.Physical;
        break;
      default:
        throw new Error(`Unexpected native operation: ${operation}`);
    }
  });

  return { original, state, calls };
}

test("the settings enlarge the widget, then give it back its frame", async () => {
  const { original, state } = mockNativeWindow();
  const mode = useSettingsWindow();

  await mode.expand();
  assert.equal(mode.expanded.value, true);
  assert.equal(mode.busy.value, false);
  assert.deepEqual(state.size, { width: 760, height: 920 });
  assert.deepEqual(state.position, original.position);

  await mode.collapse();
  assert.equal(mode.expanded.value, false);
  assert.deepEqual(state, original);
});

test("a widget in the bottom-right corner moves so the settings fit on screen", async () => {
  const { original, state } = mockNativeWindow({ position: { x: 2700, y: 1650 } });
  const mode = useSettingsWindow();

  await mode.expand();
  assert.deepEqual(state.position, { x: 2880 - 760, y: 50 + 1700 - 920 });

  await mode.collapse();
  assert.deepEqual(state, original);
});

test("rapid repeated clicks cannot overwrite the saved widget frame", async () => {
  const { original, state, calls } = mockNativeWindow();
  const mode = useSettingsWindow();
  await Promise.all([mode.expand(), mode.expand(), mode.expand()]);
  assert.equal(calls.filter((operation) => operation === "inner_size").length, 1);
  await mode.collapse();
  assert.deepEqual(state, original);
});

test("a failed enlargement restores the widget", async (context) => {
  context.mock.method(console, "error", () => {});
  let shouldFail = true;
  const { original, state } = mockNativeWindow({
    position: { x: 2700, y: 1650 },
    fail: (operation) => {
      if (operation !== "set_position" || !shouldFail) return false;
      shouldFail = false;
      return true;
    },
  });
  const mode = useSettingsWindow();
  await mode.expand();
  assert.equal(mode.expanded.value, false);
  assert.deepEqual(state, original);
});

test("fitting keeps a window that already fits where it is", () => {
  assert.deepEqual(fitInArea({ x: 100, y: 100 }, { width: 760, height: 920 }, screen), {
    x: 100,
    y: 100,
  });
  assert.deepEqual(fitInArea({ x: -50, y: 0 }, { width: 760, height: 920 }, screen), {
    x: 0,
    y: 50,
  });
});

test("the widget window can be resized and moved by the front end", async () => {
  const capability = JSON.parse(await readFile("src-tauri/capabilities/default.json", "utf8"));
  for (const permission of ["core:window:allow-set-size", "core:window:allow-set-position"]) {
    assert.ok(capability.permissions.includes(permission), permission);
  }
});

test("browser preview opens and closes the settings without native IPC", async () => {
  globalThis.isTauri = false;
  const mode = useSettingsWindow();
  await mode.expand();
  assert.equal(mode.expanded.value, true);
  await mode.collapse();
  assert.equal(mode.expanded.value, false);
});
