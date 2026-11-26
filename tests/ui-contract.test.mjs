import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('all static UI selectors referenced by the game exist in index.html', () => {
  const selectors = [...main.matchAll(/\$\('#([^']+)'\)/g)].map(match => match[1]);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const missing = [...new Set(selectors)].filter(id => !ids.has(id));
  assert.deepEqual(missing, []);
  assert.ok(ids.has('game'));
});

test('HTML contains no duplicate element IDs', () => {
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test('2.1 construction, research and debugger controls are present', () => {
  const required = ['buildToggle','researchToggle','buildPanel','researchPanel','buildingCatalog','techCatalog','pauseProgram','stepProgram','resumeProgram','currentLine'];
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const id of required) assert.ok(ids.has(id), `missing ${id}`);
});

test('runtime debugger forwards real call-stack frames into the IDE', () => {
  assert.match(main, /onCallStack:frames=>\{ide\?\.setDebugCallStack\(agent\.id,frames\);\}/);
  assert.match(readFileSync(new URL('../src/ide.js', import.meta.url), 'utf8'), /setDebugCallStack\(agentId,frames=\[\]\)/);
});

test('save format keeps v2/v3 fallback paths and adds v4 buildings/research', () => {
  assert.match(main, /farmerbot3d_save_v4/);
  assert.match(main, /farmerbot3d_save_v3/);
  assert.match(main, /farmerbot3d_save_v2/);
  assert.match(main, /buildings:buildings\.map/);
  assert.match(main, /researchedTechs:\[\.\.\.researchedTechs\]/);
});
