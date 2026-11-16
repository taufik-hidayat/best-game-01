// LUMENHOLD — configuration: the field, the palette, tower and enemy definitions,
// wave composition and every tuning number. One place to balance the game.
export const FIELD = { width: 1280, height: 720 };
export const HUD_HEIGHT = 64;
export const BAR_HEIGHT = 84;
export const STEP = 1 / 60;
export const BEST_KEY = 'lumenhold.best';
export const TOTAL_WAVES = 10;
export const START_LUMEN = 160;
export const START_HP = 20;
export const SELL_REFUND = 0.7;

/** The night-garden palette: deep indigo sky, warm amber light, teal grass. */
export const PALETTE = {
  skyTop: '#0d1230',
  skyBottom: '#1a2348',
  grass: '#14291f',
  grassLight: '#1a3328',
  grassDot: '#22402f',
  path: '#8a6f4d',
  pathEdge: '#6e5738',
  pathStone: '#a5855f',
  plot: '#1e3d2c',
  plotEdge: '#3a6b4a',
  plotHover: '#2c5a3d',
  hud: '#0a0e24',
  hudEdge: '#2c3a6e',
  text: '#f2e9c9',
  textDim: '#a9b2d8',
  gold: '#ffc94d',
  red: '#ff5a5a',
  green: '#7ee787',
  cyan: '#6ee7f9',
  violet: '#c084fc',
  orange: '#fb923c',
};

export const PATH_POINTS = [
  [-40, 150],
  [1000, 150],
  [1000, 380],
  [300, 380],
  [300, 600],
  [1180, 600],
];
export const PATH_WIDTH = 56;
export const LIGHTHOUSE = { x: 1205, y: 600, radius: 34 };

/** Towers the player can build. cost is lumen; range in px; damage per hit. */
export const TOWER_TYPES = {
  ember: {
    key: 'ember',
    name: 'Ember Spire',
    short: 'Ember',
    cost: 50,
    range: 135,
    damage: 12,
    rate: 2.2,
    projectileSpeed: 420,
    color: '#fb923c',
    glow: '#ff6b1a',
    blurb: 'Fast ember shots',
  },
  frost: {
    key: 'frost',
    name: 'Frost Lantern',
    short: 'Frost',
    cost: 75,
    range: 125,
    damage: 5,
    rate: 1.3,
    projectileSpeed: 360,
    slowFactor: 0.55,
    slowSeconds: 1.8,
    color: '#6ee7f9',
    glow: '#22d3ee',
    blurb: 'Chills enemies slow',
  },
  prism: {
    key: 'prism',
    name: 'Prism Cannon',
    short: 'Prism',
    cost: 120,
    range: 175,
    damage: 36,
    rate: 0.55,
    projectileSpeed: 300,
    splash: 58,
    color: '#c084fc',
    glow: '#a855f7',
    blurb: 'Splash damage blast',
  },
};
export const TOWER_ORDER = ['ember', 'frost', 'prism'];
export const UPGRADE_COST_FACTOR = [0, 0.6, 0.9];
export const UPGRADE_DAMAGE_FACTOR = [1, 1.45, 2.1];
export const UPGRADE_RANGE_FACTOR = [1, 1.08, 1.16];

/** Enemies that march the path. hpMul scales with the wave. */
export const ENEMY_TYPES = {
  wisp: {
    key: 'wisp',
    name: 'Shadow Wisp',
    hp: 30,
    speed: 56,
    reward: 8,
    score: 10,
    leak: 1,
    radius: 13,
    color: '#8b7cf6',
    glow: '#a78bfa',
  },
  beetle: {
    key: 'beetle',
    name: 'Gloom Beetle',
    hp: 130,
    speed: 29,
    reward: 16,
    score: 25,
    leak: 2,
    radius: 17,
    color: '#5b6b8c',
    glow: '#94a3b8',
  },
  spark: {
    key: 'spark',
    name: 'Cinder Spark',
    hp: 17,
    speed: 96,
    reward: 6,
    score: 8,
    leak: 1,
    radius: 10,
    color: '#f472b6',
    glow: '#ec4899',
  },
  moth: {
    key: 'moth',
    name: 'Gloom Moth',
    hp: 1800,
    speed: 25,
    reward: 200,
    score: 500,
    leak: 10,
    radius: 30,
    color: '#312e81',
    glow: '#6366f1',
  },
};
export const HP_SCALE_PER_WAVE = 0.3;

/** Wave n (1-based) composition: [type, count] pairs plus the spawn gap in seconds. */
export function waveComposition(n) {
  const list = [];
  list.push(['wisp', 8 + 3 * n]);
  if (n >= 3) list.push(['beetle', 2 * n - 4]);
  if (n >= 5) list.push(['spark', 2 * n - 6]);
  if (n === 10) list.push(['moth', 1]);
  const gap = Math.max(0.35, 0.95 - 0.05 * n);
  return { list, gap };
}

export function waveClearBonus(n) {
  return 20 + 5 * n;
}
