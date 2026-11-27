// FarmerBot 3.0 — deterministic world, biome registry and climate simulation.
// The registry is shared by the selector, map generator, simulation and save migration.

export const WORLD_SCHEMA_VERSION = 1;
export const SEASON_LENGTH_SECONDS = 180;
export const STARTER_BIOME = "meadow";
export const DEFAULT_MAP_SIZE = 32;
export const MAP_TILE_SIZE = 1.15;

export const SEASONS = Object.freeze([
  { id: "spring", name: "Весна", icon: "🌱", growth: 1.12, water: 1.0, sky: 0x9bc7c2, sun: 0xffedc2, temperature: 14, calendarDays: 30 },
  { id: "summer", name: "Лето", icon: "☀️", growth: 1.08, water: 1.3, sky: 0x9bcfc1, sun: 0xffdf9d, temperature: 27, calendarDays: 30 },
  { id: "autumn", name: "Осень", icon: "🍂", growth: 0.9, water: 0.88, sky: 0xb6b8a0, sun: 0xf2c18a, temperature: 11, calendarDays: 30 },
  { id: "winter", name: "Зима", icon: "❄️", growth: 0.58, water: 0.72, sky: 0x9cabbc, sun: 0xd6e5ff, temperature: -4, calendarDays: 30 }
]);

const biome = (id, name, icon, theme) => Object.freeze({
  id, name, icon,
  description: theme.description,
  difficulty: theme.difficulty,
  temperature: theme.temperature,
  humidity: theme.humidity,
  growth: theme.growth,
  water: theme.water,
  soil: theme.soil,
  terrain: theme.terrain,
  accent: theme.accent,
  vegetation: theme.vegetation,
  resources: Object.freeze(theme.resources),
  crops: Object.freeze(theme.crops),
  obstacles: Object.freeze(theme.obstacles),
  weather: Object.freeze(theme.weather),
  seasonGrowth: Object.freeze(theme.seasonGrowth),
  seasonWater: Object.freeze(theme.seasonWater),
  buildTags: Object.freeze(theme.buildTags),
  unlock: Object.freeze(theme.unlock),
  legacyPrice: theme.legacyPrice ?? 0,
  mapSize: theme.mapSize ?? DEFAULT_MAP_SIZE
});

