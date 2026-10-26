import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const config = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));

test("TopTimer is packaged as its own macOS app", () => {
  assert.equal(config.productName, "TopTimer");
  assert.equal(config.identifier, "com.ths.toptimer");
  assert.deepEqual(config.bundle.targets, ["app", "dmg"]);
  assert.ok(config.bundle.icon.includes("icons/icon.icns"));
  assert.ok(!config.bundle.icon.some((icon) => icon.endsWith(".ico")), "no Windows icon");
  assert.equal(config.bundle.windows, undefined);
});

test("every bundled icon exists", async () => {
  for (const icon of [...config.bundle.icon, "icons/tray/44x44.png"]) {
    await access(`src-tauri/${icon}`);
  }
});

test("the widget floats transparent above other windows on every Space", () => {
  const main = config.app.windows.find((window) => window.label === "main");
  assert.equal(main.decorations, false);
  assert.equal(main.transparent, true);
  assert.equal(main.backgroundColor, "#00000000");
  assert.equal(main.alwaysOnTop, true);
  assert.equal(main.visibleOnAllWorkspaces, true);
  assert.equal(config.app.macOSPrivateApi, true);
});

test("launch at login can be read and changed by the front end", async () => {
  const capability = JSON.parse(await readFile("src-tauri/capabilities/default.json", "utf8"));
  for (const permission of [
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled",
  ]) {
    assert.ok(capability.permissions.includes(permission), permission);
  }
});
