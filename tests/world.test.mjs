import test from "node:test";
import assert from "node:assert/strict";
import {
  BIOMES, SEASONS, LAND_PARCELS, SEASON_LENGTH_SECONDS, advanceSeason,
  getSeasonWeather, getEnvironmentEffects, waterCostForPlot,
  landParcelPlotPositions, purchaseLand
} from "../src/world.js";

test("season clock advances in order and carries elapsed time", () => {
  const next = advanceSeason("spring", SEASON_LENGTH_SECONDS - 2, 5);
  assert.equal(next.season, "summer");
  assert.equal(next.changed, true);
  assert.equal(next.seasonClock, 3);
  assert.equal(advanceSeason("winter", SEASON_LENGTH_SECONDS, 0).season, "spring");
});

test("each season has a deterministic weather pattern including winter snow", () => {
  for (const season of SEASONS) {
    assert.equal(typeof getSeasonWeather(season.id, 0), "string");
    assert.equal(getSeasonWeather(season.id, 1), getSeasonWeather(season.id, 5));
  }
  assert.ok(["snow", "sunny"].includes(getSeasonWeather("winter", 0)));
});

test("biomes and seasons change crop growth and water demand", () => {
  const meadowSpring = getEnvironmentEffects("meadow", "spring", "sunny");
  const desertSummer = getEnvironmentEffects("desert", "summer", "sunny");
  const snowWinter = getEnvironmentEffects("snow", "winter", "snow");
  assert.ok(desertSummer.water > meadowSpring.water);
  assert.ok(snowWinter.growth < meadowSpring.growth);
  assert.ok(waterCostForPlot("desert", "summer") >= 2);
  assert.equal(waterCostForPlot("snow", "winter"), 1);
});

test("each purchasable biome creates nine unique plot coordinates", () => {
  for (const id of Object.keys(LAND_PARCELS)) {
    const positions = landParcelPlotPositions(id);
    assert.equal(positions.length, 9);
    assert.equal(new Set(positions.map(p => `${p.x},${p.z}`)).size, 9);
    assert.ok(positions.every(p => p.biome === id));
  }
  assert.equal(Object.keys(BIOMES).length, 5);
});

test("land purchases validate ownership, currency and sandbox mode", () => {
  const owned = new Set(["meadow"]);
  assert.equal(purchaseLand("desert", owned, 50).reason, "insufficient-coins");
  const purchase = purchaseLand("desert", owned, 150);
  assert.equal(purchase.ok, true);
  assert.equal(purchase.coins, 30);
  assert.equal(purchaseLand("desert", new Set(["desert"]), 999).reason, "already-owned");
  assert.equal(purchaseLand("snow", owned, 0, "sandbox").coins, 0);
  assert.equal(purchaseLand("unknown", owned, 999).reason, "unknown-land");
});
