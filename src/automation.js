// Stage B automation primitives. Pure logic kept separate from the Three.js scene.
export const POWER_DEMAND = Object.freeze({
  charger: 4,
  robot_station: 6,
  conveyor: 1,
  conveyor_splitter: 0.8,
  conveyor_filter: 0.8,
  conveyor_buffer: 0.6,
  conveyor_storage: 0.6,
  water_pump: 3
});

const batteryLimit = 12;
const capacityOf = node => Math.max(0, Number(node.batteryCapacity) || 100);
const chargeOf = node => Math.max(0, Number(node.batteryCharge) || 0);
const powerRole = node => node.powerRole || (node.powerOutput > 0 ? "generator" : node.type === "battery" ? "battery" : POWER_DEMAND[node.type] ? "consumer" : "node");

export function updatePowerGrid(buildings, links, dt = 1, context = {}) {
  const nodes = new Map((buildings || []).filter(b => b && b.id != null && b.powerNode).map(b => [String(b.id), b]));
  const adjacency = new Map([...nodes.keys()].map(id => [id, []]));
  for (const link of links || []) {
    const from = String(link?.from ?? ""), to = String(link?.to ?? "");
    if (from === to || !nodes.has(from) || !nodes.has(to)) continue;
    adjacency.get(from).push(to);
    adjacency.get(to).push(from);
  }
  const visited = new Set(), powered = new Map();
  let generation = 0, consumption = 0, stored = 0, outages = 0;
  const elapsed = Math.max(0.001, Math.min(1, Number(dt) || 0.001));
  for (const start of nodes.keys()) {
    if (visited.has(start)) continue;
    const stack = [start], component = [];
    visited.add(start);
    while (stack.length) {
      const id = stack.pop(); component.push(nodes.get(id));
      for (const next of adjacency.get(id) || []) if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
    const generators = component.filter(n => powerRole(n) === "generator");
    const batteries = component.filter(n => powerRole(n) === "battery");
    const consumers = component.filter(n => powerRole(n) === "consumer");
    const output = generators.reduce((sum, n) => {
      let factor = 1;
      if (n.type === "solar_generator") factor = Math.max(0.12, Math.min(1, Number(context.solarFactor) || 1));
      if (n.type === "wind_generator") factor = Math.max(0.35, Math.min(1.25, Number(context.windFactor) || 1));
      return sum + Math.max(0, Number(n.powerOutput) || 0) * factor;
    }, 0);
    generation += output;
    const requested = consumers.reduce((sum, n) => sum + (Number(n.powerDemand) || POWER_DEMAND[n.type] || 0), 0);
    const batteryAvailableRate = batteries.reduce((sum, n) => sum + Math.min(batteryLimit, chargeOf(n) / elapsed), 0);
    let availableRate = output + batteryAvailableRate;
    const ordered = [...consumers].sort((a, b) => (Number(b.powerPriority) || 0) - (Number(a.powerPriority) || 0) || String(a.id).localeCompare(String(b.id)));
    let allocatedRate = 0;
    for (const consumer of ordered) {
      const demand = Math.max(0, Number(consumer.powerDemand) || POWER_DEMAND[consumer.type] || 0);
      const on = availableRate + 1e-9 >= demand;
      powered.set(String(consumer.id), on);
      if (on) { availableRate -= demand; allocatedRate += demand; consumption += demand; }
      else outages++;
    }
    const batteryUse = Math.max(0, allocatedRate - output) * elapsed;
    let remainingUse = batteryUse;
    for (const battery of batteries) {
      const used = Math.min(chargeOf(battery), batteryLimit * elapsed, remainingUse);
      battery.batteryCharge = Math.max(0, chargeOf(battery) - used);
      remainingUse -= used;
    }
    const surplus = Math.max(0, output - Math.min(output, allocatedRate)) * elapsed;
    let remainingSurplus = surplus;
    for (const battery of batteries) {
      const room = Math.max(0, capacityOf(battery) - chargeOf(battery));
      const added = Math.min(room, batteryLimit * elapsed, remainingSurplus);
      battery.batteryCharge = Math.min(capacityOf(battery), chargeOf(battery) + added);
      remainingSurplus -= added;
    }
    stored += batteries.reduce((sum, n) => sum + chargeOf(n), 0);
    // A connected but underpowered component reports an outage; consumers fail closed.
    if (requested > allocatedRate + 1e-9) outages += 0;
  }
  return { powered, generation, consumption, stored, outages };
}

export function transferInventory(source, destination, resource, amount) {
  const count = Number(amount), key = String(resource || "");
  if (!source || !destination || source === destination) return { ok: false, moved: 0, reason: "invalid-endpoints" };
  if (!key || !Number.isInteger(count) || count <= 0) return { ok: false, moved: 0, reason: "invalid-amount" };
  const sourceInventory = source.inventory || (source.inventory = {});
  const destinationInventory = destination.inventory || (destination.inventory = {});
  const available = Math.max(0, Number(sourceInventory[key]) || 0);
  const used = Object.values(destinationInventory).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
  const capacity = Math.max(0, Number(destination.capacity) || 0);
  if (available < count) return { ok: false, moved: 0, reason: "insufficient-resource" };
  if (used + count > capacity) return { ok: false, moved: 0, reason: "destination-full" };
  // Validate everything before mutating either inventory: transfer is atomic.
  const remaining = available - count;
  if (remaining) sourceInventory[key] = remaining;
  else delete sourceInventory[key];
  destinationInventory[key] = (Number(destinationInventory[key]) || 0) + count;
  return { ok: true, moved: count };
}

export function buildFarmTaskQueue(plots, crop = "carrot", seedStock = {}) {
  const tasks = [];
  (plots || []).forEach((plot, plotIndex) => {
    if (!plot) return;
    if (plot.state === "ready") tasks.push({ id: `harvest:${plotIndex}`, type: "harvest", plotIndex, crop: plot.cropType || crop, priority: 90 });
    else if (["seed", "growing"].includes(plot.state) && !plot.watered) tasks.push({ id: `water:${plotIndex}`, type: "water", plotIndex, crop: plot.cropType || crop, priority: 70 });
    else if (plot.state === "empty" && (Number(seedStock[crop]) > 0 || seedStock.unlimited)) tasks.push({ id: `plant:${plotIndex}`, type: "plant", plotIndex, crop, priority: 45 });
  });
  return tasks.sort((a, b) => b.priority - a.priority || a.plotIndex - b.plotIndex);
}

const roleCanDo = (agent, task) => {
  if (agent.type === "dronebot") return false;
  if (task.type === "plant") return !["waterbot", "harvestbot"].includes(agent.type);
  if (task.type === "water") return !["harvestbot"].includes(agent.type) && (agent.type !== "waterbot" || Number(agent.water) > 0);
  if (task.type === "harvest") return !["waterbot"].includes(agent.type);
  return false;
};

export function scoreAgentForTask(agent, task, targetPosition = { x: 0, z: 0 }) {
  if (!agent || !task || !roleCanDo(agent, task)) return -Infinity;
  const energy = Number(agent.energy) || 0;
  if (energy < 8) return -Infinity;
  const position = agent.position || agent.mesh?.position || { x: 0, z: 0 };
  const distance = Math.hypot((Number(position.x) || 0) - (Number(targetPosition.x) || 0), (Number(position.z) || 0) - (Number(targetPosition.z) || 0));
  const roleBonus = task.type === "water" && agent.type === "waterbot" ? 18 : task.type === "harvest" && agent.type === "harvestbot" ? 18 : 0;
  const energyBonus = Math.min(10, energy / 10);
  const load = Object.values(agent.inventory || {}).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
  const capacity = Math.max(0, Number(agent.capacity) || 0);
  if (task.type === "harvest" && load >= capacity) return -Infinity;
  if (task.type === "water" && task.sharedWaterAvailable === false && agent.type !== "waterbot") return -Infinity;
  return task.priority + roleBonus + energyBonus - distance * 2.5 - load * 2;
}

export function selectAgentForTask(agents, task, targetPosition) {
  return (agents || []).filter(a => !a.running && !a.autoTaskBusy).map(agent => ({
    agent,
    score: scoreAgentForTask(agent, task, targetPosition)
  })).filter(item => Number.isFinite(item.score)).sort((a, b) => b.score - a.score || String(a.agent.id).localeCompare(String(b.agent.id)))[0]?.agent || null;
}

const nodeCapacity = node => node.type === "conveyor_buffer" ? 12 : node.type === "conveyor_storage" ? 24 : 4;
export function stepConveyorNetwork(buildings, links, dt = 1, maxDeliveries = 20) {
  const nodes = new Map((buildings || []).filter(b => b && b.id != null).map(b => [String(b.id), b]));
  const outgoing = new Map([...nodes.keys()].map(id => [id, []]));
  for (const edge of links || []) {
    const from = String(edge?.from ?? ""), to = String(edge?.to ?? "");
    if (from !== to && nodes.has(from) && nodes.has(to)) outgoing.get(from).push(to);
  }
  const delivered = [];
  for (const [id, node] of nodes) {
    if (!Array.isArray(node.items)) node.items = [];
    node.routeClock = (Number(node.routeClock) || 0) + Math.max(0, Number(dt) || 0);
    if (node.routeClock < 1.25 || !node.items.length) continue;
    node.routeClock %= 1.25;
    const item = node.items[0];
    if (node.type === "conveyor_storage") {
      if (delivered.length < maxDeliveries) { delivered.push({ ...item }); node.items.shift(); }
      continue;
    }
    if (node.type === "conveyor_filter" && node.filterCrop && node.filterCrop !== "all" && item.crop !== node.filterCrop) continue;
    const choices = outgoing.get(id) || [];
    if (!choices.length) continue;
    let targetId = choices[0];
    if (node.type === "conveyor_splitter" && choices.length > 1) {
      const index = Math.max(0, Number(node.routeIndex) || 0) % choices.length;
      targetId = choices[index];
      node.routeIndex = (index + 1) % choices.length;
    }
    const target = nodes.get(targetId);
    if (target.type !== "conveyor_storage" && (target.items || []).length >= nodeCapacity(target)) continue;
    if (!Array.isArray(target.items)) target.items = [];
    target.items.push(node.items.shift());
  }
  return delivered;
}
