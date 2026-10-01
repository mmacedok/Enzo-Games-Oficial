export const LANES = [-2.45, 0, 2.45];
export const PLAYER_Z = 0;
export const TUTORIAL_SECONDS = 10;
export const MAX_SPEED = 27;

export const PLAYER_RADIUS = 0.52;
export const OBSTACLE_WIDTH = 1.72;
export const PLAYER_HEIGHT = 1.55;
export const SLIDING_HEIGHT = 1.12;
export const OBSTACLE_DEPTH = {
  dodge: 2.65,
  jump: 0.78,
  slide: 0.58
};

export const COLLISION = {
  dodge: { always: true },
  jump: { minY: 0.67 },
  slide: { requireSliding: true, maxPlayerTopY: 1.27 }
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const laneToX = lane => (clamp(lane, 0, 2) - 1) * 2.45;
export const scoreFor = state => Math.floor(state.distance + state.coins * 25 + state.combo * 10);

export function makeRng(seed = 1337) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function sweptZOverlaps(obstacle, tolerance = 0.08) {
  const depth = OBSTACLE_DEPTH[obstacle.type];
  if (depth === undefined) return false;
  const playerDepth = depth / 2 + PLAYER_RADIUS + tolerance;
  const currentZ = Number.isFinite(obstacle.z) ? obstacle.z : PLAYER_Z;
  const previousZ = Number.isFinite(obstacle.prevZ) ? obstacle.prevZ : currentZ;
  return Math.min(previousZ, currentZ) <= PLAYER_Z + playerDepth
    && Math.max(previousZ, currentZ) >= PLAYER_Z - playerDepth;
}

export function isCollision(state, obstacle, tolerance = 0.08) {
  if (!obstacle || !sweptZOverlaps(obstacle, tolerance)) return false;

  const playerX = laneToX(state.lane);
  const obstacleX = laneToX(obstacle.lane);
  const horizontalRadius = OBSTACLE_WIDTH / 2 + PLAYER_RADIUS + tolerance;
  if (Math.abs(obstacleX - playerX) > horizontalRadius) return false;

  const rule = COLLISION[obstacle.type];
  if (!rule) return false;
  if (rule.always) return true;

  if (rule.minY !== undefined && state.y >= rule.minY) return false;

  if (rule.requireSliding) {
    const playerHeight = state.sliding ? SLIDING_HEIGHT : PLAYER_HEIGHT;
    return !state.sliding || state.y + playerHeight > rule.maxPlayerTopY;
  }

  return true;
}

export function isPatternSafe(pattern, type) {
  if (!pattern || !Array.isArray(pattern.items)) return false;
  const safeLane = pattern.safeLane;
  if (!Number.isInteger(safeLane) || safeLane < 0 || safeLane > 2) return false;
  return pattern.items.length > 0
    && pattern.items.length < 3
    && pattern.items.every(item => item.type === type && item.lane !== safeLane);
}

export function createPattern(index, elapsed = 0, rng = Math.random) {
  const safeLane = Math.floor(rng() * 3);
  const cycle = index % 6;
  const type = elapsed < TUTORIAL_SECONDS
    ? 'jump'
    : ['dodge', 'jump', 'slide', 'jump', 'dodge', 'slide'][cycle];
  const alternatives = [0, 1, 2].filter(lane => lane !== safeLane);
  const lanes = [alternatives[Math.floor(rng() * alternatives.length)]];
  if (index > 3 && rng() > 0.62) {
    lanes.push(alternatives.find(lane => lane !== lanes[0]));
  }
  return { index, type, safeLane, items: lanes.map(lane => ({ type, lane })) };
}

function scenarioState(type) {
  const base = createInitialState();
  base.scenario = type;
  base.elapsed = 2;
  if (type === 'jump' || type === 'slide' || type === 'dodge') {
    base.obstacles.push({
      id: `qa-1`,
      type,
      lane: 1,
      z: -30,
      prevZ: -30,
      hit: false
    });
  }
  if (type === 'coin') {
    base.collectibles.push({ id: 'qa-c1', lane: 1, z: -2, prevZ: -2, collected: false, value: 1 });
    base.collectibles.push({ id: 'qa-c2', lane: 1, z: -0.2, prevZ: -0.2, collected: false, value: 1 });
  }
  if (type === 'shield' || type === 'magnet') {
    base.powerups.push({ id: `qa-${type}`, type, lane: 0, z: -30, prevZ: -30, collected: false });
  }
  return base;
}

function loseLife(state) {
  if (state.invulnerable > 0 || state.status !== 'playing') return false;
  if (state.shieldTime > 0) {
    state.shieldTime = 0;
    state.invulnerable = 1.2;
    return 'shield';
  }
  state.lives -= 1;
  state.invulnerable = 1.6;
  state.combo = 0;
  state.comboTime = 0;
  if (state.lives <= 0) state.status = 'gameover';
  return 'life';
}

function collectCoin(state, coin) {
  if (coin.collected) return;
  coin.collected = true;
  state.coins += coin.value || 1;
  state.coinProgress += coin.value || 1;
  state.combo += 1;
  state.comboTime = 3.5;
}

export function queueAction(state, action) {
  if (state.status !== 'playing') return state;
  if (action === 'left' && state.targetLane > 0) state.targetLane -= 1;
  if (action === 'right' && state.targetLane < 2) state.targetLane += 1;
  if (action === 'jump' && state.jumpTime <= 0 && !state.sliding) state.jumpTime = state.jumpDuration || 0.84;
  if (action === 'slide' && state.jumpTime <= 0 && !state.sliding) {
    state.slideTime = 0.72;
    state.sliding = true;
  }
  return state;
}

export function createInitialState() {
  return {
    status: 'menu',
    scenario: null,
    lane: 1,
    targetLane: 1,
    y: 0,
    jumpTime: 0,
    jumpDuration: 0.84,
    slideTime: 0,
    sliding: false,
    speed: 14,
    distance: 0,
    coins: 0,
    coinProgress: 0,
    combo: 0,
    comboTime: 0,
    lives: 3,
    invulnerable: 0,
    shieldTime: 0,
    magnetTime: 0,
    elapsed: 0,
    spawnTimer: 3,
    nextPattern: 0,
    nextPowerup: 18,
    lastPowerup: 0,
    rng: Math.random,
    obstacles: [],
    collectibles: [],
    powerups: [],
    events: []
  };
}

export function createScenario(type) {
  if (!['jump', 'slide', 'dodge', 'coin', 'shield', 'magnet'].includes(type)) return null;
  const state = scenarioState(type);
  state.status = 'playing';
  return state;
}

export function step(state, input = {}, dt = 1 / 60) {
  if (state.status !== 'playing') return state;
  const delta = clamp(dt, 0, 0.05);
  for (const action of [].concat(input.actions || [])) queueAction(state, action);

  state.elapsed += delta;
  state.targetLane = clamp(state.targetLane, 0, 2);
  state.lane += (state.targetLane - state.lane) * (1 - Math.exp(-12 * delta));
  state.speed = Math.min(MAX_SPEED, 14 + Math.floor(state.elapsed / 12) * 0.8);
  state.distance += state.speed * delta;
  state.invulnerable = Math.max(0, state.invulnerable - delta);
  state.shieldTime = Math.max(0, state.shieldTime - delta);
  state.magnetTime = Math.max(0, state.magnetTime - delta);
  state.comboTime = Math.max(0, state.comboTime - delta);
  if (state.comboTime === 0) state.combo = 0;

  if (state.jumpTime > 0) {
    const before = state.jumpTime;
    state.jumpTime = Math.max(0, state.jumpTime - delta);
    const t = 1 - state.jumpTime / state.jumpDuration;
    state.y = Math.sin(Math.PI * clamp(t, 0, 1)) * 1.55;
    if (before > 0 && state.jumpTime === 0) state.y = 0;
  } else state.y = 0;

  state.slideTime = Math.max(0, state.slideTime - delta);
  state.sliding = state.slideTime > 0;

  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0 && !state.scenario) {
    const pattern = createPattern(state.nextPattern++, state.elapsed, state.rng);
    for (const item of pattern.items) {
      state.obstacles.push({
        id: `o${state.elapsed}-${state.nextPattern}-${item.lane}`,
        type: item.type,
        lane: item.lane,
        z: -76,
        prevZ: -76,
        hit: false
      });
    }
    const coinLane = pattern.safeLane;
    for (let i = 0; i < 4; i += 1) {
      state.collectibles.push({
        id: `c${state.elapsed}-${state.nextPattern}-${i}`,
        lane: coinLane,
        z: -70 + i * 1.25,
        prevZ: -70 + i * 1.25,
        collected: false,
        value: 1
      });
    }
    if (state.nextPattern % 4 === 0) {
      const other = (coinLane + (state.rng() > 0.5 ? 1 : 2)) % 3;
      for (let i = 0; i < 3; i += 1) {
        state.collectibles.push({
          id: `cb${state.elapsed}-${i}`,
          lane: other,
          z: -68 + i * 1.3,
          prevZ: -68 + i * 1.3,
          collected: false,
          value: 1
        });
      }
    }
    const minimumGap = MAX_SPEED * 1.4;
    const baseGap = Math.max(17 - Math.min(4, state.elapsed / 25), minimumGap);
    state.spawnTimer = Math.max(1.4, baseGap / state.speed);
  }

  if (state.elapsed >= state.nextPowerup && !state.scenario) {
    const type = state.lastPowerup % 2 === 0 ? 'shield' : 'magnet';
    state.powerups.push({ id: `p${state.nextPowerup}`, type, lane: 1, z: -75, prevZ: -75, collected: false });
    state.lastPowerup += 1;
    state.nextPowerup += 30;
  }

  for (const obstacle of state.obstacles) {
    obstacle.prevZ = obstacle.z;
    obstacle.z += state.speed * delta;
    if (!obstacle.hit && isCollision(state, obstacle)) {
      const result = loseLife(state);
      if (result) {
        obstacle.hit = true;
        state.events.push({ type: result, x: laneToX(obstacle.lane), z: obstacle.z });
      }
    }
  }
  state.obstacles = state.obstacles.filter(item => item.z < 9);

  for (const coin of state.collectibles) {
    coin.prevZ = coin.z;
    if (state.magnetTime > 0 && !coin.collected && coin.z < 4) {
      coin.lane += (state.lane - coin.lane) * (1 - Math.exp(-8 * delta));
      coin.z = Math.min(0, coin.z + 30 * delta);
    } else coin.z += state.speed * delta;

    const coinX = laneToX(coin.lane);
    const playerX = laneToX(state.lane);
    if (!coin.collected
      && Math.abs(coin.z) < 1.05
      && Math.abs(coinX - playerX) < PLAYER_RADIUS + 0.26) {
      collectCoin(state, coin);
      state.events.push({ type: 'coin', x: coinX, z: coin.z });
    }
  }
  state.collectibles = state.collectibles.filter(item => item.z < 8 && !item.collected);

  for (const powerup of state.powerups) {
    powerup.prevZ = powerup.z ?? 0;
    powerup.z = (powerup.z ?? 0) + state.speed * delta;
    if (!powerup.collected
      && Math.abs(laneToX(powerup.lane) - laneToX(state.lane)) < 0.82
      && Math.abs(powerup.z) < 1.25) {
      powerup.collected = true;
      if (powerup.type === 'shield') state.shieldTime = 10;
      if (powerup.type === 'magnet') state.magnetTime = 10;
      state.events.push({ type: powerup.type, x: laneToX(powerup.lane), z: 0 });
    }
  }
  state.powerups = state.powerups.filter(item => item.z < 8 && !item.collected);
  return state;
}

export function snapshot(state) {
  return {
    state: state.status,
    lane: Math.round(state.lane * 100) / 100,
    y: Math.round(state.y * 100) / 100,
    sliding: state.sliding,
    lives: state.lives,
    distance: Math.floor(state.distance),
    coins: state.coins,
    speed: Math.round(state.speed * 10) / 10,
    activeObstacles: state.obstacles.map(item => ({ type: item.type, lane: item.lane, z: Math.round(item.z * 100) / 100 })),
    powerups: {
      shield: Math.ceil(state.shieldTime),
      magnet: Math.ceil(state.magnetTime)
    }
  };
}