export const BIOMES = Object.freeze({
  meadow: biome("meadow", "Зелёные равнины", "🌿", {
    description: "Мягкий климат, плодородная почва и безопасная стартовая зона.",
    difficulty: "Лёгкая", temperature: "8–26 °C", humidity: "Умеренная",
    growth: 1, water: 1, soil: 0x80563a, terrain: 0x719b55, accent: 0xb6c879,
    vegetation: ["tree", "bush", "grass"], resources: ["wood", "stone", "water"],
    crops: ["carrot", "potato", "tomato", "corn", "strawberry", "cucumber", "cabbage"],
    obstacles: ["tree", "boulder"], weather: ["sunny", "cloudy", "rain", "wind"],
    seasonGrowth: { spring: 1.18, summer: 1.12, autumn: .92, winter: .55 },
    seasonWater: { spring: 1, summer: 1.12, autumn: .92, winter: .78 },
    buildTags: ["basic", "farm", "energy"], unlock: { type: "starter", label: "Стартовый биом" }
  }),
  desert: biome("desert", "Пустыня", "🏜️", {
    description: "Жара, песчаные дюны, редкая вода и солнечная энергия.",
    difficulty: "Средняя", temperature: "24–46 °C", humidity: "Очень низкая",
    growth: .9, water: 1.7, soil: 0xb8874d, terrain: 0xc5a166, accent: 0xe7cb8d,
    vegetation: ["cactus", "dry-bush"], resources: ["sand", "stone", "rare-mineral", "groundwater"],
    crops: ["carrot", "potato", "tomato", "cactus-fruit"], obstacles: ["dune", "canyon", "rock"],
    weather: ["sunny", "cloudy", "wind", "drought", "rain"],
    seasonGrowth: { spring: 1.02, summer: .62, autumn: 1.0, winter: .78 },
    seasonWater: { spring: 1.25, summer: 1.85, autumn: 1.2, winter: .92 },
    buildTags: ["basic", "irrigation", "solar", "water-treatment"], unlock: { type: "progress", xp: 35, harvested: 3, label: "35 XP и 3 урожая" }, legacyPrice: 120
  }),
  mountain: biome("mountain", "Горные территории", "⛰️", {
    description: "Высотный рельеф, узкие проходы, карьеры и минеральные жилы.",
    difficulty: "Сложная", temperature: "−2–18 °C", humidity: "Умеренная",
    growth: .82, water: .9, soil: 0x777b78, terrain: 0x7f8b86, accent: 0xb1b5aa,
    vegetation: ["pine", "alpine-grass"], resources: ["stone", "iron", "copper", "freshwater"],
    crops: ["potato", "cabbage", "carrot"], obstacles: ["cliff", "boulder", "ravine", "cave"],
    weather: ["sunny", "cloudy", "rain", "wind", "fog", "snow"],
    seasonGrowth: { spring: 1.0, summer: 1.02, autumn: .8, winter: .42 },
    seasonWater: { spring: .95, summer: .9, autumn: .9, winter: .75 },
    buildTags: ["basic", "terrace", "bridge", "mine", "lift"], unlock: { type: "progress", xp: 70, harvested: 8, label: "70 XP и 8 урожаев" }, legacyPrice: 160
  }),
  snow: biome("snow", "Снежный биом", "❄️", {
    description: "Мороз, снежные бури, замерзающая вода и тёплые теплицы.",
    difficulty: "Сложная", temperature: "−24–2 °C", humidity: "Высокая",
    growth: .68, water: .72, soil: 0xb4c5cb, terrain: 0xc6d7df, accent: 0xf1f7f7,
    vegetation: ["snow-pine", "frozen-shrub"], resources: ["ice", "freshwater", "stone", "crystal"],
    crops: ["potato", "cabbage", "carrot"], obstacles: ["ice", "snowdrift", "frozen-lake"],
    weather: ["sunny", "cloudy", "snow", "blizzard", "wind", "fog"],
    seasonGrowth: { spring: .86, summer: 1.05, autumn: .58, winter: .28 },
    seasonWater: { spring: .8, summer: .72, autumn: .8, winter: .52 },
    buildTags: ["basic", "heated-greenhouse", "heater", "pipe-insulation"], unlock: { type: "progress", xp: 110, harvested: 15, label: "110 XP и 15 урожаев" }, legacyPrice: 190
  }),
  tropical: biome("tropical", "Тропические джунгли", "🌴", {
    description: "Влажные джунгли, сезонные ливни, богатые редкими культурами.",
    difficulty: "Средняя", temperature: "23–35 °C", humidity: "Очень высокая",
    growth: 1.16, water: 1.28, soil: 0x72543a, terrain: 0x4e8c68, accent: 0x82bb69,
    vegetation: ["palm", "broadleaf", "flower"], resources: ["wood", "fruit", "rubber", "rainwater"],
    crops: ["banana", "pineapple", "coconut", "cocoa", "coffee", "mango"],
    obstacles: ["dense-vegetation", "river", "flood-zone", "fallen-tree"],
    weather: ["sunny", "cloudy", "rain", "heavy-rain", "thunderstorm", "wind"],
    seasonGrowth: { spring: 1.12, summer: 1.28, autumn: 1.05, winter: .96 },
    seasonWater: { spring: 1.25, summer: 1.52, autumn: 1.3, winter: 1.08 },
    buildTags: ["basic", "drainage", "rain-collector", "tropical-greenhouse", "processing"], unlock: { type: "progress", xp: 150, harvested: 22, label: "150 XP и 22 урожая" }, legacyPrice: 220
  }),
  forest: biome("forest", "Лесной биом", "🌲", {
    description: "Густой лес, поляны, древесина, грибы и необходимость расчистки.",
    difficulty: "Средняя", temperature: "5–22 °C", humidity: "Высокая",
    growth: 1.02, water: 1.08, soil: 0x654a34, terrain: 0x416b43, accent: 0x8c9c52,
    vegetation: ["oak", "pine", "shrub", "mushroom"], resources: ["wood", "mushroom", "berries", "stone"],
    crops: ["carrot", "potato", "strawberry", "mushroom"], obstacles: ["dense-tree", "stump", "boulder", "thicket"],
    weather: ["sunny", "cloudy", "rain", "fog", "wind"],
    seasonGrowth: { spring: 1.2, summer: 1.12, autumn: .82, winter: .48 },
    seasonWater: { spring: 1.05, summer: 1.12, autumn: .9, winter: .72 },
    buildTags: ["basic", "clearing", "wood-processing", "forest-farm"], unlock: { type: "progress", xp: 200, harvested: 30, label: "200 XP и 30 урожаев" }
  }),
  volcanic: biome("volcanic", "Вулканический биом", "🌋", {
    description: "Лавовые потоки, жаркие плато и редкие вулканические минералы.",
    difficulty: "Очень высокая", temperature: "35–75 °C", humidity: "Низкая",
    growth: .62, water: 1.55, soil: 0x383638, terrain: 0x4a4140, accent: 0xed7042,
    vegetation: ["ash-shrub", "lava-moss"], resources: ["obsidian", "sulfur", "volcanic-mineral", "stone"],
    crops: ["volcanic-herb", "potato"], obstacles: ["lava", "hot-rock", "steam-vent", "crater"],
    weather: ["sunny", "cloudy", "wind", "ashfall", "heatwave"],
    seasonGrowth: { spring: .72, summer: .48, autumn: .66, winter: .82 },
    seasonWater: { spring: 1.35, summer: 1.8, autumn: 1.4, winter: 1.1 },
    buildTags: ["basic", "heat-shield", "cooling", "mining"], unlock: { type: "progress", xp: 300, harvested: 45, label: "300 XP и 45 урожаев" }
  }),
  swamp: biome("swamp", "Болота", "🪷", {
    description: "Топкие почвы, туман, камыши, настилы и необычные природные ресурсы.",
    difficulty: "Сложная", temperature: "10–28 °C", humidity: "Предельная",
    growth: .94, water: .62, soil: 0x514c38, terrain: 0x536c50, accent: 0x8da16a,
    vegetation: ["reed", "willow", "lily", "moss"], resources: ["peat", "herb", "clay", "marsh-gas"],
    crops: ["cranberry", "rice", "reed"], obstacles: ["deep-water", "mud", "quicksand", "reed-bed"],
    weather: ["cloudy", "rain", "heavy-rain", "fog", "wind", "sunny"],
    seasonGrowth: { spring: 1.05, summer: 1.12, autumn: .9, winter: .55 },
    seasonWater: { spring: .7, summer: .62, autumn: .68, winter: .85 },
    buildTags: ["basic", "boardwalk", "drainage", "wetland-farm"], unlock: { type: "progress", xp: 250, harvested: 38, label: "250 XP и 38 урожаев" }
  })
});

