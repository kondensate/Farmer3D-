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
