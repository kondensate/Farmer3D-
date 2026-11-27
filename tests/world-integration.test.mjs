import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("saved world parcels are recreated before saved plots are restored", () => {
  assert.match(main, /if\(d\.world\)[\s\S]*?createBiomeLand\(id\)/);
  assert.match(main, /if\(Array\.isArray\(d\.plots\)\)d\.plots\.forEach/);
  assert.match(main, /plots\[i\]\.biome=BIOMES\[v\.biome\]\?v\.biome/);
});

test("land market is inside the scrollable construction panel", () => {
  assert.match(html, /id="buildPanel"[\s\S]*?id="landMarket"/);
  assert.match(main, /data-buy-land/);
  assert.match(main, /purchaseLand\(biomeId,ownedBiomes,coins,gameMode\)/);
});

test("winter snow can wet fields and reduces growth through climate effects", () => {
  assert.match(main, /weather==='rain'\|\|weather==='snow'/);
  assert.match(main, /getEnvironmentEffects\(p\.biome\|\|'meadow',season,weather\)\.growth/);
});
