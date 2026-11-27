import test from 'node:test';
import assert from 'node:assert/strict';
import { BIOME_VISUAL_PALETTES } from '../src/biome-visuals.js';
import { BIOME_ORDER } from '../src/world.js';

test('every registered biome has a complete low-poly visual palette', () => {
  assert.deepEqual(Object.keys(BIOME_VISUAL_PALETTES).sort(), [...BIOME_ORDER].sort());
  for (const [id, palette] of Object.entries(BIOME_VISUAL_PALETTES)) {
    assert.match(palette.ground, /^#[0-9a-f]{6}$/i, id + ' ground');
    assert.match(palette.detail, /^#[0-9a-f]{6}$/i, id + ' detail');
    assert.match(palette.soil, /^#[0-9a-f]{6}$/i, id + ' soil');
    assert.match(palette.water, /^#[0-9a-f]{6}$/i, id + ' water');
    assert.ok(palette.repeat >= 7 && palette.repeat <= 12, id + ' texture repeat');
    assert.ok(palette.roughness >= .8 && palette.roughness <= 1, id + ' roughness');
  }
});

test('the four first-phase biomes have distinct ground, water and foliage palettes', () => {
  const firstPhase = ['desert', 'mountain', 'snow', 'tropical'].map(id => BIOME_VISUAL_PALETTES[id]);
  assert.equal(new Set(firstPhase.map(p => p.ground)).size, 4);
  assert.equal(new Set(firstPhase.map(p => p.water)).size, 4);
  assert.equal(new Set(firstPhase.map(p => p.accent)).size, 4);
});