export const BIOME_ORDER = Object.freeze(["meadow", "desert", "mountain", "snow", "tropical", "forest", "volcanic", "swamp"]);
export const BIOME_WEATHER_TYPES = Object.freeze(["sunny", "cloudy", "rain", "heavy-rain", "thunderstorm", "snow", "blizzard", "fog", "wind", "drought", "ashfall", "heatwave"]);
export const WEATHER_LABELS = Object.freeze({
  sunny: "Солнечно", cloudy: "Облачно", rain: "Дождь", "heavy-rain": "Сильный дождь",
  thunderstorm: "Гроза", snow: "Снег", blizzard: "Снежная буря", fog: "Туман",
  wind: "Сильный ветер", drought: "Засуха", ashfall: "Пеплопад", heatwave: "Жаркая волна"
});
export const WEATHER_EFFECTS = Object.freeze({
  sunny: { growth: 1, water: 1, solar: 1, movement: 1, equipment: 1 },
  cloudy: { growth: .98, water: 1, solar: .65, movement: 1, equipment: 1 },
  rain: { growth: 1.28, water: .78, solar: .55, movement: .92, equipment: .96 },
  "heavy-rain": { growth: 1.34, water: .7, solar: .3, movement: .72, equipment: .82 },
  thunderstorm: { growth: 1.2, water: .7, solar: .18, movement: .65, equipment: .65 },
  snow: { growth: .42, water: .72, solar: .42, movement: .78, equipment: .86 },
  blizzard: { growth: .22, water: .65, solar: .2, movement: .48, equipment: .58 },
  fog: { growth: .94, water: .95, solar: .58, movement: .82, equipment: 1 },
  wind: { growth: .94, water: 1.12, solar: .92, movement: .9, equipment: 1.08 },
  drought: { growth: .52, water: 1.6, solar: 1.22, movement: 1, equipment: 1 },
  ashfall: { growth: .5, water: 1.35, solar: .38, movement: .62, equipment: .72 },
  heatwave: { growth: .58, water: 1.8, solar: 1.18, movement: .78, equipment: .85 }
});

