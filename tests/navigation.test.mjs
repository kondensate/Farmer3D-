import test from "node:test";
import assert from "node:assert/strict";
import { findPath, worldToCell, cellToWorld, buildBlockedCells, cellKey } from "../src/navigation.js";

test("A* finds a shortest four-way route on an empty grid", () => {
  const path = findPath({x:0,z:0},{x:3,z:2});
  assert.ok(path);
  assert.equal(path.length - 1, 5);
  assert.deepEqual(path[0], {x:0,z:0});
  assert.deepEqual(path.at(-1), {x:3,z:2});
});

test("A* routes around blocked cells", () => {
  const blocked = new Set([cellKey({x:1,z:0}),cellKey({x:1,z:1}),cellKey({x:1,z:-1})]);
  const path = findPath({x:0,z:0},{x:2,z:0},blocked);
  assert.ok(path);
  assert.ok(path.every(cell => !blocked.has(cellKey(cell))));
  assert.ok(path.length > 3);
});

test("A* reports an unreachable destination", () => {
  const blocked = new Set();
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)if(Math.abs(x)===1||Math.abs(z)===1)blocked.add(cellKey({x,z}));
  assert.equal(findPath({x:0,z:0},{x:2,z:0},blocked), null);
});

test("world/grid conversion and building occupancy are stable", () => {
  const cell = worldToCell({x:2.3,z:-1.15});
  assert.deepEqual(cell,{x:2,z:-1});
  assert.deepEqual(cellToWorld(cell),{x:2.3,z:-1.15});
  const blocked = buildBlockedCells({buildings:[{x:0,z:0,width:2.8,depth:2.8}]});
  assert.ok(blocked.has("0,0"));
});


test("terrain-aware A* rejects a cliff that exceeds the robot step limit", () => {
  const cliff = { heightAt: (x) => x >= 1 ? 2.5 : 0, maxStep: 0.8, slopeCost: 2 };
  assert.equal(findPath({x:0,z:0},{x:2,z:0},new Set(),15,cliff), null);
});

test("A* prefers a safe detour around costly biome hazard cells", () => {
  const terrain = {
    traversalCost: (x,z) => x === 2 && z === 0 ? 20 : 0
  };
  const path = findPath({x:0,z:0},{x:4,z:0},new Set(),15,terrain);
  assert.ok(path);
  assert.ok(path.some(cell => cell.z !== 0), "route should avoid the hazardous straight corridor");
  assert.ok(path.every(cell => !(cell.x === 2 && cell.z === 0)));
});

test("terrain-aware A* can climb a gradual slope and returns connected cells", () => {
  const slope = { heightAt: (x) => Math.max(0,x) * .35, maxStep: .4, slopeCost: 1.5 };
  const path = findPath({x:0,z:0},{x:4,z:0},new Set(),15,slope);
  assert.ok(path);
  assert.deepEqual(path.at(-1),{x:4,z:0});
  for(let i=1;i<path.length;i++) {
    const rise = Math.abs(slope.heightAt(path[i].x)-slope.heightAt(path[i-1].x));
    assert.ok(rise <= slope.maxStep);
  }
});
