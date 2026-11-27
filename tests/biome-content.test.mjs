import test from "node:test";
import assert from "node:assert/strict";
import { BIOME_BUILDINGS, BIOME_MISSIONS, isBiomeContentAvailable } from "../src/biome-content.js";

const biomes = ["meadow", "desert", "mountain", "snow", "tropical", "forest", "volcanic", "swamp"];

test("every playable biome has one unique regional building and mission", () => {
  assert.deepEqual(Object.keys(BIOME_BUILDINGS).length, 8);
  assert.deepEqual(BIOME_MISSIONS.length, 8);
  for (const biome of biomes) {
    const buildings = Object.values(BIOME_BUILDINGS).filter(item => item.biome === biome);
    const missions = BIOME_MISSIONS.filter(item => item.biome === biome);
    assert.equal(buildings.length, 1, `building for ${biome}`);
    assert.equal(missions.length, 1, `mission for ${biome}`);
    assert.equal(missions[0].buildingType, Object.keys(BIOME_BUILDINGS).find(id => BIOME_BUILDINGS[id] === buildings[0]));
  }
});

test("regional content is visible only in its matching biome", () => {
  const mission = BIOME_MISSIONS.find(item => item.biome === "desert");
  assert.equal(isBiomeContentAvailable(mission, "desert"), true);
  assert.equal(isBiomeContentAvailable(mission, "snow"), false);
  assert.equal(isBiomeContentAvailable({ title: "global" }, "snow"), true);
});

test("regional buildings expose a real simulation effect", () => {
  for (const building of Object.values(BIOME_BUILDINGS)) {
    assert.ok(building.waterProduction || building.waterCapacityBonus || building.growthMultiplier || building.powerOutput,
      `${building.name} should affect gameplay`);
  }
});
