# FarmerBot 2.0 development roadmap

## Alpha 1 — implemented in this package

- Project split into page, game logic, safe language interpreter and content catalog.
- Preserve the old one-robot/one-crop game and save v2 migration.
- 10 visible crop species with actual model/stage/harvest loop.
- Multi-robot fleet (4 roles), independent programs, energy, cargo and collision checks.
- 30 progress missions, XP/levels, weather, day/night.
- Working pump, solar charging and warehouse capacity upgrade.
- Network panel, seed shop and expanded DSL.

## Alpha 2 — next priorities

1. Replace the text-area editor with a real editor component: syntax highlighting, autocomplete, line gutter, multiple program tabs and diagnostics.
2. Add interpreter debug hooks: current line, pause/resume, single-step, breakpoints and x1/x2/x4 timing.
3. Implement persistent IndexedDB save slots and robust save migrations.
4. Add technology tree with unlock prerequisites and research costs.
5. Buildable irrigation pipes, water tanks, charging stations and conveyors with grid placement and real item transfer.

## Beta — simulation depth

1. More precise plant needs: soil moisture, temperature, soil quality, season, disease and seed quality.
2. More robot upgrades, battery models, cargo capacity, inventory filters and route reservations.
3. Production line: plot → robot cargo → conveyor → warehouse → market.
4. More weather events, seasons and distinct territory modifiers.
5. 30+ authored campaign/challenge missions with star ratings and solution efficiency.
6. Audio mixer, procedural ambient sound and accessibility settings.

## Release candidate — polish

1. Procedural model batching/instancing and device-specific graphics profiles.
2. Performance profiling on Safari iPad and mid-range mobile devices.
3. Automated gameplay tests for save/load, crop lifecycle, robot collisions, missions, economy and program execution.
4. UI walkthrough, tutorial onboarding, responsive layout and localization review.
5. Final balance pass and release packaging.

## Known alpha limitations

- Crop visuals are procedural silhouettes, not artist-authored high-detail models.
- Weather is a global cycle; temperature and seasons are not yet modeled.
- The pump automatically waters one thirsty plot per interval; it is not a pipe network.
- Solar charging occurs when a robot is near the base pad.
- The warehouse stores robot cargo on return; there is not yet a conveyor transport system.
- Robots can execute simultaneously, but routing currently uses local collision rejection rather than a global traffic planner.
- Campaign/challenges/free-play are mode labels and sandbox resource settings; fully different mode rules are still planned.
- Code editor has tab indentation, line numbering and error messages, but no syntax colouring, autocomplete or step debugger yet.
