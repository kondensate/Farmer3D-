# FarmerBot 2.1 Alpha 1

This release extends the existing FarmerBot 2.0 project in place.

## Added
- Placeable greenhouse, water tank, conveyor, charger and robot service station.
- Rotate, move, cancel and delete construction with placement validation.
- Functional effects for crop growth, water capacity, automatic crop collection and robot charging.
- Five research technologies with prerequisites, XP/coin costs and save persistence.
- Grid A* pathfinding for manual movement, `move(n)`, plot seeking and return-to-base.
- `go_to_plot("ready")`, `go_to_plot("empty")`, `go_to_plot("thirsty")` and matching plot sensors.
- Current-line status, pause, single-step, resume and stop controls for robot programs.
- Mode rules for campaign, sandbox, timed challenges and free play.
- Save v4 with v2/v3 fallback migration.

## Validation
- JavaScript syntax checks for all runtime modules.
- Automated Node test suite: 22 tests passing.
- Safe interpreter source does not use `eval()` or `Function()`.

## Known limitations
This is an alpha milestone, not the complete 2.1 specification. Multi-segment conveyor networks, water/power distribution graphs, traffic reservations, variable watch, breakpoints, autocomplete, syntax colouring, additional challenge scenarios, biome/season simulation, and complete mobile Safari performance profiling remain future work.