export const BIOME_UNLOCK_REQUIREMENTS = Object.freeze(Object.fromEntries(
  BIOME_ORDER.map(id => [id, BIOMES[id].unlock])
));

export const LEGACY_LAND_PARCELS = Object.freeze({
  desert: { biome: "desert", x: 0, z: -10, size: 8.4, rows: 3, columns: 3 },
  mountain: { biome: "mountain", x: 10, z: 0, size: 8.4, rows: 3, columns: 3 },
  snow: { biome: "snow", x: 0, z: 10, size: 8.4, rows: 3, columns: 3 },
  tropical: { biome: "tropical", x: -10, z: 0, size: 8.4, rows: 3, columns: 3 }
});
// Backwards-compatible name while v6 saves and the old parcel UI are migrated.
export const LAND_PARCELS = LEGACY_LAND_PARCELS;

const SEASON_WEATHER = Object.freeze({
  spring: ["sunny", "rain", "cloudy", "rain", "wind"],
  summer: ["sunny", "sunny", "drought", "cloudy", "rain"],
  autumn: ["cloudy", "rain", "wind", "fog", "sunny"],
  winter: ["snow", "sunny", "snow", "blizzard", "fog"]
});
const WEATHER_GROWTH = Object.freeze(Object.fromEntries(Object.entries(WEATHER_EFFECTS).map(([id, effects]) => [id, effects.growth])));

export function advanceSeason(seasonId, elapsedSeconds, deltaSeconds = 0) {
  const index = Math.max(0, SEASONS.findIndex(item => item.id === seasonId));
  const total = Math.max(0, Number(elapsedSeconds) || 0) + Math.max(0, Number(deltaSeconds) || 0);
  const steps = Math.floor(total / SEASON_LENGTH_SECONDS);
  return {
    season: SEASONS[(index + steps) % SEASONS.length].id,
    seasonClock: total % SEASON_LENGTH_SECONDS,
    changed: steps > 0,
    steps
  };
}

export function getSeasonWeather(seasonId, step = 0) {
  const cycle = SEASON_WEATHER[seasonId] || SEASON_WEATHER.spring;
  const index = ((Math.floor(Number(step) || 0) % cycle.length) + cycle.length) % cycle.length;
  return cycle[index];
}

export function getBiomeWeather(biomeId = STARTER_BIOME, seasonId = "spring", step = 0, seed = 1) {
  const climate = BIOMES[biomeId] || BIOMES[STARTER_BIOME];
  const season = SEASONS.some(item => item.id === seasonId) ? seasonId : "spring";
  const cycle = SEASON_WEATHER[season];
  const allowed = new Set(climate.weather);
  const candidates = cycle.filter(id => allowed.has(id));
  const pool = candidates.length ? candidates : climate.weather;
  const offset = Math.abs((Math.floor(Number(step) || 0) + hashSeed(seed)) % pool.length);
  return pool[offset];
}

