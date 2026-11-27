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

test("restart action starts a clean new game and ignores every previous save", () => {
  assert.match(html, /id="resetGame"/);
  assert.match(html, /id="resetConfirm"/);
  assert.match(html, /id="confirmReset"/);
  assert.match(main, /key\.toLowerCase\(\)\.startsWith\('farmerbot'\)/);
  assert.match(main, /query\.get\('newgame'\)==='1'/);
  assert.match(main, /const raw=forceNewGame\?null:/);
  assert.match(main, /agent\.stopRequested=true/);
  assert.match(main, /agent\.autoTaskBusy/);
  assert.match(main, /restartUrl\.searchParams\.set\('newgame','1'\)/);
  assert.match(main, /location\.replace\(restartUrl\.toString\(\)\)/);
  assert.match(html, /НАЧАТЬ НОВУЮ ИГРУ/);
  assert.match(html, /снова начнёшь с выбора стартового мира/);
});


test("the current starter biome can be selected to enter a fresh farm", () => {
  assert.match(main, /id===activeBiome\?'НАЧАТЬ ФЕРМУ'/);
  assert.doesNotMatch(main, /owned&&id===activeBiome\?'disabled'/);
  assert.match(main, /if\(id===activeBiome\)\{\$\('#biomeSelectScreen'\)\.classList\.remove\('show'\);return;\}/);
});

test("Russian and English language toggle is available and remembered", () => {
  const i18n = readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
  assert.match(html, /id="languageToggle"/);
  assert.match(main, /import \{ initLanguageToggle \} from '\.\/i18n\.js'/);
  assert.match(main, /initLanguageToggle\(\)/);
  assert.match(i18n, /localStorage\.getItem\('farmerbot_language'\)/);
  assert.match(i18n, /language === 'ru' \? 'en' : 'ru'/);
  assert.match(i18n, /Green Plains/);
  assert.match(i18n, /START FARM/);
});
