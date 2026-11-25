# FarmerBot 2.0 — Smart Farm

**Milestone:** 2.0 Alpha 1 · Three.js + ES modules · GitHub Pages ready

FarmerBot 2.0 extends the existing FarmerBot 3D project. It keeps the original Three.js world, manual tile movement, crop plots, store, local progress and safe Python-like interpreter.

## What's implemented in this milestone

- 10 crop types with their own procedural 3D silhouettes, seed stock, grow durations and sale prices.
- Planting, watering, staged growth, weather-modified growth, harvesting into robot cargo and unloading at the base.
- 4 robot roles: FarmBot Basic, WaterBot, HarvestBot and DroneBot. Additional robots are purchased in the robot hangar.
- Separate energy, cargo, movement speed and saved program per robot.
- Independent asynchronous program execution and stop requests; network panel can run/stop the fleet.
- Collision checks and map bounds for robot movement.
- New safe DSL actions and sensors: `scan`, `refill_water`, `return_to_base`, `sleep`, `get_energy`, `get_position`, `get_inventory`, `get_plant_age`.
- Legacy uppercase DSL remains supported.
- A 30-mission progress/reward system, XP and farm levels.
- Weather cycle (sunny/rain/drought), day/night lighting, functional irrigation pump, solar charging pad and storage upgrade.
- Smart Farm Network panel with robot positions, energy, status and cargo.
- Camera orbit by dragging and zoom by mouse wheel/trackpad.
- Save format v3, with migration from the original `farmerbot3d_save_v2`.
- Automated tests for the interpreter, all shipped robot programs, crop/robot/mission catalogs and HTML-to-JavaScript UI selectors (12 tests).

## Project structure

```text
index.html
src/
  main.js          # Three.js world, controls, farm simulation, game UI integration
  language.js      # safe indentation-based DSL parser and interpreter
  data.js          # crop catalog, robot types and 30 missions
programs/
  farmbot_smart_row.bot
  waterbot_auto_irrigation.bot
  harvestbot_collect.bot
  dronebot_scan.bot
tests/
  language.test.mjs
backup_original/
  index.html
  main.js
  language.js
РУКОВОДСТВО_ПО_ЯЗЫКУ.md
ROADMAP.md
```

## GitHub Pages deployment

Upload the contents of this folder to the **root** of the `main` branch while preserving folder structure. The site entry is `index.html`. No bundler or npm install is required. The page loads Three.js from jsDelivr, so deployment requires HTTPS and an internet connection.

Required:
- `index.html`
- `src/main.js`
- `src/language.js`
- `src/data.js`

Keep `programs/`, `tests/`, `README.md`, `ROADMAP.md` and `backup_original/` for examples, testing and recovery; they are not required for the browser to start.

## Run tests locally

Use Node.js 18+:

```bash
npm test
```

The browser build has no build step. The tests only cover the DSL/interpreter; they are not a substitute for a full Safari/Chrome gameplay test.

## Controls

- Tap an arrow once to move the selected robot one tile.
- Select a robot in the code editor's robot selector, or choose **🤖 СЕТЬ** to inspect the fleet.
- Program each robot separately and use ▶ to run it.
- In Smart Farm Network, ▶ / ■ control individual robots; the panel also has Run All / Stop All.
- Drag on the 3D canvas to orbit; pinch with two fingers on iPad or use the mouse wheel/trackpad to zoom.
- Choose a seed in the shop; buy more seed packs there.
- Robot cargo is unloaded at base by calling `return_to_base()`. Then sell warehouse stock in the shop.

## Important current scope

This is an alpha vertical slice, not yet the complete vision in the long specification. Research tree, conveyor logistics, full building placement grid, seasons/biomes, IndexedDB save backend, editor syntax colouring/autocomplete, step debugger/breakpoints and a full campaign mode still need later milestones. See `ROADMAP.md`.

## Validation status

- `node --check` passes for `src/main.js`, `src/language.js` and `src/data.js`.
- `npm test` passes all 12 automated tests.
- A full Safari-on-iPad playthrough has not yet been performed. A headless Chromium smoke test was attempted in the build environment but the browser process crashed before it could render the page.
