import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sourceRoot = "src";
const stylesRoot = path.join(sourceRoot, "assets", "styles");
const bemClass = /^[a-z][a-z0-9-]*(?:__[a-z][a-z0-9-]*)?(?:--[a-z][a-z0-9-]*)?$/;

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? filesIn(entryPath) : [entryPath];
    }),
  );

  return files.flat();
}

test("source styles stay centralized in the SCSS directory", async () => {
  const sourceFiles = await filesIn(sourceRoot);
  const misplacedStyles = sourceFiles.filter((file) => {
    const isStylesheet = /\.(?:css|scss)$/u.test(file);
    return isStylesheet && !file.startsWith(`${stylesRoot}${path.sep}`);
  });

  assert.deepEqual(misplacedStyles, []);
  assert.match(
    await readFile("src/main.ts", "utf8"),
    /import ["']\.\/assets\/styles\/main\.scss["'];/u,
  );
});

test("Vue templates use BEM classes", async () => {
  const vueFiles = (await filesIn(sourceRoot)).filter((file) => file.endsWith(".vue"));

  for (const file of vueFiles) {
    const source = await readFile(file, "utf8");

    for (const match of source.matchAll(/(?<!:)class="([^"]+)"/gu)) {
      for (const className of match[1].split(/\s+/u)) {
        assert.match(className, bemClass, `${file} contains the non-BEM class "${className}"`);
      }
    }
  }
});
