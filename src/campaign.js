// Sequential story campaign. Every objective maps to live simulation state.
export const CAMPAIGN_CHAPTERS = Object.freeze([
  { id: "first_farm", title: "Первая ферма", story: "Инженерная станция передала тебе участок и старый FarmBot. Подготовь первые грядки.", objective: "Посади 3 культуры", metric: "planted", target: 3, rewardCoins: 20, rewardXP: 15 },
  { id: "first_program", title: "Программирование", story: "Ручная работа не масштабируется. Напиши и запусти первую программу робота.", objective: "Запусти программу робота", metric: "programs", target: 1, rewardCoins: 25, rewardXP: 20 },
  { id: "robot_team", title: "Команда роботов", story: "Ферма растёт. Купи второго робота и раздели работу между специалистами.", objective: "Собери команду из 2 роботов", metric: "robots", target: 2, rewardCoins: 30, rewardXP: 25 },
  { id: "irrigation", title: "Автоматическое орошение", story: "Летняя жара высушивает почву. Настрой полив и увлажни пять грядок.", objective: "Полей 5 грядок", metric: "watered", target: 5, rewardCoins: 35, rewardXP: 25 },
  { id: "farm_infrastructure", title: "Инфраструктура", story: "Построй рабочую базу, чтобы поддержать растущую команду.", objective: "Размести 2 здания", metric: "buildings", target: 2, rewardCoins: 40, rewardXP: 30 },
  { id: "power", title: "Энергетика", story: "Подключи источник и потребителя, чтобы ферма могла работать без ручного обслуживания.", objective: "Создай соединение электросети", metric: "powerLinks", target: 1, rewardCoins: 45, rewardXP: 35 },
  { id: "logistics", title: "Логистика", story: "Урожай должен сам попадать на склад. Проведи первые товары по конвейерам.", objective: "Доставь 3 единицы конвейером", metric: "conveyorItemsDelivered", target: 3, rewardCoins: 50, rewardXP: 40 },
  { id: "desert", title: "Оазис в песках", story: "Станция разведки обнаружила пустынный участок. Открой его и подготовься к дефициту воды.", objective: "Открой пустыню", metric: "biome:desert", target: 1, rewardCoins: 55, rewardXP: 40 },
  { id: "mountains", title: "Горные территории", story: "В горах найдены рудные залежи. Открой регион и изучи его сложный рельеф.", objective: "Открой горы", metric: "biome:mountain", target: 1, rewardCoins: 60, rewardXP: 45 },
  { id: "tropics", title: "Тропический рубеж", story: "Влажные джунгли дают новые культуры и редкие ресурсы. Открой тропическую зону.", objective: "Открой тропики", metric: "biome:tropical", target: 1, rewardCoins: 65, rewardXP: 50 },
  { id: "research", title: "Научный комплекс", story: "Подготовь технологическую базу следующего поколения: изучи две технологии.", objective: "Изучи 2 технологии", metric: "researches", target: 2, rewardCoins: 75, rewardXP: 55 },
  { id: "agrocomplex", title: "Большой агрокомплекс", story: "Объедини фермы, роботов и производство в устойчивую хозяйственную систему.", objective: "Получи 100 монет от продаж", metric: "sales", target: 100, rewardCoins: 150, rewardXP: 100 }
]);

export function getCampaignProgress(chapterIndex, state = {}) {
  const index = Math.max(0, Math.min(CAMPAIGN_CHAPTERS.length, Math.floor(Number(chapterIndex) || 0)));
  if (index >= CAMPAIGN_CHAPTERS.length) return { complete: true, chapter: null, progress: 1, target: 1, value: 1 };
  const chapter = CAMPAIGN_CHAPTERS[index];
  let value;
  if (chapter.metric === "buildings") value = Array.isArray(state.buildings) ? state.buildings.length : 0;
  else if (chapter.metric === "powerLinks") value = Array.isArray(state.powerLinks) ? state.powerLinks.length : 0;
  else if (chapter.metric === "researches") value = Array.isArray(state.researchedTechs) ? state.researchedTechs.length : 0;
  else if (chapter.metric.startsWith("biome:")) value = state.unlockedBiomes?.has?.(chapter.metric.slice(6)) ? 1 : 0;
  else value = Number(state.metrics?.[chapter.metric]) || 0;
  return { complete: value >= chapter.target, chapter, progress: Math.min(value, chapter.target), target: chapter.target, value };
}
