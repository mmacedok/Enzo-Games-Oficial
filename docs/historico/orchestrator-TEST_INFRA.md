# E2E Test Infra: Enzo Run

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Logo Click Navigation | R1 (Header integration) | 5      | 5      | ✓      |
| 2 | Runner Mechanics | R2 (Jumping, inputs)    | 5      | 5      | ✓      |
| 3 | Collision & Game Over | R2 (Obstacle collision) | 5      | 5      | ✓      |
| 4 | Score & Speed Scaling | R2 (Score and speed)    | 5      | 5      | ✓      |
| 5 | Image Asset Rendering | R3 (AI assets)          | 5      | 5      | ✓      |

## Test Architecture
- Test runner: Lightweight browser-based test harness (`js/game.test.js`) and/or Node-based script.
- Test case format: Injected test suite asserting state transitions and rendering properties.
- Directory layout: tests inside `js/game.test.js` or `tests/`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Game start, jump 3 times, let obstacle collide, check game over and restart | F1, F2, F3, F4     | Medium     |
| 2 | Long run verification (verify speed increases and score increases over 15s)  | F2, F4, F5         | High       |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
