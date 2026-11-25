import test from 'node:test';
import assert from 'node:assert/strict';
import { createDebuggerController } from '../src/debugger.js';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('a breakpoint blocks the interpreter before the selected statement',async()=>{
  const agent={id:'farmbot',running:true,stopRequested:false,pauseRequested:false,stepOnce:false,breakpoints:new Set([2])};
  const paused=[];const debuggerController=createDebuggerController(agent,(snapshot,status)=>paused.push({snapshot,status}));
  await debuggerController.beforeStep(1,{type:'call'},{line:1});
  let executed=false;
  const waiting=debuggerController.beforeStep(2,{type:'call'},{line:2});
  waiting.then(()=>{executed=true;});
  await tick();
  assert.equal(executed,false);
  assert.equal(agent.pauseRequested,true);
  assert.equal(paused[0].status,'точка останова');
  debuggerController.resume();
  await waiting;
  assert.equal(executed,true);
});

test('single-step executes one statement and pauses before the following one',async()=>{
  const agent={id:'farmbot',running:true,stopRequested:false,pauseRequested:false,stepOnce:false,breakpoints:new Set()};
  const controller=createDebuggerController(agent);
  controller.step();
  await controller.beforeStep(4,{type:'call'},{line:4});
  assert.equal(agent.pauseRequested,true);
  let reached=false;
  const waiting=controller.beforeStep(5,{type:'call'},{line:5});
  waiting.then(()=>{reached=true;});
  await tick();
  assert.equal(reached,false);
  controller.resume();
  await waiting;
  assert.equal(reached,true);
});

test('stop releases an interpreter paused at a breakpoint',async()=>{
  const agent={id:'farmbot',running:true,stopRequested:false,pauseRequested:false,stepOnce:false,breakpoints:new Set([1])};
  const controller=createDebuggerController(agent);
  const waiting=controller.beforeStep(1,{type:'call'},{line:1});
  await tick();controller.stop();await waiting;
  assert.equal(agent.stopRequested,true);
  assert.equal(agent.pauseRequested,false);
});
