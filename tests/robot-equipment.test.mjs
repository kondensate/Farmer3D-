import test from "node:test";
import assert from "node:assert/strict";
import { ROBOT_MODULES, moduleEffects, hazardTraversalMultiplier, hazardEnergyMultiplier } from "../src/robot-equipment.js";

test("thermal shield reduces lava traversal and energy penalties only", () => {
  assert.ok(hazardTraversalMultiplier(["thermal_shield"], "lava") < 1);
  assert.ok(hazardEnergyMultiplier(["thermal_shield"], "steam-vent") < 1);
  assert.equal(hazardTraversalMultiplier(["thermal_shield"], "quicksand"), 1);
});

test("cold tracks and swamp chassis protect their matching biome hazards", () => {
  assert.ok(hazardTraversalMultiplier(["cold_tracks"], "ice") < 1);
  assert.ok(hazardEnergyMultiplier(["swamp_chassis"], "deep-water") < 1);
  assert.equal(hazardEnergyMultiplier(["swamp_chassis"], "lava"), 1);
});

test("mountain climber increases the allowed terrain step", () => {
  assert.equal(moduleEffects(["mountain_climber"]).stepBonus, 0.35);
  assert.equal(moduleEffects([]).stepBonus, 0);
});

test("unknown and duplicate modules are ignored safely", () => {
  const effects = moduleEffects(["thermal_shield", "thermal_shield", "not-a-module"]);
  assert.equal(effects.protectedHazards.size, ROBOT_MODULES.thermal_shield.hazards.length);
  assert.equal(effects.stepBonus, 0);
});
