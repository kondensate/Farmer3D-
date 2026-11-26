export const CROPS = {
  carrot:      { name:"Морковь", icon:"🥕", color:0xf28a32, leaf:0x5c9c48, growTime:18, price:7, seedCost:2, waterNeed:1, shape:"root" },
  potato:      { name:"Картофель", icon:"🥔", color:0xc49a62, leaf:0x609b4c, growTime:22, price:8, seedCost:2, waterNeed:1, shape:"tuber" },
  tomato:      { name:"Помидор", icon:"🍅", color:0xe64c3d, leaf:0x4d984a, growTime:25, price:12, seedCost:3, waterNeed:2, shape:"tomato" },
  corn:        { name:"Кукуруза", icon:"🌽", color:0xf0c849, leaf:0x4f9141, growTime:30, price:14, seedCost:3, waterNeed:2, shape:"corn" },
  strawberry:  { name:"Клубника", icon:"🍓", color:0xe84a67, leaf:0x579b51, growTime:20, price:13, seedCost:3, waterNeed:2, shape:"berry" },
  eggplant:    { name:"Баклажан", icon:"🍆", color:0x7950a8, leaf:0x5b9148, growTime:32, price:17, seedCost:4, waterNeed:2, shape:"eggplant" },
  cucumber:    { name:"Огурец", icon:"🥒", color:0x4f9c51, leaf:0x4c8e42, growTime:21, price:9, seedCost:2, waterNeed:2, shape:"cucumber" },
  cabbage:     { name:"Капуста", icon:"🥬", color:0x8dbb62, leaf:0x4f8b43, growTime:28, price:11, seedCost:3, waterNeed:2, shape:"cabbage" },
  pumpkin:     { name:"Тыква", icon:"🎃", color:0xe98b32, leaf:0x578d43, growTime:36, price:20, seedCost:5, waterNeed:3, shape:"pumpkin" },
  sunflower:   { name:"Подсолнечник", icon:"🌻", color:0xeebc39, leaf:0x538d43, growTime:34, price:16, seedCost:4, waterNeed:1, shape:"sunflower" }
};

export const ROBOT_TYPES = {
  farmbot:   {name:"FarmBot Basic", icon:"🤖", color:0x39899e, speed:1.0, energy:100, water:5, role:"Универсальный фермер"},
  waterbot:  {name:"WaterBot", icon:"💧", color:0x3c9bd1, speed:0.9, energy:120, water:14, role:"Полив и контроль влажности"},
  harvestbot:{name:"HarvestBot", icon:"📦", color:0xd59a3f, speed:1.25, energy:115, water:2, role:"Сбор и доставка урожая"},
  dronebot:  {name:"DroneBot", icon:"🚁", color:0x9472c4, speed:1.5, energy:90, water:0, role:"Сканирование и наблюдение"}
};

export const MISSIONS = [
  ["first_seed","Первые всходы","Посади первую культуру","planted",1,10],
  ["first_water","Капля жизни","Полей первую грядку","watered",1,10],
  ["first_harvest","Первый урожай","Собери первый урожай","harvested",1,15],
  ["sell_5","Торговец","Продай урожай на 5 монет","sales",5,15],
  ["plant_5","Маленькая плантация","Посади 5 растений","planted",5,20],
  ["harvest_5","Сборщик","Собери 5 растений","harvested",5,25],
  ["tomato","Красный урожай","Вырасти помидор","tomatoHarvested",1,20],
  ["corn","Золотое поле","Вырасти кукурузу","cornHarvested",1,25],
  ["berries","Ягодный сезон","Собери клубнику","strawberryHarvested",1,25],
  ["diverse_3","Разнообразие","Вырасти 3 разных культуры","cropTypes",3,30],
  ["water_10","Водный цикл","Полей 10 грядок","watered",10,30],
  ["program_1","Первая программа","Запусти программу робота","programs",1,20],
  ["program_5","Алгоритмист","Запусти 5 программ","programs",5,35],
  ["steps_20","Первые маршруты","Пройди 20 клеток программно","tilesMoved",20,30],
  ["coins_50","Капитал","Получи 50 монет от продажи урожая","sales",50,35],
  ["pumpkin","Тыквенный гигант","Собери тыкву","pumpkinHarvested",1,40],
  ["sunflower","Солнечный цветок","Собери подсолнечник","sunflowerHarvested",1,35],
  ["potato","Картофельный запас","Собери картофель","potatoHarvested",1,25],
  ["cabbage","Зелёная голова","Собери капусту","cabbageHarvested",1,30],
  ["eggplant","Фиолетовый урожай","Собери баклажан","eggplantHarvested",1,35],
  ["cucumber","Зелёный хруст","Собери огурец","cucumberHarvested",1,25],
  ["stock_20","Полный амбар","Собери всего 20 растений","harvested",20,50],
  ["robot_water","Водная команда","Купи WaterBot","robots",2,45],
  ["robot_harvest","Бригада сбора","Купи HarvestBot","robots",3,50],
  ["robot_drone","Глаз сверху","Купи DroneBot","robots",4,60],
  ["two_programs","Параллельная ферма","Запусти программы двух разных роботов","botsProgrammed",2,60],
  ["water_saver","Экономия воды","Собери 5 культур, политых дождём или насосом","waterEfficiency",5,50],
  ["all_crops","Ботаник","Собери 5 разных видов культур","cropTypes",5,60],
  ["coins_150","Фермерский бизнес","Получи 150 монет от продажи урожая","sales",150,75],
  ["automated","Умная ферма","Выполни 30 действий программой","programActions",30,100]
].map(([id,title,description,stat,target,reward], index)=>({id,title,description,stat,target,reward,order:index+1}));

