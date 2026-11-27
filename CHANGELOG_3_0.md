# FarmerBot 3.0 — Biomes Update Alpha 6

## Stage 1 — фундамент биомов и выбор нового мира

- Добавлен единый каталог восьми территорий: зелёные равнины, пустыня, горы, снег, тропические джунгли, лес, вулкан и болота.
- Для каждого биома описаны климат, влажность, сезонные коэффициенты, растительность, ресурсы, культуры, природные препятствия, погодные типы и строительные специализации.
- Для новой фермы появился отдельный адаптивный экран выбора стартового биома с уровнем сложности, климатом, ресурсами и условиями открытия.
- Биомы кампании открываются по XP и собранному урожаю.
- Добавлена детерминированная генерация карты по seed: высотные данные, безопасная стартовая зона, 25 стартовых грядок, природные объекты, ресурсы и гарантированный набор начальных ресурсов/маршрут.
- Климатический профиль выбранного биома влияет на сезонные коэффициенты роста, расход воды, солнечную генерацию и погодный выбор.
- Save v7 хранит выбранный биом, seed и доступные биомы. Загрузка и миграция v2–v7 сохранены; существующие фермы остаются на зелёных равнинах, старые купленные участки восстанавливаются по прежней схеме.
- Старые системы роботов, IDE/DSL, постройки, электросеть, конвейеры, миссии и инвентари сохранены.

## Границы Alpha 5

Alpha 5 — базовый этап архитектуры биомов, а не завершённая реализация всех восьми игровых регионов. Высотный pathfinding, добыча ресурсов, региональные миссии, специальные здания/модули роботов, полноценные отдельные сохранённые миры и визуальные эффекты погоды запланированы на следующие этапы.


## Stage 2 foundation — terrain and resources

- Mountain and other terrain height samples are now rendered as a low-poly Three.js surface rather than remaining only metadata.
- The starter farm and its safe approach route remain flat and obstacle-free.
- Robot A* routes include slope costs, step-height limits and generated natural-obstacle cells. Building placement rejects steep ground and resource/obstacle cells.
- Biome resource deposits are now collectible in the field. Materials enter robot inventory, are deposited into a separate resource store at base, and their remaining deposit amounts are saved with the generated seed.
