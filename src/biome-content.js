// Data-driven regional content for the eight playable worlds.
// Regional buildings are only placeable in their native biome and keep their
// effects in the existing simulation loop (no separate world implementation).
export const BIOME_BUILDINGS = {
  meadow_granary: { name:"Зерновой амбар", icon:"🌾", cost:85, width:2.4, depth:2.2, unlock:"horticulture", biome:"meadow", description:"Увеличивает запас воды фермы на 12 и хранит урожайный резерв", effect:"storage", waterCapacityBonus:12 },
  desert_dew_collector: { name:"Сборщик росы", icon:"💧", cost:105, width:2, depth:2, unlock:"waterworks", biome:"desert", description:"Медленно собирает воду даже в засушливом климате: +0.16 воды/с", effect:"water", waterProduction:0.16 },
  mountain_ore_processor: { name:"Рудный обогатитель", icon:"⛏️", cost:145, width:2.8, depth:2.5, unlock:"robotics", biome:"mountain", description:"Региональный промышленный модуль; работает как узел энергосети", effect:"generation", powerNode:true, powerRole:"generator", powerOutput:5 },
  snow_igloo_greenhouse: { name:"Полярная оранжерея", icon:"❄️", cost:130, width:2.8, depth:2.5, unlock:"horticulture", biome:"snow", description:"Ускоряет рост культур поблизости на 45%, особенно полезна зимой", effect:"growth", growthMultiplier:1.45, effectRadius:5.2 },
  tropical_rain_collector: { name:"Тропический водосборник", icon:"🌧️", cost:120, width:2.4, depth:2.2, unlock:"waterworks", biome:"tropical", description:"Собирает дождевую влагу: +0.22 воды/с", effect:"water", waterProduction:0.22 },
  forest_nursery: { name:"Лесной питомник", icon:"🌳", cost:115, width:2.5, depth:2.3, unlock:"horticulture", biome:"forest", description:"Ускоряет рост лесных культур поблизости на 30%", effect:"growth", growthMultiplier:1.3, effectRadius:5 },
  volcanic_geothermal: { name:"Геотермальный генератор", icon:"🌋", cost:175, width:2.5, depth:2.5, unlock:"energy", biome:"volcanic", description:"Вырабатывает 14 энергии/с за счёт геотермального тепла", effect:"generation", powerNode:true, powerRole:"generator", powerOutput:14 },
  swamp_biofilter: { name:"Болотный биофильтр", icon:"🪷", cost:135, width:2.2, depth:2.2, unlock:"waterworks", biome:"swamp", description:"Очищает и накапливает воду: +0.18 воды/с и +8 к запасу", effect:"water", waterProduction:0.18, waterCapacityBonus:8 }
};

export const BIOME_MISSIONS = [
  { id:"build_meadow_granary", title:"Амбар на равнине", description:"Построй зерновой амбар в биоме равнин", stat:"", target:1, reward:35, order:101, biome:"meadow", buildingType:"meadow_granary" },
  { id:"build_desert_collector", title:"Вода среди песков", description:"Построй сборщик росы в пустыне", stat:"", target:1, reward:55, order:102, biome:"desert", buildingType:"desert_dew_collector" },
  { id:"build_mountain_processor", title:"Сила гор", description:"Построй рудный обогатитель в горах", stat:"", target:1, reward:65, order:103, biome:"mountain", buildingType:"mountain_ore_processor" },
  { id:"build_snow_greenhouse", title:"Тепло среди льдов", description:"Построй полярную оранжерею в снежном биоме", stat:"", target:1, reward:65, order:104, biome:"snow", buildingType:"snow_igloo_greenhouse" },
  { id:"build_tropical_collector", title:"Ловец тропических дождей", description:"Построй тропический водосборник", stat:"", target:1, reward:60, order:105, biome:"tropical", buildingType:"tropical_rain_collector" },
  { id:"build_forest_nursery", title:"Лесное возрождение", description:"Построй лесной питомник", stat:"", target:1, reward:50, order:106, biome:"forest", buildingType:"forest_nursery" },
  { id:"build_volcanic_generator", title:"Энергия недр", description:"Построй геотермальный генератор у вулкана", stat:"", target:1, reward:90, order:107, biome:"volcanic", buildingType:"volcanic_geothermal" },
  { id:"build_swamp_filter", title:"Чистая вода болот", description:"Построй болотный биофильтр", stat:"", target:1, reward:70, order:108, biome:"swamp", buildingType:"swamp_biofilter" }
];

export function isBiomeContentAvailable(item, activeBiome) {
  return !item?.biome || item.biome === activeBiome;
}
