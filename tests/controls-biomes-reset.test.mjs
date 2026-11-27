import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("keyboard controls move the active robot with WASD and arrow keys", () => {
  assert.match(main, /ArrowUp:'forward',KeyW:'forward'/);
  assert.match(main, /ArrowDown:'back',KeyS:'back'/);
  assert.match(main, /ArrowLeft:'left',KeyA:'left'/);
  assert.match(main, /ArrowRight:'right',KeyD:'right'/);
  assert.match(main, /window\.addEventListener\('keydown'/);
  assert.match(main, /moveAgent\(agent,1\)/);
});

test("biome cards show prices and purchase only after XP and harvest requirements", () => {
  assert.match(main, /const prices=\{meadow:0,desert:120,mountain:160,snow:190,tropical:220,forest:180,volcanic:300,swamp:250\}/);
  assert.match(main, /if\(!state\.unlocked\)/);
  assert.match(main, /coins-=price;unlockedWorldBiomes\.add\(id\)/);
  assert.match(main, /data-start-biome/);
});

test("restart action requires confirmation and clears game progress keys", () => {
  assert.match(html, /id="resetGame"/);
  assert.match(html, /id="resetConfirm"/);
  assert.match(html, /id="confirmReset"/);
  assert.match(main, /key\.startsWith\('farmerbot3d'/);
  assert.match(main, /agent\.stopRequested=true/);
  assert.match(main, /agent\.autoTaskBusy/);
  assert.match(main, /location\.replace\(/);
});
