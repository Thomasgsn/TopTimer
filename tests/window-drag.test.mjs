import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the unlocked widget starts the native Tauri window drag", async () => {
  const source = await readFile("src/components/panels/TimerPanel.vue", "utf8");
  const dragRegion =
    /<div(?=[^>]*v-if="draggable")(?=[^>]*__drag)(?=[^>]*\bdata-tauri-drag-region\b)[^>]*>/;

  assert.match(source, dragRegion, "the drag region must exist only while the widget is movable");

  const capability = JSON.parse(await readFile("src-tauri/capabilities/default.json", "utf8"));
  assert.ok(
    capability.permissions.includes("core:window:allow-start-dragging"),
    "the main window capability must allow Tauri's start_dragging command",
  );
});
