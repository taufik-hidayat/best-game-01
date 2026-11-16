// LUMENHOLD's state machine: screens, waves, economy, scoring and every action the
// player (or the screenshot autopilot) can take. The renderer only reads this state.
import {
  BAR_HEIGHT,
  FIELD,
  START_HP,
  START_LUMEN,
  TOTAL_WAVES,
  TOWER_ORDER,
  TOWER_TYPES,
  waveClearBonus,
  waveComposition,
} from './config.js';
import { createRandom } from './random.js';
import { buildPlots } from './path.js';
import { createEnemy, updateEnemy } from './enemies.js';
import { createTower, sellValue, upgradeCost, updateProjectiles, updateTowers } from './towers.js';
import { createEffects } from './effects.js';
import { sfx } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const WAVE_COUNTDOWN = 8;
const EARLY_CALL_BONUS = 15;

/** Top-bar buttons and bottom build cards, in logical coordinates. */
export function uiLayout() {
  const buttons = {
    sendWave: { x: 556, y: 10, w: 148, h: 44 },
    speed: { x: 714, y: 10, w: 78, h: 44 },
    pause: { x: 802, y: 10, w: 78, h: 44 },
    sound: { x: 890, y: 10, w: 78, h: 44 },
  };
  const cards = TOWER_ORDER.map((key, i) => ({
    key,
    x: 330 + i * 200,
    y: FIELD.height - BAR_HEIGHT + 6,
    w: 186,
    h: BAR_HEIGHT - 12,
  }));
  const towerPanel = {
    upgrade: { x: 690, y: FIELD.height - BAR_HEIGHT + 12, w: 180, h: 60 },
    sell: { x: 890, y: FIELD.height - BAR_HEIGHT + 12, w: 150, h: 60 },
  };
  return { buttons, cards, towerPanel };
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function createGame(seed) {
  const game = {
    seed,
    rng: createRandom(seed),
    screen: SCREEN_TITLE,
    now: 0,
    timePlayed: 0,
    plots: buildPlots(),
    towers: [],
    enemies: [],
    projectiles: [],
    effects: createEffects(),
    wave: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    countdown: 0,
    lumen: START_LUMEN,
    hp: START_HP,
    score: 0,
    kills: 0,
    leaks: 0,
    earned: 0,
    towersBuilt: 0,
    speed: 1,
    muted: false,
    buildChoice: 'ember',
    selectedPlot: null,
    selectedTower: null,
    beamAngle: -0.6,
    titleWisps: [],
    hoverPlot: null,
    hoverTower: null,
    message: '',
    messageUntil: 0,
    finalStats: null,
  };
  for (let i = 0; i < 5; i += 1) {
    game.titleWisps.push({ distance: game.rng.range(0, 900), speed: game.rng.range(24, 46), size: game.rng.range(8, 14) });
  }
  return game;
}

function flashMessage(game, text) {
  game.message = text;
  game.messageUntil = game.now + 2.2;
}

export function startGame(game) {
  game.screen = SCREEN_PLAY;
  game.wave = 0;
  game.waveActive = false;
  game.countdown = WAVE_COUNTDOWN;
  game.towers = [];
  game.enemies = [];
  game.projectiles = [];
  game.lumen = START_LUMEN;
  game.hp = START_HP;
  game.score = 0;
  game.kills = 0;
  game.leaks = 0;
  game.earned = 0;
  game.towersBuilt = 0;
  game.timePlayed = 0;
  game.selectedPlot = null;
  game.selectedTower = null;
  game.finalStats = null;
  flashMessage(game, 'Build towers, then send Wave 1!');
  sfx.waveHorn();
}

function startWave(game) {
  const n = game.wave + 1;
  const { list, gap } = waveComposition(n);
  const queue = [];
  const bag = [];
  for (const [type, count] of list) {
    for (let i = 0; i < count; i += 1) bag.push(type);
  }
  // Shuffle the bag (boss last) so the wave reads as a mixed swarm.
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(game.rng.next() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  const bossIndex = bag.indexOf('moth');
  if (bossIndex !== -1) {
    bag.splice(bossIndex, 1);
    bag.push('moth');
  }
  for (const type of bag) queue.push({ type, delay: gap });
  game.spawnQueue = queue;
  game.spawnTimer = 0.4;
  game.wave = n;
  game.waveActive = true;
  game.countdown = 0;
  flashMessage(game, `Wave ${n} of ${TOTAL_WAVES}`);
  sfx.waveHorn();
}

export function sendWave(game) {
  if (game.screen !== SCREEN_PLAY || game.waveActive) return;
  if (game.wave >= TOTAL_WAVES) return;
  if (game.countdown > 0) {
    game.lumen += EARLY_CALL_BONUS;
    game.earned += EARLY_CALL_BONUS;
    flashMessage(game, `Early call! +${EARLY_CALL_BONUS} lumen`);
  }
  startWave(game);
}

function clearWave(game) {
  const bonus = waveClearBonus(game.wave);
  game.lumen += bonus;
  game.earned += bonus;
  game.score += 100;
  game.waveActive = false;
  if (game.wave >= TOTAL_WAVES) {
    winGame(game);
    return;
  }
  game.countdown = WAVE_COUNTDOWN;
  flashMessage(game, `Wave ${game.wave} cleared! +${bonus} lumen`);
  sfx.kill();
}

function winGame(game) {
  game.screen = SCREEN_WIN;
  const hpBonus = game.hp * 25;
  game.score += hpBonus;
  game.finalStats = {
    score: game.score,
    hpBonus,
    waves: game.wave,
    kills: game.kills,
    leaks: game.leaks,
    lumenEarned: game.earned,
    towersBuilt: game.towersBuilt,
    timePlayed: Math.round(game.timePlayed),
  };
  sfx.victory();
}

function loseGame(game) {
  game.screen = SCREEN_OVER;
  game.finalStats = {
    score: game.score,
    hpBonus: 0,
    waves: game.wave,
    kills: game.kills,
    leaks: game.leaks,
    lumenEarned: game.earned,
    towersBuilt: game.towersBuilt,
    timePlayed: Math.round(game.timePlayed),
  };
  sfx.defeat();
}

function towerAt(game, plot) {
  return game.towers.find((t) => t.plot === plot) || null;
}

export function plotAt(game, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const plot of game.plots) {
    const d = Math.hypot(x - plot.x, y - plot.y);
    if (d < 34 && d < bestDist) {
      best = plot;
      bestDist = d;
    }
  }
  return best;
}

export function buildTowerAt(game, plot) {
  if (!plot || towerAt(game, plot)) return false;
  const def = TOWER_TYPES[game.buildChoice];
  if (game.lumen < def.cost) {
    flashMessage(game, `Need ${def.cost} lumen for ${def.name}`);
    sfx.deny();
    return false;
  }
  game.lumen -= def.cost;
  const tower = createTower(game.buildChoice, plot);
  game.towers.push(tower);
  game.towersBuilt += 1;
  game.selectedTower = tower;
  game.selectedPlot = null;
  game.effects.ring(plot.x, plot.y, def.color);
  game.effects.burst(plot.x, plot.y, def.color, 14);
  sfx.build();
  return true;
}

export function upgradeSelected(game) {
  const tower = game.selectedTower;
  if (!tower) return false;
  const cost = upgradeCost(tower);
  if (cost === null) {
    flashMessage(game, 'Already at max level');
    return false;
  }
  if (game.lumen < cost) {
    flashMessage(game, `Need ${cost} lumen to upgrade`);
    sfx.deny();
    return false;
  }
  game.lumen -= cost;
  tower.invested += cost;
  tower.level += 1;
  game.effects.ring(tower.x, tower.y - 14, tower.def.color);
  game.effects.burst(tower.x, tower.y - 14, tower.def.glow, 18);
  sfx.upgrade();
  return true;
}

export function sellSelected(game) {
  const tower = game.selectedTower;
  if (!tower) return false;
  const value = sellValue(tower);
  game.lumen += value;
  game.earned += value;
  game.towers = game.towers.filter((t) => t !== tower);
  game.effects.floatText(tower.x, tower.y - 30, `+${value}`, '#ffc94d');
  game.selectedTower = null;
  sfx.click();
  return true;
}

export function handleClick(game, x, y) {
  const { buttons, cards, towerPanel } = uiLayout();
  if (game.screen === SCREEN_TITLE) {
    const cta = { x: FIELD.width / 2 - 150, y: 560, w: 300, h: 56 };
    if (pointInRect(x, y, cta)) {
      startGame(game);
      return;
    }
    return;
  }
  if (game.screen === SCREEN_OVER || game.screen === SCREEN_WIN) {
    const cta = { x: FIELD.width / 2 - 150, y: 540, w: 300, h: 56 };
    if (pointInRect(x, y, cta)) startGame(game);
    return;
  }
  if (pointInRect(x, y, buttons.sendWave)) {
    sendWave(game);
    return;
  }
  if (pointInRect(x, y, buttons.speed)) {
    game.speed = game.speed === 1 ? 2 : 1;
    sfx.click();
    return;
  }
  if (pointInRect(x, y, buttons.pause)) {
    game.screen = game.screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
    sfx.click();
    return;
  }
  if (pointInRect(x, y, buttons.sound)) {
    game.muted = !game.muted;
    sfx.setMuted(game.muted);
    return;
  }
  if (game.selectedTower) {
    if (pointInRect(x, y, towerPanel.upgrade)) {
      upgradeSelected(game);
      return;
    }
    if (pointInRect(x, y, towerPanel.sell)) {
      sellSelected(game);
      return;
    }
  }
  for (const card of cards) {
    if (game.selectedTower) break;
    if (pointInRect(x, y, card)) {
      game.buildChoice = card.key;
      game.selectedTower = null;
      game.selectedPlot = null;
      sfx.click();
      return;
    }
  }
  if (game.screen === SCREEN_PAUSED) return;
  const plot = plotAt(game, x, y);
  if (plot) {
    const tower = towerAt(game, plot);
    if (tower) {
      game.selectedTower = tower;
      game.selectedPlot = null;
    } else {
      game.selectedPlot = plot;
      game.selectedTower = null;
      buildTowerAt(game, plot);
    }
    return;
  }
  game.selectedPlot = null;
  game.selectedTower = null;
}

export function handleKey(game, key) {
  if (key === ' ') {
    if (game.screen === SCREEN_TITLE || game.screen === SCREEN_OVER || game.screen === SCREEN_WIN) startGame(game);
    else sendWave(game);
    return;
  }
  if (game.screen !== SCREEN_PLAY && game.screen !== SCREEN_PAUSED) return;
  if (key === 'p' || key === 'P' || key === 'Escape') {
    game.screen = game.screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
  } else if (key === 'f' || key === 'F') {
    game.speed = game.speed === 1 ? 2 : 1;
  } else if (key === 'm' || key === 'M') {
    game.muted = !game.muted;
    sfx.setMuted(game.muted);
  } else if (key === '1' || key === '2' || key === '3') {
    game.buildChoice = TOWER_ORDER[Number(key) - 1];
    game.selectedTower = null;
  } else if (key === 'u' || key === 'U') {
    upgradeSelected(game);
  } else if (key === 'x' || key === 'X') {
    sellSelected(game);
  }
}

/** Advance the world one fixed step. Returns nothing; sounds fire as side effects. */
export function updateGame(game, dt) {
  game.now += dt;
  game.beamAngle += dt * 0.45;
  game.effects.update(dt);
  if (game.screen === SCREEN_TITLE) {
    for (const wisp of game.titleWisps) {
      wisp.distance += wisp.speed * dt;
      if (wisp.distance > 2400) wisp.distance = 0;
    }
    return;
  }
  if (game.screen !== SCREEN_PLAY) return;
  game.timePlayed += dt;

  if (!game.waveActive && game.wave < TOTAL_WAVES) {
    game.countdown -= dt;
    if (game.countdown <= 0) startWave(game);
  }

  if (game.spawnQueue.length > 0) {
    game.spawnTimer -= dt;
    while (game.spawnTimer <= 0 && game.spawnQueue.length > 0) {
      const next = game.spawnQueue.shift();
      game.enemies.push(createEnemy(next.type, game.wave, game.rng));
      game.spawnTimer += next.delay;
    }
  }

  const { shots, kind } = updateTowers(game.towers, game.enemies, game.projectiles, dt);
  if (shots > 0) sfx.shoot(kind);
  const hits = updateProjectiles(game.projectiles, game.enemies, dt, game.now);
  for (const hit of hits) {
    game.effects.burst(hit.x, hit.y, hit.kind === 'prism' ? '#c084fc' : '#ffd27a', hit.kind === 'prism' ? 10 : 5, 90);
  }
  game.projectiles = game.projectiles.filter((p) => !p.dead);

  for (const enemy of game.enemies) {
    if (enemy.dead || enemy.leaked) continue;
    if (updateEnemy(enemy, dt, game.now)) {
      enemy.leaked = true;
      game.hp -= enemy.def.leak;
      game.leaks += 1;
      game.effects.addShake(5);
      game.effects.burst(1205, 600, '#ff5a5a', 16, 160);
      game.effects.floatText(1150, 560, `-${enemy.def.leak} HP`, '#ff5a5a');
      sfx.leak();
    }
  }
  const freshKills = game.enemies.filter((e) => e.dead && !e.leaked);
  for (const enemy of freshKills) {
    game.kills += 1;
    game.lumen += enemy.def.reward;
    game.earned += enemy.def.reward;
    game.score += enemy.def.score;
    game.effects.burst(enemy.x, enemy.y, enemy.def.glow, 12, 130);
    game.effects.floatText(enemy.x, enemy.y - 18, `+${enemy.def.reward}`, '#ffc94d');
    sfx.kill();
  }
  game.enemies = game.enemies.filter((e) => !e.dead && !e.leaked);

  if (game.hp <= 0) {
    game.hp = 0;
    loseGame(game);
    return;
  }
  if (game.waveActive && game.spawnQueue.length === 0 && game.enemies.length === 0) {
    clearWave(game);
  }
  if (game.message && game.now > game.messageUntil) game.message = '';
}
