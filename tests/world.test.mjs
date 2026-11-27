import test from "node:test";
import assert from "node:assert/strict";
import {
  BIOMES, BIOME_ORDER, RESOURCE_CATALOG, SEASONS, LAND_PARCELS, SEASON_LENGTH_SECONDS,
  advanceSeason, getSeasonWeather, getBiomeWeather, getEnvironmentEffects,
  waterCostForPlot, landParcelPlotPositions, purchaseLand,
  getBiomeUnlockState, unlockBiome, generateWorldMap, createSeededRandom
} from "../src/world.js";

test("all eight biome definitions expose playable design data", () => {
  assert.deepEqual(BIOME_ORDER, ["meadow", "desert", "mountain", "snow", "tropical", "forest", "volcanic", "swamp"]);
  assert.equal(Object.keys(BIOMES).length, 8);
  for (const id of BIOME_ORDER) {
    const b = BIOMES[id];
    assert.equal(b.id, id);
    assert.ok(b.description && b.difficulty && b.temperature && b.humidity);
    assert.ok(b.resources.length > 0 && b.crops.length > 0 && b.obstacles.length > 0);
    assert.ok(b.weather.length > 0 && b.vegetation.length > 0 && b.buildTags.length > 0);
  }
});

test("season clock advances in order and carries elapsed time", () => {
  const next = advanceSeason("spring", SEASON_LENGTH_SECONDS - 2, 5);
  assert.equal(next.season, "summer");
  assert.equal(next.changed, true);
  assert.equal(next.seasonClock, 3);
  assert.equal(advanceSeason("winter", SEASON_LENGTH_SECONDS, 0).season, "spring");
});

test("seasonal and biome weather are deterministic and supported", () => {
  for (const season of SEASONS) {
    assert.equal(typeof getSeasonWeather(season.id, 0), "string");
    assert.equal(getSeasonWeather(season.id, 1), getSeasonWeather(season.id, 6));
    for (const id of BIOME_ORDER) {
      const weather = getBiomeWeather(id, season.id, 3, "map-seed");
      assert.ok(BIOMES[id].weather.includes(weather));
    }
  }
});

test("biomes and seasons change growth, water and climate effects", () => {
  const meadowSpring = getEnvironmentEffects("meadow", "spring", "sunny");
  const desertSummer = getEnvironmentEffects("desert", "summer", "heatwave");
  const snowWinter = getEnvironmentEffects("snow", "winter", "blizzard");
  const tropicalSummer = getEnvironmentEffects("tropical", "summer", "heavy-rain");
  assert.ok(desertSummer.water > meadowSpring.water);
  assert.ok(snowWinter.growth < meadowSpring.growth);
  assert.ok(tropicalSummer.growth > 0);
  assert.ok(snowWinter.movement < 1);
  assert.ok(getEnvironmentEffects("volcanic", "summer").temperature > 50);
  assert.ok(waterCostForPlot("desert", "summer") >= 2);
  assert.ok(waterCostForPlot("desert", "summer", "heatwave") >= waterCostForPlot("desert", "summer", "rain"));
});

test("legacy purchasable parcels remain compatible with existing saves", () => {
  for (const id of Object.keys(LAND_PARCELS)) {
    const positions = landParcelPlotPositions(id);
    assert.equal(positions.length, 9);
    assert.equal(new Set(positions.map(p => `${p.x},${p.z}`)).size, 9);
    assert.ok(positions.every(p => p.biome === id));
  }
  const owned = new Set(["meadow"]);
  assert.equal(purchaseLand("desert", owned, 50).reason, "insufficient-coins");
  const purchase = purchaseLand("desert", owned, 150);
  assert.equal(purchase.ok, true);
  assert.equal(purchase.coins, 30);
  assert.equal(purchaseLand("desert", new Set(["desert"]), 999).reason, "already-owned");
  assert.equal(purchaseLand("snow", owned, 0, "sandbox").coins, 0);
  assert.equal(purchaseLand("forest", owned, 999).reason, "unknown-land");
});

