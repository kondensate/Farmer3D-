import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const visuals = readFileSync(new URL("../src/biome-visuals.js", import.meta.url), "utf8");
const world = readFileSync(new URL("../src/world.js", import.meta.url), "utf8");

const palettes = [
  ["grassland", "meadow"],
  ["desert", "desert"],
  ["mountains", "mountain"],
  ["snow", "snow"],
  ["tropical", "tropical"],
  ["forest", "forest"],
  ["volcanic", "volcanic"],
  ["swamp", "swamp"]
];

test("all eight biome palette specifications are present and have usable material data", () => {
  for (const [folder, id] of palettes) {
    const path = new URL(`../assets/biomes/${folder}/palette.json`, import.meta.url);
    assert.equal(existsSync(path), true, `missing ${folder} palette`);
    const palette = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(palette.id, id);
    assert.equal(palette.rendering, "procedural-low-poly");
    assert.ok(palette.texture.ground.startsWith("#"));
    assert.ok(palette.texture.soil.startsWith("#"));
    assert.equal(palette.texture.wrapping, "RepeatWrapping");
    assert.ok(palette.materials.water.startsWith("#"));
  }
});

test("procedural ground textures are tiled and use reusable standard materials", () => {
  assert.match(visuals, /new THREE\.CanvasTexture\(canvas\)/);
  assert.match(visuals, /texture\.wrapS=THREE\.RepeatWrapping/);
  assert.match(visuals, /texture\.wrapT=THREE\.RepeatWrapping/);
  assert.match(visuals, /texture\.repeat\.set\(18,18\)/);
  assert.match(visuals, /new THREE\.MeshStandardMaterial\(\{map:makeTileTexture/);
  assert.match(visuals, /roughness:\.96/);
  assert.match(main, /createBiomeVisualKit\(THREE\)/);
  assert.match(main, /biomeTerrainMaterials\[activeBiome\]/);
  assert.match(main, /biomeSoilMaterials\[biome\]/);
});

test("desert, mountain, snow, and tropical environments have distinct low-poly models", () => {
  for (const token of ["cactus", "dune", "pine", "snow-pine", "palm", "broadLeaf", "createRock", "createMound", "makeWater"]) {
    assert.ok(visuals.includes(token), `missing visual feature: ${token}`);
  }
  assert.match(visuals, /new THREE\.InstancedMesh/);
  assert.match(visuals, /createEnvironment\(id,map,heightAt,tileSize=1\.15\)/);
  assert.match(main, /biomeVisualKit\.createEnvironment\(activeBiome,map,terrainHeightAtWorld,scale\)/);
});

test("decorative placement preserves the starter clearing and robot corridor", () => {
  assert.match(world, /const fieldClearing = Math\.hypot\(x, z\) < 8\.5/);
  assert.match(world, /const baseClearing = distance < 8\.5/);
  assert.match(visuals, /Math\.hypot\(x,z-7\)<10\.2\|\|Math\.abs\(x\)<2\.1/);
  assert.match(visuals, /occupied\.has\(x\+":"\+z\)/);
});

test("shared biome geometry is not disposed when a world is rebuilt", () => {
  assert.match(visuals, /mesh\.userData\.sharedGeometry=true/);
  assert.match(main, /object\.geometry&&!object\.userData\?\.sharedGeometry/);
  assert.doesNotMatch(main, /terrainMesh\.material\.dispose\(\)/);
});

test("biome-specific sky, fog, and sunlight are applied", () => {
  assert.match(visuals, /const atmosphere=Object\.fromEntries/);
  assert.match(main, /biomeSkyColors\[activeBiome\]/);
  assert.match(main, /biomeSunColors\[activeBiome\]/);
  assert.match(main, /scene\.fog\.near=atmosphere\.fogNear/);
});