// FarmerBot 2.1: placeable farm infrastructure and research unlocks.
export const BUILDINGS = {
  greenhouse: { name:"Теплица", icon:"🏡", cost:70, width:2.9, depth:2.7, unlock:"horticulture", description:"Ускоряет рост культур рядом на 35%", effect:"growth" },
  tank: { name:"Водный резервуар", icon:"🛢️", cost:45, width:1.8, depth:1.8, unlock:"waterworks", description:"Увеличивает запас воды фермы на 30", effect:"water" },
  conveyor: { name:"Конвейер", icon:"🟫", cost:80, width:2.5, depth:1.15, unlock:"logistics", description:"Автоматически собирает зрелые растения рядом", effect:"harvest" },
  charger: { name:"Зарядная станция", icon:"⚡", cost:65, width:2, depth:2, unlock:"energy", description:"Заряжает роботов поблизости", effect:"charge" },
  robot_station: { name:"Робостанция", icon:"🤖", cost:110, width:2.6, depth:2.3, unlock:"robotics", description:"Обслуживает роботов и ускоряет восстановление", effect:"service", powerNode:true, powerRole:"consumer", powerDemand:6, powerPriority:3 },
  solar_generator: { name:"Солнечный генератор", icon:"☀️", cost:95, width:2.2, depth:1.8, unlock:"energy", description:"Вырабатывает до 10 единиц энергии в секунду", effect:"generation", powerNode:true, powerRole:"generator", powerOutput:10 },
  wind_generator: { name:"Ветрогенератор", icon:"🌬️", cost:115, width:1.8, depth:1.8, unlock:"energy", description:"Вырабатывает до 8 единиц энергии в секунду", effect:"generation", powerNode:true, powerRole:"generator", powerOutput:8 },
  battery: { name:"Аккумулятор", icon:"🔋", cost:80, width:1.4, depth:1.4, unlock:"energy", description:"Накапливает до 100 единиц энергии для ночи и дефицита", effect:"storage", powerNode:true, powerRole:"battery", batteryCapacity:100 },
  power_pole: { name:"Опора ЛЭП", icon:"🔌", cost:18, width:.65, depth:.65, unlock:"energy", description:"Узел для подключения силовых кабелей", effect:"service", powerNode:true, powerRole:"node" },
  conveyor_splitter: { name:"Разветвитель", icon:"🔀", cost:65, width:1.6, depth:1.4, unlock:"logistics", description:"Направляет поток по выходам по очереди", effect:"logistics", logisticsNode:true, powerNode:true, powerRole:"consumer", powerDemand:.8 },
  conveyor_filter: { name:"Фильтр конвейера", icon:"🧰", cost:55, width:1.5, depth:1.2, unlock:"logistics", description:"Пропускает выбранную культуру и удерживает остальные", effect:"logistics", logisticsNode:true, powerNode:true, powerRole:"consumer", powerDemand:.8 },
  conveyor_buffer: { name:"Буфер конвейера", icon:"📦", cost:55, width:1.5, depth:1.4, unlock:"logistics", description:"Промежуточный склад на 12 единиц", effect:"logistics", logisticsNode:true, powerNode:true, powerRole:"consumer", powerDemand:.6 },
  conveyor_storage: { name:"Приёмный склад", icon:"🏬", cost:75, width:1.8, depth:1.6, unlock:"logistics", description:"Принимает предметы из транспортной сети", effect:"logistics", logisticsNode:true, powerNode:true, powerRole:"consumer", powerDemand:.6 },
  water_pump: { name:"Электронасос", icon:"💧", cost:75, width:1.6, depth:1.6, unlock:"waterworks", description:"Автоматически поливает свободные от влаги грядки", effect:"water", powerNode:true, powerRole:"consumer", powerDemand:3, powerPriority:2 },
  charger: { name:"Зарядная станция", icon:"⚡", cost:65, width:2, depth:2, unlock:"energy", description:"Заряжает роботов поблизости при подключении к сети", effect:"charge", powerNode:true, powerRole:"consumer", powerDemand:4, powerPriority:3 },
  conveyor: { name:"Конвейер", icon:"🟫", cost:80, width:2.5, depth:1.15, unlock:"logistics", description:"Собирает зрелые растения и передаёт их по связанной сети", effect:"harvest", logisticsNode:true, powerNode:true, powerRole:"consumer", powerDemand:1 }
};

export const TECHNOLOGIES = [
  { id:"horticulture", name:"Умное садоводство", icon:"🌱", costXP:25, costCoins:15, requires:[], unlocks:["greenhouse"], description:"Открывает теплицу и ускоренное выращивание" },
  { id:"waterworks", name:"Водная инфраструктура", icon:"💧", costXP:35, costCoins:20, requires:[], unlocks:["tank"], description:"Открывает резервуары и расширенное водоснабжение" },
  { id:"energy", name:"Энергосистема", icon:"⚡", costXP:40, costCoins:25, requires:[], unlocks:["charger"], description:"Открывает зарядные станции для флота" },
  { id:"logistics", name:"Умная логистика", icon:"📦", costXP:50, costCoins:30, requires:["waterworks"], unlocks:["conveyor"], description:"Открывает автоматические конвейеры" },
  { id:"robotics", name:"Робототехника II", icon:"🤖", costXP:60, costCoins:40, requires:["energy"], unlocks:["robot_station"], description:"Открывает робостанцию для обслуживания флота" }
];