test("biomes unlock in campaign progression order without bypassing requirements", () => {
  const first = getBiomeUnlockState("desert", { xp: 20, harvested: 5 });
  assert.equal(first.unlocked, false);
  assert.equal(first.missingXP, 15);
  const desert = unlockBiome("desert", { xp: 35, harvested: 3 });
  assert.equal(desert.ok, true);
  assert.ok(desert.unlocked.includes("desert"));
  assert.equal(getBiomeUnlockState("meadow", {}).unlocked, true);
  assert.equal(getBiomeUnlockState("unknown", {}).known, false);
});

test("seeded PRNG and generated map are reproducible", () => {
  const randomA = createSeededRandom("world-42");
  const randomB = createSeededRandom("world-42");
  assert.deepEqual([randomA(), randomA(), randomA()], [randomB(), randomB(), randomB()]);
  const a = generateWorldMap("world-42", "mountain");
  const b = generateWorldMap("world-42", "mountain");
  assert.deepEqual(a, b);
  assert.equal(a.seed, "world-42");
  assert.equal(a.biome, "mountain");
  assert.equal(a.plots.length, 25);
  assert.equal(a.start.x, 0);
  assert.equal(a.start.z, 7);
  assert.ok(a.resources.length >= 3);
  assert.ok(a.buildableZones.length > 0);
  assert.ok(a.safeRoute.length >= 3);
  assert.notDeepEqual(a, generateWorldMap("world-43", "mountain"));
});

test("generated map protects the starter plots and base from natural obstacles", () => {
  for (const id of BIOME_ORDER) {
    const map = generateWorldMap("safety-seed", id);
    for (const plot of map.plots) {
      assert.ok(Math.hypot(plot.x, plot.z - map.start.z) > 0 || plot.buildable);
      assert.ok(!map.obstacles.some(o => Math.hypot(o.x, o.z - map.start.z) < 8.5));
    }
    assert.ok(map.resources.every(r => Number.isFinite(r.x) && Number.isFinite(r.z) && r.amount > 0));
    for (const resource of map.resources) {
      assert.ok(!map.obstacles.some(obstacle => obstacle.x === resource.x && obstacle.z === resource.z),
        `${id}: resource ${resource.id} overlaps an obstacle`);
    }
    assert.ok(map.resources.filter(resource => resource.id.startsWith("starter-resource-")).length >= 3,
      `${id}: expected three guaranteed starter deposits`);
  }
});


test("mountain maps contain elevation while the starter farm and route stay level", () => {
  const map = generateWorldMap("altitude-seed", "mountain");
  const baseClearing = map.heightMap.filter(cell => Math.hypot(cell.x,cell.z-7) < 8.5);
  const farmClearing = map.heightMap.filter(cell => Math.hypot(cell.x,cell.z) < 8.5);
  assert.ok(baseClearing.length > 0 && farmClearing.length > 0);
  assert.ok(baseClearing.every(cell => cell.height === 0));
  assert.ok(farmClearing.every(cell => cell.height === 0));
  assert.ok(map.heightMap.some(cell => cell.height > 0));
  for (const step of map.safeRoute) {
    const cell = map.heightMap.find(point => point.x === step.x && point.z === step.z);
    assert.equal(cell?.height, 0);
    assert.ok(!map.obstacles.some(o => o.x === step.x && o.z === step.z));
  }
});


test("every generated biome resource has a collectible resource definition", () => {
  for (const id of BIOME_ORDER) {
    for (const resourceId of BIOMES[id].resources) {
      assert.ok(RESOURCE_CATALOG[resourceId], `missing resource definition: ${resourceId}`);
      assert.ok(RESOURCE_CATALOG[resourceId].name && RESOURCE_CATALOG[resourceId].icon);
    }
  }
});