export function getEnvironmentEffects(biomeId = STARTER_BIOME, seasonId = "spring", weatherId = "sunny") {
  const climate = BIOMES[biomeId] || BIOMES[STARTER_BIOME];
  const season = SEASONS.find(item => item.id === seasonId) || SEASONS[0];
  const seasonGrowth = climate.seasonGrowth?.[season.id] ?? season.growth;
  const seasonWater = climate.seasonWater?.[season.id] ?? season.water;
  const weatherEffects = WEATHER_EFFECTS[weatherId] || WEATHER_EFFECTS.sunny;
  return {
    growth: climate.growth * seasonGrowth * weatherEffects.growth,
    water: climate.water * seasonWater * weatherEffects.water,
    solar: weatherEffects.solar,
    movement: weatherEffects.movement,
    equipment: weatherEffects.equipment,
    temperature: season.temperature + temperatureOffset(biomeId, season.id)
  };
}

function temperatureOffset(biomeId, seasonId) {
  const offsets = {
    meadow: { spring: 0, summer: 0, autumn: 0, winter: 0 },
    desert: { spring: 14, summer: 22, autumn: 15, winter: 8 },
    mountain: { spring: -6, summer: -8, autumn: -7, winter: -11 },
    snow: { spring: -17, summer: -14, autumn: -18, winter: -22 },
    tropical: { spring: 12, summer: 13, autumn: 11, winter: 9 },
    forest: { spring: -2, summer: -1, autumn: -3, winter: -5 },
    volcanic: { spring: 27, summer: 34, autumn: 28, winter: 22 },
    swamp: { spring: 4, summer: 3, autumn: 2, winter: -1 }
  };
  return offsets[biomeId]?.[seasonId] ?? 0;
}

export function waterCostForPlot(biomeId = STARTER_BIOME, seasonId = "spring", weatherId = "sunny") {
  const effects = getEnvironmentEffects(biomeId, seasonId, weatherId);
  return Math.max(1, Math.ceil(effects.water - 1e-9));
}

export function getBiomeUnlockState(biomeId, progress = {}, unlocked = [STARTER_BIOME]) {
  const definition = BIOMES[biomeId];
  if (!definition) return { known: false, unlocked: false, reason: "unknown-biome" };
  const alreadyUnlocked = new Set(unlocked || []);
  if (alreadyUnlocked.has(biomeId) || definition.unlock.type === "starter") return { known: true, unlocked: true, reason: "unlocked" };
  const xp = Math.max(0, Number(progress.xp) || 0);
  const harvested = Math.max(0, Number(progress.harvested) || 0);
  const requirement = definition.unlock;
  const xpReady = xp >= (requirement.xp || 0);
  const harvestReady = harvested >= (requirement.harvested || 0);
  return {
    known: true,
    unlocked: xpReady && harvestReady,
    reason: xpReady && harvestReady ? "ready-to-unlock" : "requirements",
    missingXP: Math.max(0, (requirement.xp || 0) - xp),
    missingHarvest: Math.max(0, (requirement.harvested || 0) - harvested),
    requirement
  };
}

export function unlockBiome(biomeId, progress = {}, unlocked = [STARTER_BIOME]) {
  const state = getBiomeUnlockState(biomeId, progress, unlocked);
  if (!state.known || !state.unlocked) return { ok: false, reason: state.reason, state, unlocked: [...(unlocked || [])] };
  const next = new Set(unlocked || []);
  next.add(biomeId);
  return { ok: true, reason: "unlocked", biome: biomeId, unlocked: [...next] };
}

