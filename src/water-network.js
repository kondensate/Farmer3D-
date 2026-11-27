const roleOf = node => node.waterRole || (Number(node.waterOutput) > 0 ? "source" : node.type === "tank" ? "storage" : node.type === "water_pump" ? "consumer" : "pipe");

/** Distributes water through connected pipe components without duplicating the shared farm reserve. */
export function updateWaterNetwork(buildings, links, dt = 1, context = {}) {
  const nodes = new Map((buildings || []).filter(node => node && node.id != null && node.waterNode).map(node => [String(node.id), node]));
  const adjacency = new Map([...nodes.keys()].map(id => [id, []]));
  for (const edge of links || []) {
    const from = String(edge?.from ?? ""), to = String(edge?.to ?? "");
    if (from === to || !nodes.has(from) || !nodes.has(to)) continue;
    adjacency.get(from).push(to); adjacency.get(to).push(from);
  }
  const elapsed = Math.max(0, Math.min(1, Number(dt) || 0));
  const visited = new Set(), supplied = new Map(), pressure = new Map();
  let production = 0, demand = 0, outages = 0, connected = 0;
  for (const start of nodes.keys()) {
    if (visited.has(start)) continue;
    const queue = [start], component = [], distance = new Map([[start, 0]]); visited.add(start);
    while (queue.length) {
      const id = queue.shift(); component.push(nodes.get(id));
      for (const next of adjacency.get(id) || []) if (!visited.has(next)) { visited.add(next); distance.set(next, distance.get(id) + 1); queue.push(next); }
    }
    if (component.length > 1) connected++;
    const sources = component.filter(node => roleOf(node) === "source");
    const consumers = component.filter(node => roleOf(node) === "consumer").sort((a, b) => (Number(b.waterPriority) || 0) - (Number(a.waterPriority) || 0) || String(a.id).localeCompare(String(b.id)));
    const canStore = component.some(node => roleOf(node) === "storage");
    const rawOutput = sources.reduce((sum, node) => sum + Math.max(0, Number(node.waterOutput) || 0), 0);
    let climateFactor = context.biome === "desert" ? .7 : context.biome === "tropical" || context.weather === "rain" || context.weather === "heavy-rain" ? 1.2 : 1;
    if (["drought", "heatwave"].includes(context.weather)) climateFactor *= .65;
    let available = rawOutput * climateFactor;
    const servesNetwork = canStore || consumers.length > 0;
    if (servesNetwork && sources.length) production += available;
    for (const consumer of consumers) {
      const requested = Math.max(0, Number(consumer.waterDemand) || 0);
      demand += requested;
      const edgeDistance = distance.get(String(consumer.id)) || 0;
      const hydraulicFactor = Math.max(.25, 1 - Math.max(0, edgeDistance - 1) * .08);
      const availableAtPump = context.frozen ? 0 : available * hydraulicFactor;
      const powered = !context.powered || context.powered.get(String(consumer.id)) === true;
      const active = requested > 0 && powered && availableAtPump + 1e-9 >= requested;
      supplied.set(String(consumer.id), active);
      pressure.set(String(consumer.id), active ? Math.min(1, availableAtPump / Math.max(requested, 1)) : 0);
      if (active) available -= requested / hydraulicFactor;
      else outages++;
    }
  }
  return { supplied, pressure, production: context.frozen ? 0 : production, demand, outages, connected, elapsed };
}
