// The shadows that march the path: spawning, walking, slowing and dying.
// An enemy is plain data; the state machine owns the arrays.
import { ENEMY_TYPES, HP_SCALE_PER_WAVE } from './config.js';
import { pointOnPath, pathLength } from './path.js';

export function createEnemy(type, wave, rng) {
  const def = ENEMY_TYPES[type];
  const hpMul = 1 + HP_SCALE_PER_WAVE * (wave - 1);
  const start = pointOnPath(0);
  return {
    type,
    def,
    x: start.x,
    y: start.y,
    distance: 0,
    hp: Math.round(def.hp * hpMul),
    maxHp: Math.round(def.hp * hpMul),
    speed: def.speed * rng.range(0.92, 1.08),
    slowUntil: 0,
    slowFactor: 1,
    wobble: rng.range(0, Math.PI * 2),
    wobbleSpeed: rng.range(1.5, 3),
    radius: def.radius,
    dead: false,
    leaked: false,
  };
}

/** Move one enemy along the path for dt seconds; returns true when it reaches the lighthouse. */
export function updateEnemy(enemy, dt, now) {
  const slow = now < enemy.slowUntil ? enemy.slowFactor : 1;
  const step = enemy.speed * slow * dt;
  enemy.distance += step;
  const pos = pointOnPath(enemy.distance);
  const wob = Math.sin(enemy.wobble + now * enemy.wobbleSpeed) * 3;
  enemy.x = pos.x;
  enemy.y = pos.y + wob * 0.4;
  return enemy.distance >= pathLength() - 4;
}

export function applyDamage(enemy, damage) {
  enemy.hp -= damage;
  if (enemy.hp <= 0) enemy.dead = true;
}

export function applySlow(enemy, factor, seconds, now) {
  enemy.slowFactor = Math.min(enemy.slowFactor === 1 ? factor : Math.min(enemy.slowFactor, factor), factor);
  enemy.slowUntil = Math.max(enemy.slowUntil, now + seconds);
}
