import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const ide = readFileSync(new URL('../src/ide.js', import.meta.url), 'utf8');

test('each robot saves and loads its own editor program key', () => {
  assert.match(main, /localStorage\.setItem\(\`farmerbot3d_program_\$\{a\.id\}\`,a\.program\)/);
  assert.match(main, /localStorage\.getItem\(\`farmerbot3d_program_\$\{a\.id\}\`\)/);
  assert.match(main, /function saveProgram\(\)[\s\S]*?const a=activeAgent\(\);a\.program=\$\('#code'\)\.value/);
  assert.match(main, /function loadProgram\(\)[\s\S]*?const a=activeAgent\(\)/);
});

test('switching robots loads the selected robot program, not the previous editor text', () => {
  assert.match(main, /function selectAgent\(id\)[\s\S]*?selectedAgent=a;loadProgram\(\)/);
  assert.match(main, /function activeAgent\(\)\{return selectedAgent\|\|agents\[0\];\}/);
});

test('game save includes each robot program and restore keeps even an empty saved program', () => {
  assert.match(main, /agents:agents\.map\(a=>\(\{[\s\S]*?program:a\.program/);
  assert.match(main, /agent\.program=saved\.program\?\?agent\.program/);
  assert.match(main, /a0\.program\?\?agents\[0\]\.program/);
});

test('debugger snapshots, statuses, changed values and call stacks are keyed by robot id', () => {
  assert.match(ide, /debugByRobot=new Map\\(\\),runtimeErrors=new Map\\(\\),statusByRobot=new Map\\(\\),changedByRobot=new Map\\(\\)/);
  for (const name of ['debugByRobot', 'changedByRobot', 'statusByRobot', 'runtimeErrors']) {
    assert.match(ide, new RegExp(name + '\\.(?:get|set|delete)\\(agentId'));
  }
});

test('program execution and logs are associated with the robot being run', () => {
  assert.match(main, /async function runAgent\(agent\)/);
  assert.match(main, /runProgram\(agent\.program\|\|''/);
  assert.match(main, /programLogFor\(agent,/);
  assert.match(main, /action:\(name,args\)=>programAction\(name,args,agent\)/);
});
