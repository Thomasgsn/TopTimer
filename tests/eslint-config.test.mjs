import assert from "node:assert/strict";
import test from "node:test";
import { ESLint } from "eslint";

test("ESLint loads the TypeScript configuration", async () => {
  const eslint = new ESLint();
  const config = await eslint.calculateConfigForFile("src/App.vue");

  assert.ok(config, "eslint.config.ts should load for Vue source files");
});
