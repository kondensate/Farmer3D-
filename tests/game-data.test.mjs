import test from "node:test";
import assert from "node:assert/strict";
import { CROPS, ROBOT_TYPES, MISSIONS, BUILDINGS, TECHNOLOGIES } from "../src/data.js";
import { BIOMES, BIOME_ORDER } from "../src/world.js";

test("catalog includes 23 distinct growable crops, with 11 regional varieties", () => {
  assert.equal(Object.keys(CROPS).length, 23);
  for (const [key, crop] of Object.entries(CROPS)) {
    assert.ok(crop.name && crop.icon && crop.shape, key);
    assert.ok(crop.growTime > 0 && crop.price > 0 && crop.seedCost > 0, key);
  }
});

test("fleet catalog defines the four robot roles", () => {
  assert.deepEqual(Object.keys(ROBOT_TYPES), ["farmbot","waterbot","harvestbot","dronebot"]);
  for (const [key, robot] of Object.entries(ROBOT_TYPES)) {
    assert.ok(robot.energy > 0 && robot.speed > 0, key);
  }
});

test("49 missions have unique IDs and valid progress targets", () => {
  assert.equal(MISSIONS.length, 49);
  assert.equal(new Set(MISSIONS.map(m => m.id)).size, 49);
  for (const m of MISSIONS) {
    assert.ok(m.target > 0 && m.reward > 0, m.id);
  }
});

test("placeable buildings have costs, dimensions and actual effects", () => {
  assert.ok(Object.keys(BUILDINGS).length >= 5);
  for (const [id, building] of Object.entries(BUILDINGS)) {
    assert.ok(building.name && building.icon && building.description, id);
    assert.ok(building.cost > 0 && building.width > 0 && building.depth > 0, id);
    assert.ok(["growth","water","harvest","charge","service","generation","storage","logistics"].includes(building.effect), id);
  }
});

test("research tree has unique technology IDs and valid dependencies", () => {
  assert.ok(TECHNOLOGIES.length >= 5);
  const ids = new Set(TECHNOLOGIES.map(t => t.id));
  assert.equal(ids.size, TECHNOLOGIES.length);
  for (const tech of TECHNOLOGIES) {
    assert.ok(tech.costXP > 0 && tech.costCoins > 0, tech.id);
    assert.ok(tech.requires.every(dep => ids.has(dep)), tech.id);
    assert.ok(tech.unlocks.length > 0, tech.id);
  }
});

test("Stage B exposes power generators, buffers, consumers and conveyor graph nodes", () => {
  for (const id of ["solar_generator","wind_generator","battery","power_pole","charger","robot_station"]) {
    assert.equal(BUILDINGS[id].powerNode, true, id);
  }
  assert.ok(BUILDINGS.solar_generator.powerOutput > 0);
  assert.ok(BUILDINGS.wind_generator.powerOutput > 0);
  assert.ok(BUILDINGS.battery.batteryCapacity > 0);
  for (const id of ["conveyor","conveyor_splitter","conveyor_filter","conveyor_buffer","conveyor_storage"]) {
    assert.equal(BUILDINGS[id].logisticsNode, true, id);
  }
});


test("every crop listed by a biome exists and regional crops are biome-bound", () => {
  for (const biomeId of BIOME_ORDER) {
    for (const cropId of BIOMES[biomeId].crops) assert.ok(CROPS[cropId], `${biomeId}: missing ${cropId}`);
  }
  for (const id of ["banana","pineapple","coconut","cocoa","coffee","mango"]) assert.deepEqual(CROPS[id].biomes,["tropical"]);
  assert.deepEqual(CROPS.cactus_fruit.biomes,["desert"]);
  assert.deepEqual(CROPS.volcanic_herb.biomes,["volcanic"]);
  assert.ok(CROPS.mushroom.biomes.includes("forest"));
  assert.ok(CROPS.rice.biomes.includes("swamp"));
});
