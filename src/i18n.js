const pairs = {
"Выбор биома":"Choose a biome","НОВАЯ ФЕРМА · ВЫБЕРИ СТАРТОВУЮ ТЕРРИТОРИЮ":"NEW FARM · CHOOSE YOUR STARTING TERRITORY",
"Каждый регион задаёт свой климат, растительность, ресурсы, сложность и условия выращивания. Новые территории будут открываться по мере развития фермы.":"Each region has its own climate, vegetation, resources, difficulty, and growing conditions. New territories unlock as your farm develops.",
"Сохранения Alpha 4:":"Alpha 4 saves:","существующие фермы загружаются без сброса и остаются на зелёных равнинах.":"Existing farms load without a reset and remain on the Green Plains.","Seed мира будет сохранён вместе с фермой.":"The world seed is saved with your farm.",
"Начать новую игру с самого начала?":"Start a completely new game?","Будут удалены все сохранения FARMERBOT: фермы, роботы, программы, монеты, опыт, задания и открытые биомы. После перезапуска ты снова начнёшь с выбора стартового мира. Это действие нельзя отменить.":"All FARMERBOT saves will be deleted: farms, robots, programs, coins, XP, missions, and unlocked biomes. After restarting, you will choose your starting world again. This cannot be undone.",
"ОТМЕНА":"CANCEL","НАЧАТЬ НОВУЮ ИГРУ":"START NEW GAME","МИР":"WORLD","НОВАЯ ИГРА":"NEW GAME","ур.":"LVL",
"Зелёные равнины":"Green Plains","Пустыня":"Desert","Горные территории":"Mountain Lands","Снежный биом":"Snow Biome","Тропические джунгли":"Tropical Jungle","Лесной биом":"Forest Biome","Вулканический биом":"Volcanic Biome","Болота":"Swamplands",
"Мягкий климат, плодородная почва и безопасная стартовая зона.":"Mild climate, fertile soil, and a safe starting area.","Жара, песчаные дюны, редкая вода и солнечная энергия.":"Heat, sand dunes, scarce water, and solar energy.","Высотный рельеф, узкие проходы, карьеры и минеральные жилы.":"High-altitude terrain, narrow passages, quarries, and mineral veins.","Мороз, снежные бури, замерзающая вода и тёплые теплицы.":"Freezing temperatures, snowstorms, frozen water, and heated greenhouses.","Влажные джунгли, сезонные ливни, богатые редкими культурами.":"Humid jungle, seasonal downpours, and rare crops.","Густой лес, поляны, древесина, грибы и необходимость расчистки.":"Dense forest, clearings, timber, mushrooms, and land that needs clearing.","Лавовые потоки, жаркие плато и редкие вулканические минералы.":"Lava flows, hot plateaus, and rare volcanic minerals.","Топкие почвы, туман, камыши, настилы и необычные природные ресурсы.":"Muddy soil, fog, reeds, walkways, and unusual natural resources.",
"Лёгкая":"Easy","Средняя":"Medium","Сложная":"Hard","Очень высокая":"Very high","Предельная":"Extreme","Умеренная":"Moderate","Очень низкая":"Very low","Высокая":"High","Низкая":"Low",
"Стартовая территория":"Starting territory","Текущий мир":"Current world","Сохранённый мир · можно продолжить":"Saved world · continue","Территория открыта":"Territory unlocked","Цена открытия:":"Unlock price:","НАЧАТЬ ФЕРМУ":"START FARM","ПРОДОЛЖИТЬ":"CONTINUE","СОЗДАТЬ МИР":"CREATE WORLD","КУПИТЬ ·":"BUY ·","НЕДОСТАТОЧНО МОНЕТ":"NOT ENOUGH COINS","ЗАКРЫТО":"LOCKED","Культуры:":"Crops:","Ресурсы:":"Resources:",
"Нажимай стрелки: одно нажатие = один шаг на клетку":"Use the arrows: each press moves one tile","Подойди к грядке и нажми ДЕЙСТВИЕ: посади → полей → собери":"Go to a plot and press ACTION: plant → water → harvest",
"ДЕЙСТВИЕ":"ACTION","МАГАЗИН":"SHOP","СЕТЬ":"FLEET","МИССИИ":"MISSIONS","ЗВУК":"SOUND","СТРОЙКА":"BUILD","ТЕХНО":"TECH","КОД":"CODE","Программа робота":"Robot Program",
"Программируй робота на маленьком Python-подобном языке. Поддерживаются переменные, условия, циклы и собственные функции. Отступы внутри блоков обязательны.":"Program your robot with a small Python-like language. Variables, conditions, loops, and custom functions are supported. Indentation inside blocks is required.",
"готов":"ready","строка —":"line —","следующая: —":"next: —","СОХРАНИТЬ":"SAVE","ЗАГРУЗИТЬ":"LOAD","РОБОТ":"ROBOT","СКОРОСТЬ":"SPEED","Номера строк":"Line numbers","Подсказка параметров появится внутри вызова команды.":"Parameter hints will appear inside the command call.","ЗАПУСТИТЬ":"RUN","ПАУЗА":"PAUSE","ШАГ":"STEP","ПРОДОЛЖИТЬ":"RESUME","СТОП":"STOP","СБРОС":"RESET","ПРИМЕР":"EXAMPLE","ПЕРЕМЕННЫЕ":"VARIABLES","Переменные появятся после старта программы.":"Variables will appear after the program starts.","ФУНКЦИИ":"FUNCTIONS","Функции пользователя не объявлены.":"No user functions declared.","РОБОТЫ":"ROBOTS","СТЕК ВЫЗОВОВ":"CALL STACK","Глобальный уровень":"Global scope","СОСТОЯНИЕ ОТЛАДЧИКА":"DEBUGGER STATE","Журнал программы появится здесь.":"Program log will appear here.","Справка по языку":"Language Reference","Действия":"Actions","Условия и датчики":"Conditions & Sensors","Циклы":"Loops","Функции":"Functions",
"Лавка фермера":"Farmer's Shop","Выращивай разные культуры, продавай собранный урожай и покупай семена и оборудование.":"Grow different crops, sell your harvest, and buy seeds and equipment.","КУЛЬТУРА":"CROP","КУПИТЬ СЕМЕНА":"BUY SEEDS","ПРОДАТЬ СОБРАННОЕ":"SELL HARVEST","Состояние флота. У каждого робота собственные координаты, энергия, инвентарь и программа.":"Fleet status. Each robot has its own position, energy, inventory, and program.","ЗАПУСТИТЬ ВСЕ ПРОГРАММЫ":"RUN ALL PROGRAMS","ОСТАНОВИТЬ ВСЕХ":"STOP ALL","ДИСПЕТЧЕР ФЕРМЫ":"FARM DISPATCHER","АВТОДИСПЕТЧЕР":"AUTO DISPATCHER","Энергосеть и очередь задач появятся здесь.":"The power grid and task queue will appear here.","АНГАР РОБОТОВ":"ROBOT HANGAR","МОДУЛИ РОБОТОВ":"ROBOT MODULES","Модули устанавливаются выбранному роботу и сохраняются в мире.":"Modules are installed on the selected robot and saved in this world.","ОБОРУДОВАНИЕ":"EQUIPMENT","СТРОИТЕЛЬСТВО ФЕРМЫ":"FARM CONSTRUCTION","Выбери здание, затем коснись свободного места на поле. Перемещение и удаление построек доступны ниже.":"Choose a building, then tap an empty spot on the field. Move and remove buildings using the controls below.","Выбери объект для размещения.":"Choose an object to place.","МИР И БИОМЫ":"WORLD & BIOMES","Стартовая территория задаётся при создании мира. Новые регионы открываются за опыт и прогресс фермы.":"Your starting territory is chosen when creating a world. New regions unlock through XP and farm progress.","Материалы пока не собраны":"No materials collected yet","ПОВЕРНУТЬ":"ROTATE","ПОСТРОЙКИ НА ФЕРМЕ":"FARM BUILDINGS","ДЕРЕВО ТЕХНОЛОГИЙ":"TECH TREE","Исследования тратят очки науки и монеты, открывая новые здания и возможности.":"Research uses science points and coins to unlock new buildings and abilities.","МИССИИ ФЕРМЫ":"FARM MISSIONS","Выполняй задания, чтобы получать монеты и опыт. Прогресс сохраняется.":"Complete tasks to earn coins and XP. Progress is saved.","РЕЖИМ":"MODE","миссии":"missions","ресурсы без ограничений":"unlimited resources","испытания":"challenges","свободная ферма":"free farm","Режим кампании: выполняй последовательные миссии.":"Campaign mode: complete missions in sequence.",
"Весна":"Spring","Лето":"Summer","Осень":"Autumn","Зима":"Winter","Ясно":"Clear","Облачно":"Cloudy","Дождь":"Rain","Снег":"Snow","Древесина":"Timber","Камень":"Stone","Чистая вода":"Clean Water","Песок":"Sand","Редкий минерал":"Rare Mineral","Подземная вода":"Groundwater","Железная руда":"Iron Ore","Медная руда":"Copper Ore","Пресная вода":"Fresh Water","Лёд":"Ice","Кристалл":"Crystal","Тропические плоды":"Tropical Fruit","Каучук":"Rubber","Дождевая вода":"Rainwater","Грибы":"Mushrooms","Лесные ягоды":"Forest Berries","Обсидиан":"Obsidian","Сера":"Sulfur","Вулканический минерал":"Volcanic Mineral","Торф":"Peat","Лекарственные травы":"Medicinal Herbs","Глина":"Clay","Болотный газ":"Swamp Gas",
"Морковь":"Carrot","Картофель":"Potato","Помидор":"Tomato","Кукуруза":"Corn","Клубника":"Strawberry","Баклажан":"Eggplant","Огурец":"Cucumber","Капуста":"Cabbage","Тыква":"Pumpkin","Подсолнечник":"Sunflower","Банан":"Banana","Ананас":"Pineapple","Кокос":"Coconut","Какао":"Cocoa","Кофе":"Coffee","Манго":"Mango","Плод кактуса":"Cactus Fruit","Вулканическая трава":"Volcanic Grass","Клюква":"Cranberry","Рис":"Rice","Лесной гриб":"Forest Mushroom"
};
const toEnglish = new Map(Object.entries(pairs));
const toRussian = new Map(Object.entries(pairs).map(([ru,en])=>[en,ru]));
let language = localStorage.getItem('farmerbot_language') || 'ru';
let observer;
function convert(value, target) {
  const dict = target === 'en' ? toEnglish : toRussian;
  const trimmed = value.trim();
  if (dict.has(trimmed)) return value.replace(trimmed, dict.get(trimmed));
  // Translate common dynamic status fragments while preserving numbers and names.
  if (target === 'en') {
    const patterns = [
      [/^Нужно (.+) монет$/, 'Need $1 coins'],
      [/^Нужно ещё (.+) монет$/, 'Need $1 more coins'],
      [/^Нужно (.+) XP и (.+) урожаев$/, 'Need $1 XP and $2 harvests'],
      [/^Цена открытия: (.+)$/, 'Unlock price: $1'],
      [/^Куплено 5 семян: (.+)$/, 'Bought 5 seeds: $1'],
      [/^Продано (.+) ед\. урожая · \+(.+)$/, 'Sold $1 crops · +$2'],
      [/^урожай (.+)$/, 'harvest $1'],
      [/^Собран ресурс: (.+)$/, 'Resource collected: $1']
    ];
    for (const [pattern, replacement] of patterns) if (pattern.test(trimmed)) return value.replace(trimmed, trimmed.replace(pattern, replacement));
  }
  return value;
}
function translateNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const next = convert(node.nodeValue, language);
    if (next !== node.nodeValue) node.nodeValue = next;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.id === 'languageToggle' || node.closest?.('#languageToggle')) return;
  for (const attr of ['placeholder','title','aria-label']) {
    if (node.hasAttribute?.(attr)) {
      const next = convert(node.getAttribute(attr), language);
      if (next !== node.getAttribute(attr)) node.setAttribute(attr, next);
    }
  }
  node.childNodes.forEach(translateNode);
}
function applyLanguage() {
  document.documentElement.lang = language === 'en' ? 'en' : 'ru';
  translateNode(document.body);
  const button = document.getElementById('languageToggle');
  if (button) { button.textContent = language === 'en' ? 'RU' : 'EN'; button.setAttribute('aria-label', language === 'en' ? 'Switch to Russian' : 'Switch to English'); }
}
export function initLanguageToggle() {
  const button = document.getElementById('languageToggle');
  if (!button) return;
  button.addEventListener('click', () => {
    language = language === 'ru' ? 'en' : 'ru';
    localStorage.setItem('farmerbot_language', language);
    applyLanguage();
  });
  applyLanguage();
  observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') translateNode(record.target);
      record.addedNodes?.forEach(translateNode);
    }
  });
  observer.observe(document.body, {subtree:true,childList:true,characterData:true});
}
