import test from "node:test";
import assert from "node:assert/strict";
import { updatePowerGrid, transferInventory, buildFarmTaskQueue, selectAgentForTask, stepConveyorNetwork } from "../src/automation.js";
import { updateWaterNetwork } from "../src/water-network.js";

test("water network only supplies pumps connected to a well and a frozen network fails closed", () => {
  const buildings = [
    { id: 1, type: "water_well", waterNode: true, waterRole: "source", waterOutput: 2 },
    { id: 2, type: "tank", waterNode: true, waterRole: "storage" },
    { id: 3, type: "water_pump", waterNode: true, waterRole: "consumer", waterDemand: 1 }
  ];
  const links = [{ from: 1, to: 2 }, { from: 2, to: 3 }];
  const state = updateWaterNetwork(buildings, links, 1);
  assert.equal(state.supplied.get("3"), true);
  assert.equal(state.production, 2);
  assert.ok(state.pressure.get("3") > 0);
  assert.equal(updateWaterNetwork(buildings, links, 1, { frozen: true }).supplied.get("3"), false);
  assert.equal(updateWaterNetwork(buildings, [], 1).supplied.get("3"), false);
});

test("water production is limited to working pipe components and desert output is lower", () => {
  const buildings = [
    { id: 1, type: "water_well", waterNode: true, waterRole: "source", waterOutput: 2 },
    { id: 2, type: "tank", waterNode: true, waterRole: "storage" },
    { id: 3, type: "water_pump", waterNode: true, waterRole: "consumer", waterDemand: 1 },
    { id: 4, type: "water_well", waterNode: true, waterRole: "source", waterOutput: 10 }
  ];
  const links = [{ from: 1, to: 2 }, { from: 2, to: 3 }];
  assert.equal(updateWaterNetwork(buildings, links, 1).production, 2);
  assert.equal(updateWaterNetwork(buildings, links, 1, { biome: "desert" }).production, 1.4);
});

test("powered pumps stop consuming water when their electrical network is down", () => {
  const buildings = [
    { id: 1, waterNode: true, waterRole: "source", waterOutput: 2 },
    { id: 2, waterNode: true, waterRole: "consumer", waterDemand: 1 }
  ];
  const links = [{ from: 1, to: 2 }];
  const state = updateWaterNetwork(buildings, links, 1, { powered: new Map([["2", false]]) });
  assert.equal(state.supplied.get("2"), false);
  assert.equal(state.outages, 1);
});

test("power grid routes generation through cables and fails consumers closed during a shortage", () => {
  const buildings = [
    { id: 1, type: "solar_generator", powerNode: true, powerOutput: 5, powerRole: "generator" },
    { id: 2, type: "charger", powerNode: true, powerDemand: 4, powerRole: "consumer" },
    { id: 3, type: "robot_station", powerNode: true, powerDemand: 6, powerRole: "consumer" }
  ];
  const linked = updatePowerGrid(buildings, [{ from: 1, to: 2 }, { from: 2, to: 3 }], 1);
  assert.equal(linked.powered.get("2"), true);
  assert.equal(linked.powered.get("3"), false);
  assert.equal(linked.outages, 1);
  assert.equal(updatePowerGrid(buildings, [], 1).powered.get("2"), false);
});

test("battery buffers surplus generation and supports loads after generator stops", () => {
  const buildings = [
    { id: 1, type: "solar_generator", powerNode: true, powerOutput: 10, powerRole: "generator" },
    { id: 2, type: "battery", powerNode: true, batteryCapacity: 100, batteryCharge: 0, powerRole: "battery" },
    { id: 3, type: "charger", powerNode: true, powerDemand: 4, powerRole: "consumer" }
  ];
  const links = [{ from: 1, to: 2 }, { from: 2, to: 3 }];
  updatePowerGrid(buildings, links, 1);
  assert.equal(buildings[1].batteryCharge, 6);
  buildings[0].powerOutput = 0;
  const state = updatePowerGrid(buildings, links, 1);
  assert.equal(state.powered.get("3"), true);
  assert.equal(buildings[1].batteryCharge, 2);
});

test("robot inventory transfer is atomic and respects the receiving capacity", () => {
  const from = { inventory: { carrot: 3 }, capacity: 4 };
  const to = { inventory: { potato: 3 }, capacity: 4 };
  assert.equal(transferInventory(from, to, "carrot", 2).reason, "destination-full");
  assert.deepEqual(from.inventory, { carrot: 3 });
  assert.deepEqual(to.inventory, { potato: 3 });
  assert.deepEqual(transferInventory(from, to, "carrot", 1), { ok: true, moved: 1 });
  assert.deepEqual(from.inventory, { carrot: 2 });
  assert.deepEqual(to.inventory, { potato: 3, carrot: 1 });
});

test("dispatcher queue derives plant, water and harvest tasks from farm state", () => {
  const tasks = buildFarmTaskQueue([
    { state: "ready", cropType: "tomato" },
    { state: "seed", watered: false },
    { state: "empty" }
  ], "carrot", { carrot: 4 });
  assert.deepEqual(tasks.map(t => t.type), ["harvest", "water", "plant"]);
  assert.equal(tasks[0].crop, "tomato");
});

test("dispatcher selects specialist when distance and energy allow", () => {
  const task = { type: "water", priority: 70 };
  const agents = [
    { id: "farmbot", type: "farmbot", energy: 80, inventory: {}, position: { x: 0, z: 0 } },
    { id: "waterbot", type: "waterbot", energy: 80, water: 4, inventory: {}, position: { x: 5, z: 0 } }
  ];
  assert.equal(selectAgentForTask(agents, task, { x: 5, z: 0 }).id, "waterbot");
});

test("conveyor graph routes items through a filter and into storage", () => {
  const buildings = [
    { id: 1, type: "conveyor", items: [{ crop: "carrot", count: 1 }], routeClock: 0 },
    { id: 2, type: "conveyor_filter", filterCrop: "carrot", items: [], routeClock: 0 },
    { id: 3, type: "conveyor_storage", items: [], routeClock: 0 }
  ];
  const links = [{ from: 1, to: 2 }, { from: 2, to: 3 }];
  const delivered = [];
  for (let i = 0; i < 6; i++) delivered.push(...stepConveyorNetwork(buildings, links, 1));
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].crop, "carrot");
  assert.equal(buildings[0].items.length, 0);
});

test("filter holds mismatched crops without deleting or forwarding them", () => {
  const buildings = [
    { id: 1, type: "conveyor_filter", filterCrop: "tomato", items: [{ crop: "carrot", count: 1 }], routeClock: 0 },
    { id: 2, type: "conveyor_storage", items: [], routeClock: 0 }
  ];
  for (let i = 0; i < 3; i++) stepConveyorNetwork(buildings, [{ from: 1, to: 2 }], 1);
  assert.equal(buildings[0].items.length, 1);
  assert.equal(buildings[1].items.length, 0);
});
