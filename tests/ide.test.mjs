import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightSource, validateSource } from '../src/ide.js';
import { runProgram } from '../src/language.js';

test('IDE marks DSL keywords, game commands, sensors, literals and comments',()=>{
  const html=highlightSource('if get_energy() > 10:\n    plant("carrot") # sow crop', {sensors:['get_energy']});
  assert.match(html,/tok-kw/);
  assert.match(html,/tok-sensor/);
  assert.match(html,/tok-number/);
  assert.match(html,/tok-cmd/);
  assert.match(html,/tok-str/);
  assert.match(html,/tok-comment/);
  assert.match(highlightSource('if get_energy():\n    move(1)',{caret:18,sensors:['get_energy']}),/is-block/);
});

test('IDE validation accepts commands and sensors supported by the game DSL',()=>{
  assert.equal(validateSource('if get_energy() > 0:\n    go_to_plot("ready")', ['get_energy']), null);
  assert.deepEqual(validateSource('unknown_game_command()'), {line:1,message:'Неизвестная команда или функция «unknown_game_command»'});
});

test('IDE highlights the source line with a syntax error',()=>{
  const source='move(1)\nif can_water():\n    move('; 
  const problem=validateSource(source,['can_water']);
  assert.equal(problem.line,3);
  assert.match(highlightSource(source, {errorLine:problem.line,sensors:['can_water']}),/has-error/);
});

test('interpreter reports live global/local variable scopes and the real call stack',async()=>{
  const snapshots=[],stacks=[],debug=[];
  const result=await runProgram('x = 2\ndef twice(n):\n    local = n * 2\n    return local\ntwice(x)\nresult = 4',{
    onVariables:snapshot=>snapshots.push(snapshot),
    onCallStack:frames=>stacks.push(frames),
    onDebugState:state=>debug.push(state)
  });
  assert.equal(result.ok,true);
  assert.ok(snapshots.some(s=>s.scopes?.locals?.some(scope=>scope.values?.local===4)));
  assert.ok(stacks.some(frames=>frames.length===1&&frames[0].name==='twice'));
  assert.ok(debug.some(item=>item.line===3&&item.statement==='assign'));
  const final=snapshots.at(-1);
  assert.equal(final.scopes.global.values.result,4);
});
