# FarmerBot 3D — Programmer Edition

## Файлы проекта

- `index.html` — игровая страница и интерфейс.
- `src/main.js` — 3D-мир, робот, ферма, управление, магазин и соединение редактора с игрой.
- `src/language.js` — отдельный интерпретатор языка робота: разбор отступов, выражений, переменных, условий, циклов и функций.
- `programs/` — готовые примеры программ робота (`.bot`).\n- `package.json` — метаданные проекта для локальной разработки. Для GitHub Pages сборка не нужна.

## Запуск на GitHub Pages

Загрузи в корень репозитория `index.html`, папку `src/` целиком и `package.json`. В настройках GitHub Pages выбери `main` и `/ (root)`. Игра использует Three.js с CDN, поэтому для её открытия нужен интернет и HTTPS.

## Язык робота

Команды:
```python
move(1)
turn_left()
turn_right()
plant()
water()
harvest()
wait(2)
```

Переменные, математика, сравнения и логика:
```python
rounds = 3
rounds = rounds + 1
if get_water() > 0 and can_water():
    water()
```

Циклы:
```python
for i in range(4):
    move(1)

while can_harvest():
    harvest()
```

Функции:
```python
def take_care():
    if can_plant():
        plant()
    elif can_water():
        water()
    elif can_harvest():
        harvest()

take_care()
```

Датчики:
- `can_harvest()` — ближайшая грядка готова к сбору.
- `can_plant()` — ближайшая грядка пуста.
- `can_water()` — ближайшую грядку можно полить и есть вода.
- `is_ready()` — урожай на ближайшей грядке созрел.
- `get_water()`, `get_coins()`, `get_harvest()` — ресурсы.
- `tile_state()` — `empty`, `seed`, `growing`, `ready` или `none`.
- `count_ready()`, `count_empty()` — количество готовых и пустых грядок.
- `front_is_clear()` — впереди не граница игрового поля.
- `at_plot()`, `distance_to_plot()` — проверка и расстояние до ближайшей грядки.
- `has_water()` — есть ли запас воды.

Дополнительно: `range`, `abs`, `min`, `max`, `floor`, `ceil`, `round`, `print`, `break`, `continue`, `return`, комментарии `#`. Для безопасности интерпретатор не использует `eval` и ограничивает число выполняемых шагов.
