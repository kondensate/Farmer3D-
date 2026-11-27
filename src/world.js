// Stage C world simulation: biomes, seasons, climate and land parcels.
export const SEASON_LENGTH_SECONDS = 180;

export const SEASONS = Object.freeze([
  { id: "spring", name: "Весна", icon: "🌱", growth: 1.12, water: 1.0, sky: 0x9bc7c2, sun: 0xffedc2 },
  { id: "summer", name: "Лето", icon: "☀️", growth: 1.08, water: 1.3, sky: 0x9bcfc1, sun: 0xffdf9d },
  { id: "autumn", name: "Осень", icon: "🍂", growth: 0.9, water: 0.88, sky: 0xb6b8a0, sun: 0xf2c18a },
  { id: "winter", name: "Зима", icon: "❄️", growth: 0.58, water: 0.72, sky: 0x9cabbc, sun: 0xd6e5ff }
]);

export const BIOMES = Object.freeze({
  meadow: { id: "meadow", name: "Зелёные луга", icon: "🌿", price: 0, growth: 1, water: 1, soil: 0x80563a, terrain: 0x719b55 },
  desert: { id: "desert", name: "Пустыня", icon: "🏜️", price: 120, growth: 0.9, water: 1.7, soil: 0xb8874d, terrain: 0xc5a166 },
  mountain: { id: "mountain", name: "Горы", icon: "⛰️", price: 160, growth: 0.92, water: 0.9, soil: 0x777b78, terrain: 0x7f8b86 },
  snow: { id: "snow", name: "Снежная долина", icon: "❄️", price: 190, growth: 0.78, water: 0.72, soil: 0xb4c5cb, terrain: 0xc6d7df },
  tropical: { id: "tropical", name: "Тропики", icon: "🌴", price: 220, growth: 1.16, water: 1.28, soil: 0x72543a, terrain: 0x4e8c68 }
});

export const LAND_PARCELS = Object.freeze({
  desert: { biome: "desert", x: 0, z: -10, size: 8.4, rows: 3, columns: 3 },
  mountain: { biome: "mountain", x: 10, z: 0, size: 8.4, rows: 3, columns: 3 },
  snow: { biome: "snow", x: 0, z: 10, size: 8.4, rows: 3, columns: 3 },
  tropical: { biome: "tropical", x: -10, z: 0, size: 8.4, rows: 3, columns: 3 }
});

export const SEASON_WEATHER = Object.freeze({
  spring: ["sunny", "rain", "sunny", "rain"],
  summer: ["sunny", "sunny", "drought", "sunny"],
  autumn: ["sunny", "rain", "drought", "sunny"],
  winter: ["snow", "sunny", "snow", "snow"]
});

const WEATHER_GROWTH = Object.freeze({ sunny: 1, rain: 1.35, drought: 0.55, snow: 0.35 });

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

export function getEnvironmentEffects(biomeId = "meadow", seasonId = "spring", weatherId = "sunny") {
  const biome = BIOMES[biomeId] || BIOMES.meadow;
  const season = SEASONS.find(item => item.id === seasonId) || SEASONS[0];
  return {
    growth: biome.growth * season.growth * (WEATHER_GROWTH[weatherId] ?? 1),
    water: biome.water * season.water
  };
}

export function waterCostForPlot(biomeId = "meadow", seasonId = "spring") {
  const effects = getEnvironmentEffects(biomeId, seasonId, "sunny");
  return Math.max(1, Math.ceil(effects.water - 1e-9));
}

export function landParcelPlotPositions(biomeId, spacing = 2.4) {
  const parcel = LAND_PARCELS[biomeId];
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
  const biome = BIOMES[biomeId];
  if (!biome || !LAND_PARCELS[biomeId]) return { ok: false, reason: "unknown-land", coins };
  if (ownedBiomes?.has(biomeId)) return { ok: false, reason: "already-owned", coins };
  const cost = mode === "sandbox" ? 0 : biome.price;
  if (coins < cost) return { ok: false, reason: "insufficient-coins", coins, cost };
  return { ok: true, reason: "purchased", coins: coins - cost, cost, biome: biomeId };
}
