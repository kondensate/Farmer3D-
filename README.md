# FarmerBot 2.1 — Smart Farm Upgrade

**Milestone:** 2.1 Alpha 1 · Three.js + ES modules · GitHub Pages compatible

FarmerBot 2.1 extends the existing FarmerBot 2.0 repository in place. It keeps the original farm loop, four robot roles, 10 crops, safe Python-like interpreter, mission progress and the v2/v3 save migration path.

## 2.1 features added

- **Placeable construction:** greenhouse, water tank, conveyor, charger and robot service station. Select a building, tap a location in the 3D field, rotate it, move it later or delete it. Placement checks field bounds, other buildings and robot positions.
- **Functional infrastructure:** greenhouses increase nearby crop growth speed; water tanks extend the farm water capacity; conveyors automatically collect ripe crops into the warehouse; charging/service pads restore nearby robot energy. Existing pump, solar and warehouse equipment remains supported.
- **Research tree:** five technologies with XP/coin costs and prerequisites unlock the new building categories. Research progress is saved. Sandbox exposes all construction without costs.
- **A* navigation:** robots route around occupied building cells and other ground robots. Manual arrow movement, `move(n)` and return-to-base now use the route planner. `go_to_plot("ready")`, `go_to_plot("empty")` and `go_to_plot("thirsty")` find a suitable plot and navigate to it.
- **Interpreter debugger controls:** current source line indicator plus pause, single-step, resume and stop controls. The safe interpreter still uses its own parser and evaluator; it does not use `eval()` or `Function()`.
- **Distinct mode rules:** CAMPAIGN runs mission rewards; SANDBOX gives free building, seed and technology access; CHALLENGES starts a limited 180-second, 5-harvest task; FREE PLAY keeps the economy but disables campaign mission rewards.
- **Save v4:** preserves v2/v3 loading and adds buildings, technology unlocks, challenge state and research points. Older saves are migrated forward automatically.

## Project structure

```text
index.html
src/
  main.js          # Three.js world, simulation, UI and save integration
  language.js      # safe Python-like parser/interpreter and debugger hooks
  data.js          # crops, robots, missions, buildings and technologies
  navigation.js    # grid conversions, occupancy and A* pathfinding
programs/          # four example robot programs
tests/             # interpreter, catalog, UI contract and navigation tests
backup_original/   # original project files from the first programming edition
```

## Run on GitHub Pages

The entry point is `index.html` in the repository root. No build step is required. Three.js is loaded from jsDelivr, so the page requires HTTPS and an internet connection.

## Run tests

Use Node.js 18+:

```bash
npm test
```

Syntax checks:

```bash
node --check src/main.js
node --check src/language.js
node --check src/data.js
node --check src/navigation.js
```

## Controls

- Arrow buttons move the selected robot one cell; the route planner avoids buildings and other robots.
- **СТРОЙКА:** choose a building, tap the field to place it, rotate or cancel; existing buildings can be moved or deleted.
- **ТЕХНО:** spend research points and coins to unlock construction categories.
- **КОД:** per-robot program editor with current line, pause, single-step, continue and stop.
- `go_to_plot("ready")` finds the nearest reachable plot with ripe crops. `go_to_plot("thirsty")` finds a crop waiting for water.
- **СЕТЬ:** inspect and run/stop robots independently or as a fleet.

## Scope and validation

This is **FarmerBot 2.1 Alpha 1**, a substantial functional milestone, not yet the full 2.1 vision. It does not yet include all requested biom/season systems, a full pipe/power graph, conveyor networks with multi-segment routing, multiple challenge scenarios, a breakpoint system, syntax colouring/autocomplete, or a complete campaign chapter map. The 3D build has automated Node tests and static checks; the final deployment still requires a real Safari/iPad playthrough to validate touch placement and WebGL performance on the target device.
