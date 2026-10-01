import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLLISION,
  PLAYER_RADIUS,
  TUTORIAL_SECONDS,
  createInitialState,
  createPattern,
  createScenario,
  isCollision,
  isPatternSafe,
  laneToX,
  makeRng,
  queueAction,
  snapshot,
  step
} from '../assets/italos-surfer/core.mjs';

test('low hurdles collide on ground but not during a valid jump', () => {
  const state = createInitialState();
  const hurdle = { type: 'jump', lane: 1, z: 0, prevZ: 0 };
  assert.equal(isCollision(state, hurdle), true);
  state.y = COLLISION.jump.minY;
  assert.equal(isCollision(state, hurdle), false);
});

test('overhead bars require sliding and permit a low sliding player', () => {
  const state = createInitialState();
  const bar = { type: 'slide', lane: 1, z: 0, prevZ: 0 };
  assert.equal(isCollision(state, bar), true);
  state.sliding = true;
  assert.equal(isCollision(state, bar), false);
});

test('jumping into an overhead bar still collides', () => {
  const state = createInitialState();
  state.y = 0.5;
  state.sliding = false;
  assert.equal(isCollision(state, { type: 'slide', lane: 1, z: 0, prevZ: 0 }), true);
});

test('tall cars cannot be jumped', () => {
  const state = createInitialState();
  state.y = 2;
  assert.equal(isCollision(state, { type: 'dodge', lane: 1, z: 0, prevZ: 0 }), true);
});

test('collisions use the continuous lane position and lane bounds', () => {
  const state = createInitialState();
  state.lane = 1.2;
  assert.equal(isCollision(state, { type: 'dodge', lane: 1, z: 0, prevZ: 0 }), true);
  state.lane = 1.4;
  assert.equal(isCollision(state, { type: 'dodge', lane: 1, z: 0, prevZ: 0 }), true);
  state.lane = 1.7;
  assert.equal(isCollision(state, { type: 'dodge', lane: 1, z: 0, prevZ: 0 }), false);
  state.lane = 2;
  assert.equal(isCollision(state, { type: 'dodge', lane: 1, z: 0, prevZ: 0 }), false);
  assert.equal(Math.abs(laneToX(1) - 0) < 0.0001, true);
  assert.ok(laneToX(1.5) > 0);
  assert.ok(PLAYER_RADIUS > 0);
});

test('swept collision catches an obstacle crossing the player in one update', () => {
  const state = createInitialState();
  const obstacle = { type: 'dodge', lane: 1, prevZ: -10, z: 10 };
  assert.equal(isCollision(state, obstacle), true);
});

test('generated patterns preserve a reachable, obstacle-free safe lane and consistent action', () => {
  const rng = makeRng(42);
  for (let i = 0; i < 100; i += 1) {
    const pattern = createPattern(i, i < TUTORIAL_SECONDS ? 0 : 20, rng);
    assert.equal(isPatternSafe(pattern, pattern.type), true);
    assert.equal(pattern.items.some(item => item.lane === pattern.safeLane), false);
    assert.equal(pattern.items.every(item => item.type === pattern.type), true);
    assert.equal(pattern.items.length < 3, true);
    if (i < TUTORIAL_SECONDS) assert.equal(pattern.type, 'jump');
  }
});

test('damage consumes a life and grants recovery invulnerability', () => {
  const state = createScenario('dodge');
  state.obstacles[0].z = 0;
  state.obstacles[0].prevZ = 0;
  step(state, {}, 1 / 30);
  assert.equal(state.lives, 2);
  assert.ok(state.invulnerable > 0);
});

test('distinct obstacles can cause repeat damage after invulnerability', () => {
  const state = createScenario('dodge');
  state.obstacles = [
    { id: 'first', type: 'dodge', lane: 1, z: 0, prevZ: 0, hit: false },
    { id: 'second', type: 'dodge', lane: 1, z: 0, prevZ: 0, hit: false }
  ];
  step(state, {}, 1 / 60);
  state.invulnerable = 0;
  state.obstacles[1].z = 0;
  state.obstacles[1].prevZ = 0;
  step(state, {}, 1 / 60);
  assert.equal(state.lives, 1);
});

