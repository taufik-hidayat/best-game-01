// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh game, steered by a simple autopilot that builds towers near the
// path's bends and upgrades them when it can afford to, so the frame is what a real
// game looks like and the same seed always gives the same frame.
import { STEP, TOWER_TYPES } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, startGame, updateGame } from './state.js';
import { createTower, upgradeCost } from './towers.js';
import { sfx } from './audio.js';

const START_SECONDS = 5;
const MAX_SIM_SECONDS = 1200;

/** The autopilot's build order: [tower type, aim point] — nearest free plot wins. */
const BUILD_PLAN = [
  ['ember', 930, 230],
  ['ember', 700, 276],
  ['frost', 430, 448],
  ['prism', 850, 534],
  ['ember', 250, 276],
  ['frost', 1000, 534],
  ['prism', 560, 448],
];

function nearestFreePlot(game, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const plot of game.plots) {
    if (game.towers.some((t) => t.plot === plot)) continue;
    const d = Math.hypot(plot.x - x, plot.y - y);
    if (d < bestDist) {
      best = plot;
      bestDist = d;
    }
  }
  return best;
}

/** One autopilot decision per step: build the next planned tower, or upgrade. */
function autopilotBuild(game, planIndex) {
  if (planIndex.current < BUILD_PLAN.length) {
    const [type, ax, ay] = BUILD_PLAN[planIndex.current];
    const def = TOWER_TYPES[type];
    if (game.lumen < def.cost) return;
    const plot = nearestFreePlot(game, ax, ay);
    if (!plot) {
      planIndex.current += 1;
      return;
    }
    game.lumen -= def.cost;
    game.towers.push(createTower(type, plot));
    game.towersBuilt += 1;
    planIndex.current += 1;
    return;
  }
  // Everything built: spend spare lumen on upgrades, cheapest tower first.
  if (game.lumen < 140) return;
  const upgradable = game.towers.filter((t) => t.level < 3);
  if (upgradable.length === 0) return;
  upgradable.sort((a, b) => a.invested - b.invested);
  const tower = upgradable[0];
  const cost = upgradeCost(tower);
  if (cost !== null && game.lumen >= cost) {
    game.lumen -= cost;
    tower.invested += cost;
    tower.level += 1;
  }
}

/** Step the real game forward until `stopWhen` is true or the game ends. */
function runSim(game, stopWhen) {
  const planIndex = { current: 0 };
  let seconds = 0;
  while (seconds < MAX_SIM_SECONDS) {
    if (game.screen === SCREEN_OVER || game.screen === SCREEN_WIN) break;
    if (stopWhen(game)) break;
    // Fast-forward the between-wave wait so the sim does not idle.
    if (!game.waveActive && game.countdown > 0.5) game.countdown = 0.5;
    autopilotBuild(game, planIndex);
    updateGame(game, STEP);
    seconds += STEP;
  }
  return seconds;
}

/**
 * Set `game` to the named scene (start, play or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, game, best) {
  sfx.setMuted(true);
  game.muted = true;
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      game.now += STEP;
      game.beamAngle += STEP * 0.45;
      for (const wisp of game.titleWisps) {
        wisp.distance += wisp.speed * STEP;
        if (wisp.distance > 2400) wisp.distance = 0;
      }
      game.effects.update(STEP);
    }
    return { screen: SCREEN_TITLE, best };
  }
  startGame(game);
  game.countdown = 0.5;
  if (name === 'play') {
    runSim(game, (g) => g.wave === 4 && g.waveActive && g.enemies.length >= 6);
    // Let the fight develop for another moment so projectiles are in the air.
    for (let i = 0; i < 1.5 / STEP; i += 1) updateGame(game, STEP);
    return { screen: SCREEN_PLAY, best };
  }
  runSim(game, (g) => g.screen === SCREEN_WIN);
  if (game.screen !== SCREEN_WIN) {
    // The autopilot lost: stage the defeat screen it really reached instead of faking a win.
    return { screen: SCREEN_OVER, best };
  }
  return { screen: SCREEN_WIN, best };
}
