export const GRID_STEP = 1.15;
export const GRID_LIMIT = 15;

export function worldToCell(point, step = GRID_STEP, limit = GRID_LIMIT) {
  const x = Math.max(-limit, Math.min(limit, Math.round(Number(point.x) / step)));
  const z = Math.max(-limit, Math.min(limit, Math.round(Number(point.z) / step)));
  return { x, z };
}

export function cellToWorld(cell, step = GRID_STEP) {
  return { x: cell.x * step, z: cell.z * step };
}

export function cellKey(cell) { return `${cell.x},${cell.z}`; }

// A* on the farm grid. Optional terrain data adds slope limits and a traversal cost.
export function findPath(start, goal, blocked = new Set(), limit = GRID_LIMIT, terrain = null) {
  const s = { x: Math.round(start.x), z: Math.round(start.z) };
  const g = { x: Math.round(goal.x), z: Math.round(goal.z) };
  const isInside = c => Math.abs(c.x) <= limit && Math.abs(c.z) <= limit;
  if (!isInside(s) || !isInside(g)) return null;
  const blockedKeys = blocked instanceof Set ? blocked : new Set([...blocked].map(cellKey));
  const startKey = cellKey(s), goalKey = cellKey(g);
  if (startKey !== goalKey && blockedKeys.has(goalKey)) return null;
  const heightAt = typeof terrain?.heightAt === "function" ? terrain.heightAt : () => 0;
  const maxStep = Number.isFinite(terrain?.maxStep) ? Math.max(0, terrain.maxStep) : Infinity;
  const slopeCost = Number.isFinite(terrain?.slopeCost) ? Math.max(0, terrain.slopeCost) : 0;
  const traversalCost = typeof terrain?.traversalCost === "function" ? terrain.traversalCost : () => 0;
  const heuristic = c => Math.abs(c.x - g.x) + Math.abs(c.z - g.z);
  const open = [{ ...s, g: 0, f: heuristic(s) }];
  const cameFrom = new Map();
  const cost = new Map([[startKey, 0]]);
  const closed = new Set();
  const dirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
  while (open.length) {
    let best = 0;
    for (let i=1;i<open.length;i++) if (open[i].f < open[best].f) best = i;
    const current = open.splice(best,1)[0];
    const key = cellKey(current);
    if (key === goalKey) {
      const path = [g]; let k = goalKey;
      while (k !== startKey) { k = cameFrom.get(k); if (!k) return null; const [x,z]=k.split(',').map(Number); path.push({x,z}); }
      path.reverse(); return path;
    }
    if (closed.has(key)) continue;
    closed.add(key);
    for (const dir of dirs) {
      const next = { x: current.x + dir.x, z: current.z + dir.z };
      if (!isInside(next)) continue;
      const nk = cellKey(next);
      if (blockedKeys.has(nk) && nk !== goalKey) continue;
      if (closed.has(nk)) continue;
      const rise = Math.abs((Number(heightAt(next.x,next.z))||0) - (Number(heightAt(current.x,current.z))||0));
      if (rise > maxStep) continue;
      const extraCost = Number(traversalCost(next.x, next.z, current.x, current.z));
      const hazardCost = Number.isFinite(extraCost) ? Math.max(0, extraCost) : 0;
      const tentative = current.g + 1 + rise * slopeCost + hazardCost;
      if (tentative >= (cost.get(nk) ?? Infinity)) continue;
      cameFrom.set(nk,key); cost.set(nk,tentative);
      open.push({ ...next, g: tentative, f: tentative + heuristic(next) });
    }
  }
  return null;
}

export function buildBlockedCells({ buildings = [], agents = [], ignoreAgentId = null, step = GRID_STEP } = {}) {
  const blocked = new Set();
  for (const b of buildings) {
    const radiusX = Math.max(.6, Number(b.width || 1.6) * .5);
    const radiusZ = Math.max(.6, Number(b.depth || 1.6) * .5);
    const center = worldToCell(b,step);
    const rx = Math.ceil(radiusX / step), rz = Math.ceil(radiusZ / step);
    for (let x=center.x-rx;x<=center.x+rx;x++) for(let z=center.z-rz;z<=center.z+rz;z++) {
      const wx=x*step, wz=z*step;
      if(Math.abs(wx-b.x)<=radiusX+.2 && Math.abs(wz-b.z)<=radiusZ+.2) blocked.add(cellKey({x,z}));
    }
  }
  for (const a of agents) {
    if (a.id === ignoreAgentId || a.type === 'dronebot') continue;
    const c = worldToCell(a.mesh?.position || a.position || a,step);
    blocked.add(cellKey(c));
  }
  return blocked;
}