test('shield absorbs a hit and does not lose a life', () => {
  const state = createScenario('dodge');
  state.shieldTime = 5;
  state.obstacles[0].z = 0;
  state.obstacles[0].prevZ = 0;
  step(state, {}, 1 / 30);
  assert.equal(state.lives, 3);
  assert.equal(state.shieldTime, 0);
});

test('QA scenarios approach from z=-30 and numeric coins use collectibles', () => {
  for (const type of ['jump', 'slide', 'dodge', 'shield', 'magnet']) {
    const state = createScenario(type);
    assert.equal(state.obstacles[0]?.z ?? state.powerups[0]?.z, -30);
    assert.equal(typeof state.coins, 'number');
    assert.equal(state.collectibles.every(item => !('coins' in item)), true);
  }
});

test('QA coin scenario is collectible and produces combo', () => {
  const state = createScenario('coin');
  for (let i = 0; i < 4; i += 1) step(state, {}, 1 / 30);
  assert.ok(state.coins >= 1);
  assert.ok(state.combo >= 1);
});

test('magnet interpolation uses continuous lane coordinates', () => {
  const state = createScenario('coin');
  state.lane = 1.35;
  state.targetLane = 1.35;
  state.magnetTime = 10;
  const coin = state.collectibles[0];
  coin.z = -1;
  const before = laneToX(coin.lane);
  step(state, {}, 1 / 30);
  assert.notEqual(laneToX(coin.lane), before);
  assert.ok(Math.abs(laneToX(coin.lane) - laneToX(state.lane)) < Math.abs(before - laneToX(state.lane)));
});

test('fresh state and deterministic scenarios are reset cleanly', () => {
  const dirty = createScenario('dodge');
  for (let i = 0; i < 10; i += 1) step(dirty, {}, 1 / 30);
  const fresh = createInitialState();
  assert.equal(fresh.status, 'menu');
  assert.equal(fresh.lives, 3);
  assert.equal(fresh.coins, 0);
  assert.equal(fresh.obstacles.length, 0);
  assert.deepEqual(snapshot(fresh), {
    state: 'menu', lane: 1, y: 0, sliding: false, lives: 3, distance: 0,
    coins: 0, speed: 14, activeObstacles: [], powerups: { shield: 0, magnet: 0 }
  });
});

test('paused and menu states freeze completely', () => {
  const state = createScenario('dodge');
  state.status = 'paused';
  const before = snapshot(state);
  step(state, { actions: ['right', 'jump'] }, 1 / 30);
  assert.deepEqual(snapshot(state), before);
});

test('first ten seconds avoid overhead obstacles and spawn generously', () => {
  const state = createInitialState();
  state.status = 'playing';
  state.rng = makeRng(7);
  for (let i = 0; i < 60 * 8; i += 1) step(state, {}, 1 / 60);
  assert.ok(state.elapsed < 10);
  assert.ok(state.obstacles.every(o => o.z > -80));
  assert.ok(state.obstacles.every(o => o.type !== 'slide'));
});

test('spawn rows remain at least 1.4 seconds apart at capped speed', () => {
  const state = createInitialState();
  state.status = 'playing';
  state.elapsed = 200;
  state.speed = 27;
  state.spawnTimer = 0;
  state.rng = makeRng(12);
  step(state, {}, 1 / 60);
  assert.ok(state.spawnTimer >= 1.4);
});

test('powerups alternate shield and magnet', () => {
  const state = createInitialState();
  state.status = 'playing';
  state.elapsed = 18;
  state.nextPowerup = 18;
  state.powerups = [];
  state.lastPowerup = 0;
  step(state, {}, 1 / 60);
  assert.equal(state.powerups[0].type, 'shield');
  state.elapsed = 48;
  state.nextPowerup = 48;
  step(state, {}, 1 / 60);
  assert.equal(state.powerups[1].type, 'magnet');
});

test('queue actions target lanes and queue jump and slide only while playable', () => {
  const state = createInitialState();
  state.status = 'playing';
  queueAction(state, 'left');
  assert.equal(state.targetLane, 0);
  queueAction(state, 'right');
  queueAction(state, 'right');
  assert.equal(state.targetLane, 2);
  queueAction(state, 'jump');
  assert.equal(state.jumpTime, 0.84);
  queueAction(state, 'slide');
  assert.equal(state.slideTime, 0);
  state.jumpTime = 0;
  queueAction(state, 'slide');
  assert.equal(state.slideTime, 0.72);
});

