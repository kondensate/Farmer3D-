import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { runProgram, parseProgram } from "../src/language.js";

function makeApi() {
  const actions = [], logs = [];
  const sensors = {
    can_plant: true, can_water: true, can_harvest: false,
    get_water: 7, get_energy: 95, get_position: "(0, 7)",
    get_inventory: "пусто", get_plant_age: 2, scan: 3
  };
  return {
    actions, logs,
    action: async (name, args) => actions.push([name, ...args]),
    sense: name => sensors[name],
    hasSensor: name => Object.hasOwn(sensors, name),
    log: line => logs.push(line),
    shouldStop: () => false
  };
}

test("variables, arithmetic, loops, conditions and functions", async () => {
  const api = makeApi();
  const result = await runProgram(`sum = 0
def harvest_row(n):
    for i in range(n):
        sum_local = i + 1
        if can_plant():
            plant("carrot")
        else:
            water()
        sum_local = sum_local * 2
for row in range(3):
    harvest_row(2)
print("ok", 1 + 2 * 3)
`, api);
  assert.equal(result.ok, true);
  assert.equal(api.actions.filter(x => x[0] === "plant").length, 6);
  assert.ok(api.logs.some(x => x.includes("ok 7")));
});

test("user function return values can be assigned to variables", async () => {
  const api = makeApi();
  const result = await runProgram(`x = 3
def test_robot(n):
    print("Шаг", n)
    return n
result = test_robot(x)
print("Результат", result)
`, api);
  assert.equal(result.ok, true);
  assert.ok(api.logs.includes("Шаг 3"));
  assert.ok(api.logs.includes("Результат 3"));
});

test("legacy uppercase program remains supported", async () => {
  const api = makeApi();
  const result = await runProgram(`MOVE 1
TURN LEFT
PLANT
WATER
HARVEST
WAIT 1`, api);
  assert.equal(result.ok, true);
  assert.deepEqual(api.actions.map(x => x[0]), ["move","turn_left","plant","water","harvest","wait"]);
});

test("new robot commands are dispatched without eval", async () => {
  const api = makeApi();
  const result = await runProgram(`scan()
refill_water()
return_to_base()
sleep(0)
print(get_energy(), get_position(), get_inventory(), get_plant_age())`, api);
  assert.equal(result.ok, true);
  assert.deepEqual(api.actions.map(x => x[0]), ["scan","refill_water","return_to_base","sleep"]);
});

test("invalid indentation returns a parser error", () => {
  assert.throws(() => parseProgram(`if True:
plant()`), /блок с отступом/);
});

test("break outside a loop is reported as an error", async () => {
  const api = makeApi();
  const result = await runProgram("break", api);
  assert.equal(result.ok, false);
  assert.match(result.error, /Строка 1/);
});

test("interpreter responds to stop requests", async () => {
  let stopped = false;
  const api = makeApi();
  api.shouldStop = () => stopped;
  api.action = async () => { stopped = true; };
  const result = await runProgram(`plant()
plant()`, api);
  assert.equal(result.ok, false);
  assert.match(result.error, /остановлено/);
});


test("all shipped robot example programs parse successfully", () => {
  const files = readdirSync(new URL("../programs/", import.meta.url)).filter(file => file.endsWith(".bot"));
  assert.equal(files.length, 4);
  for (const file of files) {
    const source = readFileSync(new URL(`../programs/${file}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => parseProgram(source), file);
  }
});

test("navigation command and current-line callback are exposed to the debugger", async () => {
  const api = makeApi(); const stepped = [];
  api.onStep = line => stepped.push(line);
  const result = await runProgram(`go_to_plot("ready")\nscan()`, api);
  assert.equal(result.ok, true);
  assert.deepEqual(api.actions.map(x => x[0]), ["go_to_plot", "scan"]);
  assert.deepEqual(stepped, [1, 2]);
});

test("interpreter awaits debugger gates before executing each line", async () => {
  const api = makeApi(); let release; let entered = false;
  api.beforeStep = async () => { entered = true; await new Promise(resolve => { release = resolve; }); };
  const pending = runProgram(`plant()`, api);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(entered, true);
  assert.equal(api.actions.length, 0);
  release();
  const result = await pending;
  assert.equal(result.ok, true);
  assert.equal(api.actions.length, 1);
});
