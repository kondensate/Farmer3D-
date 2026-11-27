import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ACTIVE_SAVE_SLOT_KEY, DEFAULT_SAVE_SLOT_ID, SAVE_SLOT_INDEX_KEY,
  createSaveSlot, readSaveSlot, readSaveSlots, resolveSaveSlot,
  saveSlotStorageKey, writeSaveSlot
} from "../src/save-system.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("legacy save migrates into the first slot and remains intact", () => {
  const storage = new MemoryStorage();
  const original = JSON.stringify({ version: 8, coins: 77, world: { activeBiome: "desert" } });
  storage.setItem("farmerbot3d_save_v8", original);
  const selected = resolveSaveSlot(storage, { legacyKeys: ["farmerbot3d_save_v8"] });
  assert.equal(selected, DEFAULT_SAVE_SLOT_ID);
  assert.deepEqual(readSaveSlot(storage, selected).data, JSON.parse(original));
  assert.equal(storage.getItem("farmerbot3d_save_v8"), original);
  assert.equal(storage.getItem(ACTIVE_SAVE_SLOT_KEY), selected);
});

test("new slots keep world data and metadata isolated", () => {
  const storage = new MemoryStorage();
  const first = resolveSaveSlot(storage);
  writeSaveSlot(storage, first, { gameMode: "campaign", world: { activeBiome: "meadow", seed: "a" } }, 10);
  const second = createSaveSlot(storage, "Песчаная ферма", 20);
  writeSaveSlot(storage, second.id, { gameMode: "sandbox", world: { activeBiome: "desert", seed: "b" } }, 30);
  assert.equal(readSaveSlot(storage, first).data.world.seed, "a");
  assert.equal(readSaveSlot(storage, second.id).data.world.seed, "b");
  assert.notEqual(saveSlotStorageKey(first), saveSlotStorageKey(second.id));
  assert.equal(readSaveSlots(storage).find(slot => slot.id === second.id).biome, "desert");
});

test("invalid or corrupt slot data is reported without being overwritten", () => {
  const storage = new MemoryStorage();
  const id = resolveSaveSlot(storage);
  const key = saveSlotStorageKey(id);
  storage.setItem(key, "{bad json");
  assert.equal(readSaveSlot(storage, id).status, "corrupt");
  assert.equal(storage.getItem(key), "{bad json");
  assert.throws(() => saveSlotStorageKey("../other"), TypeError);
  storage.setItem(key, JSON.stringify({ version: 99, coins: 4 }));
  assert.equal(readSaveSlot(storage, id).status, "corrupt");
});

test("slot catalog is bounded at twelve worlds", () => {
  const storage = new MemoryStorage();
  resolveSaveSlot(storage);
  for (let i = 2; i <= 12; i++) createSaveSlot(storage, `Farm ${i}`, i);
  assert.equal(readSaveSlots(storage).length, 12);
  assert.throws(() => createSaveSlot(storage, "Overflow", 100), RangeError);
  assert.equal(JSON.parse(storage.getItem(SAVE_SLOT_INDEX_KEY)).length, 12);
});

test("biome selector exposes real slot switching and new-farm actions", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(html, /id="saveSlotSelect"/);
  assert.match(html, /id="createSaveSlot"/);
  assert.match(main, /switchActiveSaveSlot\(event\.target\.value\)/);
  assert.match(main, /createSaveSlot\(localStorage/);
  assert.match(main, /query\.get\('slot'\)/);
});
