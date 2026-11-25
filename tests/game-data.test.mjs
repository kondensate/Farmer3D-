import test from "node:test";
import assert from "node:assert/strict";
import { CROPS, ROBOT_TYPES, MISSIONS } from "../src/data.js";

test("catalog includes ten distinct growable crops", () => {
  assert.equal(Object.keys(CROPS).length, 10);
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

test("30 missions have unique IDs and valid progress targets", () => {
  assert.equal(MISSIONS.length, 30);
  assert.equal(new Set(MISSIONS.map(m => m.id)).size, 30);
  for (const m of MISSIONS) {
    assert.ok(m.target > 0 && m.reward > 0, m.id);
  }
});
