import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("legacy saved parcels are recreated before saved plots are restored", () => {
  assert.match(main, /if\(d\.world\)[\s\S]*?createBiomeLand\(id\)/);
  assert.match(main, /if\(Array\.isArray\(d\.plots\)\)d\.plots\.forEach/);
  assert.match(main, /plots\[i\]\.biome=BIOMES\[v\.biome\]\?v\.biome/);
});

test("new worlds use the dedicated eight-biome selector instead of parcel cards", () => {
  assert.match(html, /id="biomeSelectScreen"/);
  assert.match(html, /id="biomeSelectGrid"/);
  assert.doesNotMatch(html, /id="landMarket"/);
  assert.match(main, /function renderBiomeSelector\(\)/);
  assert.match(main, /getBiomeUnlockState\(id,progress,unlockedWorldBiomes\)/);
  assert.match(main, /generateWorldMap\(worldSeed,activeBiome\)/);
});

test("precipitation is applied to crops and weather is selected per biome", () => {
  assert.match(main, /\['rain','heavy-rain','thunderstorm','snow','blizzard'\]\.includes\(weather\)/);
  assert.match(main, /getEnvironmentEffects\(p\.biome\|\|'meadow',season,weather\)\.growth/);
  assert.match(main, /water>=waterCostForPlot\(targetPlot\.biome\|\|'meadow',season,weather\)/);
  assert.match(main, /getBiomeWeather\(activeBiome,season,weatherStep,worldSeed\)/);
});

test("building placement remains constrained to owned ground", () => {
  assert.match(main, /function isOwnedLandAt\(x,z\)/);
  assert.match(main, /ownedBiomes\.has\(parcel\.biome\)/);
  assert.match(main, /corners\.every\(\(\[sx,sz\]\)=>isOwnedLandAt/);
});

test("version 8 saves migrate selected biome, seed and unlocked regions into the v9 format", () => {
  assert.match(main, /version:9,[\s\S]*?activeBiome,seed:worldSeed/);
  assert.match(main, /SAVE_KEY='farmerbot3d_save_v8'/);
  assert.match(main, /unlockedWorldBiomes:\[\.\.\.unlockedWorldBiomes\]/);
  assert.match(main, /Number\(d\.version\|\|0\)<9/);
  assert.match(main, /resourceStorage:worldResourceStorage/);
});
