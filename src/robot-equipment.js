export const ROBOT_MODULES = {
  thermal_shield: { name:"Термозащита", icon:"🌋", cost:55, hazards:["lava","steam-vent","hot-rock","crater"], biomes:["volcanic"], movementBonus:.18, traversalReduction:.72, energyReduction:.8, description:"Снижает риск рядом с лавой и горячими породами" },
  cold_tracks: { name:"Морозные гусеницы", icon:"❄️", cost:45, hazards:["frozen-lake","ice","snowdrift"], biomes:["snow"], movementBonus:.18, traversalReduction:.72, energyReduction:.8, description:"Уверенное движение по льду и глубокому снегу" },
  swamp_chassis: { name:"Болотное шасси", icon:"🐸", cost:50, hazards:["quicksand","mud","deep-water","flood-zone"], biomes:["swamp"], movementBonus:.18, traversalReduction:.72, energyReduction:.8, description:"Защита от вязкого грунта, воды и затоплений" },
  mountain_climber: { name:"Горный привод", icon:"⛰️", cost:60, hazards:[], biomes:["mountain"], movementBonus:.18, traversalReduction:1, energyReduction:1, stepBonus:.35, description:"Позволяет преодолевать более крутые подъёмы" }
};

export function moduleEffects(installed = []) {
  const modules = [...new Set(Array.isArray(installed) ? installed : [])].map(id => ROBOT_MODULES[id]).filter(Boolean);
  const protectedHazards = new Set(modules.flatMap(module => module.hazards));
  return {
    protectedHazards,
    traversalReduction: modules.reduce((value, module) => Math.min(value, module.traversalReduction), 1),
    energyReduction: modules.reduce((value, module) => Math.min(value, module.energyReduction), 1),
    stepBonus: modules.reduce((value, module) => value + (module.stepBonus || 0), 0)
  };
}

export function hazardTraversalMultiplier(installed, hazardType) {
  const effects = moduleEffects(installed);
  return effects.protectedHazards.has(hazardType) ? effects.traversalReduction : 1;
}

export function hazardEnergyMultiplier(installed, hazardType) {
  const effects = moduleEffects(installed);
  return effects.protectedHazards.has(hazardType) ? effects.energyReduction : 1;
}

export function biomeMovementMultiplier(installed, biome) {
  const ids = [...new Set(Array.isArray(installed) ? installed : [])];
  return ids.some(id => ROBOT_MODULES[id]?.biomes?.includes(biome))
    ? 1 + Math.max(...ids.map(id => ROBOT_MODULES[id]?.biomes?.includes(biome) ? ROBOT_MODULES[id].movementBonus || 0 : 0))
    : 1;
}
