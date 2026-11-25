# FarmerBot 2.1 development roadmap

## Alpha 1 — implemented

- In-place upgrade of the existing FarmerBot 2.0 codebase and preserved crop, robot, mission and legacy-save behavior.
- Placeable greenhouse, water tank, conveyor, charger and robot station with placement validation, rotation, relocation, deletion and persistence.
- Functional building effects: local crop growth boost, increased water capacity, automatic nearby ripe-crop collection and robot energy servicing.
- Five-node technology tree with research points, coin costs and prerequisites.
- Grid A* pathfinding integrated into manual movement, `move(n)`, plot-seeking and return-to-base.
- Safe interpreter debugger hooks, current-line status, pause, single-step, resume and stop.
- Four distinct mode rules: campaign rewards, free sandbox construction, timed challenge and free-play economy.
- Save v4 with fallback migration from v3 and v2.
- Node tests for catalogs, UI contract, interpreter debugger hooks and A* routing.

## Alpha 2 — next priorities

1. Add editable build footprints and grid snapping with placement preview collision coloring on Safari and tablets.
2. Add multi-segment conveyors with directional ports, transfer queues and warehouse input/output rules.
3. Add real water/power network graphs: pipes, pumps, reservoirs, solar generation and shared charging.
4. Add route reservations and cooperative traffic management for multiple robots, including deadlock recovery.
5. Add syntax highlighting, autocomplete, breakpoints, variable inspection and a robust pause/step debugger panel.
6. Add more challenge scenarios, scoring, medals and campaign chapter progression.

## Beta — simulation depth

1. Biomes (green, desert, mountain, snow, tropical), seasons, temperature and crop-specific conditions.
2. More crop varieties and crop disease/soil fertility systems.
3. Robot upgrades, battery models, cargo filters, task boards and cooperative logistics.
4. Production lines: plot → robot cargo → conveyor network → warehouse → market.
5. Persistent IndexedDB save slots, backup export/import and automated migration tests.

## Release candidate — polish

1. Instancing/batching and adaptive graphics settings for low-power mobile devices.
2. Safari iPad and mid-range Android performance profiling.
3. Gameplay tests for planting, watering, crop growth, harvesting, sales, construction, research, routefinding, modes and save/load.
4. Tutorial flow, accessible controls, localization review and balance pass.

## Known Alpha 1 limitations

- Building placement uses a snapped world grid; it is not yet a full editor with a placement ghost grid overlay and all rotated collider edge cases.
- Conveyors automatically collect a ready plot within local range; they are not yet multi-piece transport networks.
- The water tank expands the farm's shared water capacity, but pipes and network flow are not implemented.
- Charging pads restore nearby robots; a shared electrical grid and power generation simulation are still planned.
- A* routes individual robot moves around buildings and other robots; there are no time-reserved paths or deadlock coordinator.
- The debugger highlights the current line and supports pause/single-step/resume; variable watch, breakpoints and syntax colouring remain planned.
- Challenges currently has one timed harvest scenario.
- Full biome, seasonal and campaign chapter systems remain future work.
