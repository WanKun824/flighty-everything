import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const APP = fileURLToPath(new URL("../app/", import.meta.url));
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const cssFiles = (await readdir(APP)).filter(
  (name) => name.endsWith(".css") && name !== "ios-tokens.css",
);

test("font-size never goes below the iOS 11pt minimum outside intentional zero", async () => {
  for (const name of cssFiles) {
    const css = await read(`../app/${name}`);
    const violations = [];
    for (const match of css.matchAll(/font-size:\s*([0-9]+(?:\.[0-9]+)?)px/gi)) {
      const size = Number(match[1]);
      if (size > 0 && size < 11) violations.push(`${size}px`);
    }
    assert.deepEqual(violations, [], `${name} has sub-11px font sizes: ${violations.join(", ")}`);
  }
});

test("inline TSX font sizes respect the same 11px floor", async () => {
  const tsxFiles = (await readdir(APP)).filter((name) => name.endsWith(".tsx"));
  for (const name of tsxFiles) {
    const source = await read(`../app/${name}`);
    for (const match of source.matchAll(/fontSize:\s*([0-9]+(?:\.[0-9]+)?)\b/g)) {
      const size = Number(match[1]);
      assert.ok(size === 0 || size >= 11, `${name} uses inline fontSize ${size}px (< 11px)`);
    }
  }
});

test("no bare hex colors outside the token file", async () => {
  for (const name of cssFiles) {
    const css = await read(`../app/${name}`);
    const hexes = css.match(/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g) ?? [];
    assert.deepEqual(hexes, [], `${name} still has bare hex colors: ${hexes.slice(0, 5).join(", ")}`);
  }
});

test("ios-tokens.css is the single source of text styles and semantic colors", async () => {
  const tokens = await read("../app/ios-tokens.css");
  for (const token of [
    "--ios-font-large-title", "--ios-font-title1", "--ios-font-title2", "--ios-font-title3",
    "--ios-font-headline", "--ios-font-body", "--ios-font-callout", "--ios-font-subheadline",
    "--ios-font-footnote", "--ios-font-caption1", "--ios-font-caption2",
    "--ios-blue", "--ios-red", "--ios-green", "--ios-orange", "--ios-yellow",
    "--ios-purple", "--ios-pink", "--ios-teal", "--ios-gray",
    "--ios-label", "--ios-secondary-label", "--ios-tertiary-label",
    "--ios-system-background", "--ios-grouped-background", "--ios-separator",
    "--ios-material-thin", "--ios-material-regular", "--ios-material-thick",
    "--ios-radius-button", "--ios-radius-card", "--ios-radius-panel",
    "--ios-spring",
  ]) {
    assert.ok(tokens.includes(token), `ios-tokens.css is missing ${token}`);
  }
  // 浅色与深色两套语义色都必须存在
  assert.match(tokens, /:root\[data-theme="light"\]/);
  const fontSizes = [...tokens.matchAll(/--ios-font-[\w-]+:\s*\d+\s+([\d.]+)(rem|px)\//g)].map(match => Number(match[1]) * (match[2] === "rem" ? 17 : 1));
  assert.equal(fontSizes.length, 11, "all eleven text styles must be checked");
  assert.ok(Math.min(...fontSizes) >= 11, "text styles must not go below 11px");
});

test("legacy palette variables actually resolve to colors", async () => {
  const tokens = await read("../app/ios-tokens.css");
  const defined = new Set([...tokens.matchAll(/--c-([0-9a-f]{6,8}):/g)].map((match) => match[1]));
  assert.ok(defined.size > 0, "palette block should not be empty");
  for (const name of cssFiles) {
    const css = await read(`../app/${name}`);
    for (const match of css.matchAll(/var\(--c-([0-9a-f]{6,8})\)/g)) {
      assert.ok(defined.has(match[1]), `${name} references undefined palette var --c-${match[1]}`);
    }
  }
});
