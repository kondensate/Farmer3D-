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
  assert.match(main, /water>=waterCostForPlot\(targetPlot\.biome\|\|'meadow',season\)/);
});

test("building placement is limited to meadow and purchased biome parcels", () => {
  assert.match(main, /function isOwnedLandAt\(x,z\)/);
  assert.match(main, /ownedBiomes\.has\(parcel\.biome\)/);
  assert.match(main, /corners\.every\(\(\[sx,sz\]\)=>isOwnedLandAt/);
});

test("version 7 saves retain the selected biome, seed and unlocked biome list", () => {
  assert.match(main, /version:7,[\\s\\S]*?activeBiome,seed:worldSeed/);
  assert.match(main, /SAVE_KEY='farmerbot3d_save_v7'/);
  assert.match(main, /unlockedWorldBiomes:\\[\\.\\.\\.unlockedWorldBiomes\\]/);
  assert.match(main, /Number\\(d\\.version\\|\\|0\\)<7/);
});
