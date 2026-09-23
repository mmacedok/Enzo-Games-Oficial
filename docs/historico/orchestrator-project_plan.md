# PROJECT PLAN: ENZO RUN MINI-GAME

## Architecture
The 'Enzo Run' game is a canvas-based 2D infinite runner game.
- **UI Integration Layer**: Click listener on `h1.garfield-classic-logo` in `index.html`. On click, replaces `#hero-comic` container content with a custom Canvas element `<canvas id="enzo-run-canvas">` and HUD elements (score, game over overlay, restart button). No page reload.
- **Game Engine**: A custom JavaScript module `js/enzo-run.js` containing:
  - Game Loop (requestAnimationFrame) managing game state: START, RUNNING, GAME_OVER.
  - Hero class (Enzo): physics (gravity, jump velocity, collision box), sprite rendering.
  - Obstacle class (Macaroni/Pasta): movement, random selection of types, collision box.
  - Asset Loader: preloading image files before starting game.
  - Controller: tracking spacebar, canvas click, and mobile touch events.
  - State Manager: score tracking (meters run), speed scaling over time.
- **AI Generated Assets**:
  - `assets/enzo_run/hero.png` (Enzo sprite: mix of Garfield cat and a human friend)
  - `assets/enzo_run/obstacle_pasta.png` (macaroni/pasta obstacle sprite)
- **E2E Testing Track**:
  - Independent test runner and suite validating gameplay, asset existence, and integration behavior.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1| Exploration & Analysis | Explorer analyzes codebase and suggests E2E testing framework & integration hook | None | PLANNED |
| M2| E2E Test Suite Creation | Testing Orchestrator builds the test runner and tests (Tiers 1-4) | M1 | PLANNED |
| M3| Asset Generation | Generate hero (Enzo) and obstacle images via AI image generator | M1 | PLANNED |
| M4| Game Implementation | Build the core infinite runner mechanics, controls, canvas, physics, and assets integration | M2, M3 | PLANNED |
| M5| UI Header Integration | Bind logo click event to transition hero section to canvas, verify E2E tests pass | M4 | PLANNED |
| M6| Adversarial & Audit | Tier 5 adversarial testing, Forensic Audit verification, and final handoff | M5 | PLANNED |

## Interface Contracts
### Main Page ↔ Game Module
- Click on `h1.garfield-classic-logo` triggers `window.startEnzoRun()` (or equivalent event/method).
- The game canvas size dynamically adapts or fits within `#hero-comic` boundaries.
- Resetting/restarting is handled entirely inside the canvas/HUD overlay.

## Code Layout
- `.agents/`: Coordination and handoff directories.
- `index.html`: Web page header and hero container.
- `css/style.css`: Styles for canvas container, game over overlay, HUD text.
- `js/enzo-run.js`: Game engine, physics, state, rendering loop.
- `assets/enzo_run/`: Storage directory for AI-generated images.
- `tests/`: Directory for automated tests.
