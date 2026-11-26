import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const language = readFileSync(new URL('../src/language.js', import.meta.url), 'utf8');
const automation = readFileSync(new URL('../src/automation.js', import.meta.url), 'utf8');

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

test('IDE exposes per-robot debugger state, variables, next command and changed values', () => {
  const ide = readFileSync(new URL('../src/ide.js', import.meta.url), 'utf8');
  assert.ok(ide.includes('statusByRobot=new Map'));
  assert.ok(ide.includes('setRunStatus(agentId,status'));
  assert.ok(ide.includes('setDebugCallStack(agentId,frames'));
  assert.ok(ide.includes('changedByRobot'));
  assert.ok(ide.includes('debug.nextLine'));
  assert.ok(html.includes('ide-value.changed'));
});

test('save format keeps v2/v3/v4 fallback paths and adds v5 automation data', () => {
  assert.match(main, /farmerbot3d_save_v5/);
  assert.match(main, /farmerbot3d_save_v4/);
  assert.match(main, /farmerbot3d_save_v3/);
  assert.match(main, /farmerbot3d_save_v2/);
  assert.match(main, /buildings:buildings\.map/);
  assert.match(main, /researchedTechs:\[\.\.\.researchedTechs\]/);
});

test('Stage B network and dispatcher controls are present and wired', () => {
  for (const id of ['autoDispatchToggle','automationStatus','taskQueue']) assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  assert.match(main, /function chooseAutomationLink\(kind,id\)/);
  assert.match(main, /data-connect-power/);
  assert.match(main, /data-connect-conveyor/);
  assert.match(main, /function dispatchAutomationTasks\(\)/);
  assert.match(main, /type:'return',agentId/);
});

test('Stage B resource transfer commands are registered in the safe DSL', () => {
  assert.match(language, /"transfer_to", "transfer_from"/);
  assert.match(main, /transferInventory\(agent,target,args\[1\],args\[2\]\)/);
  assert.match(automation, /export function transferInventory/);
});

test('Stage B saves and restores power and conveyor graphs', () => {
  assert.match(main, /automation:\{powerLinks,conveyorLinks,autoDispatchEnabled\}/);
  assert.match(main, /powerLinks\.splice/);
  assert.match(main, /conveyorLinks\.splice/);
  assert.match(main, /legacyUnwired/);
  assert.match(main, /updatePowerGrid\(buildings,powerLinks/);
  assert.match(main, /stepConveyorNetwork\(buildings\.filter\(b=>b\.powered\)/);
});

test('new consumers require power links while legacy pre-v5 consumers are preserved', () => {
  assert.match(main, /legacyUnwired:Number\(d\.version\|\|0\)<5/);
  assert.match(main, /b\.powered=!!powerState\.powered\.get\(String\(b\.id\)\)\|\|!!b\.legacyUnwired/);
});