export function hashSeed(seed) {
  const text = String(seed ?? 1);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed = 1) {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateWorldMap(seed = 1, biomeId = STARTER_BIOME, options = {}) {
  const definition = BIOMES[biomeId] || BIOMES[STARTER_BIOME];
  const size = Math.max(20, Math.min(64, Math.floor(Number(options.size) || definition.mapSize)));
  const half = Math.floor(size / 2);
  const rng = createSeededRandom(seed);
  const start = { x: 0, z: 7 };
  const plots = [];
  for (let row = -2; row <= 2; row++) {
    for (let column = -2; column <= 2; column++) plots.push({ x: column * 2.4, z: row * 2.4, buildable: true });
  }
  const resources = [];
  const obstacles = [];
  const vegetation = [];
  const heightMap = [];
  for (let z = -half; z <= half; z++) {
    for (let x = -half; x <= half; x++) {
      const distance = Math.hypot(x, z - start.z);
      const hillNoise = rng() * 2 - 1;
      const ridgeNoise = (Math.sin((x + hashSeed(seed) % 17) * .21) + Math.cos((z - hashSeed(seed) % 13) * .17)) * .5;
      let height = 0;
      if (biomeId === "mountain") height = Math.max(0, Math.round((Math.abs(ridgeNoise) * 2.8 + hillNoise * .4) * 2) / 2);
      else if (biomeId === "volcanic") height = Math.max(0, Math.round((Math.abs(ridgeNoise) * 1.8 + hillNoise * .3) * 2) / 2);
      else if (biomeId === "swamp") height = Math.max(-.35, Math.round((ridgeNoise * .25 + hillNoise * .08) * 4) / 4);
      else if (biomeId === "tropical") height = Math.max(-.1, Math.round((ridgeNoise * .25 + hillNoise * .12) * 4) / 4);
      else if (biomeId === "forest") height = Math.max(0, Math.round((ridgeNoise * .55 + hillNoise * .18) * 4) / 4);
      heightMap.push({ x, z, height: distance < 7 ? 0 : height });
      if (Math.abs(x) > half - 2 || Math.abs(z) > half - 2 || distance < 8.5) continue;
      const roll = rng();
      if (roll < .055) {
        obstacles.push({ id: `obstacle-${obstacles.length + 1}`, type: definition.obstacles[Math.floor(rng() * definition.obstacles.length)], x, z, radius: .45 + rng() * .55 });
      } else if (roll < .085) {
        vegetation.push({ id: `vegetation-${vegetation.length + 1}`, type: definition.vegetation[Math.floor(rng() * definition.vegetation.length)], x: x + rng() * .4, z: z + rng() * .4 });
      } else if (roll > .94) {
        resources.push({ id: `resource-${resources.length + 1}`, type: definition.resources[Math.floor(rng() * definition.resources.length)], x, z, amount: 2 + Math.floor(rng() * 7) });
      }
    }
  }
  // Guaranteed resources are placed outside the starter clearing but inside a walkable ring.
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3 + .35;
    const radius = 10 + i;
    resources.push({
      id: `starter-resource-${i + 1}`,
      type: definition.resources[i % definition.resources.length],
      x: Math.round(Math.cos(angle) * radius),
      z: Math.round(Math.sin(angle) * radius),
      amount: 4 + i
    });
  }
  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    seed: String(seed ?? 1),
    biome: definition.id,
    size,
    tileSize: MAP_TILE_SIZE,
    start,
    base: { x: 0, z: 7 },
    plots,
    heightMap,
    resources,
    obstacles,
    vegetation,
    buildableZones: [{ id: "starter-clearing", x: 0, z: 0, width: 14, depth: 14 }],
    safeRoute: [{ x: 0, z: 7 }, { x: 0, z: 4 }, { x: 0, z: 0 }, { x: 0, z: -4 }]
  };
}

export function landParcelPlotPositions(biomeId, spacing = 2.4) {
  const parcel = LEGACY_LAND_PARCELS[biomeId];
  if (!parcel) return [];
  const positions = [];
  for (let row = 0; row < parcel.rows; row++) {
    for (let column = 0; column < parcel.columns; column++) {
      positions.push({
        x: parcel.x + (column - (parcel.columns - 1) / 2) * spacing,
        z: parcel.z + (row - (parcel.rows - 1) / 2) * spacing,
        biome: biomeId
      });
    }
  }
  return positions;
}

export function purchaseLand(biomeId, ownedBiomes, coins, mode = "campaign") {
  const definition = BIOMES[biomeId];
  if (!definition || !LEGACY_LAND_PARCELS[biomeId]) return { ok: false, reason: "unknown-land", coins };
  if (ownedBiomes?.has(biomeId)) return { ok: false, reason: "already-owned", coins };
  const cost = mode === "sandbox" ? 0 : definition.legacyPrice;
  if (coins < cost) return { ok: false, reason: "insufficient-coins", coins, cost };
  return { ok: true, reason: "purchased", coins: coins - cost, cost, biome: biomeId };
}
