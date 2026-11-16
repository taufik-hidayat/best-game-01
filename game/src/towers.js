// Towers: what they cost, how they aim, what they fire. A tower is plain data on a
// plot; projectiles are plain data too, chased in the state update.
import { TOWER_TYPES, UPGRADE_COST_FACTOR, UPGRADE_DAMAGE_FACTOR, UPGRADE_RANGE_FACTOR } from './config.js';
import { applyDamage, applySlow } from './enemies.js';

export function createTower(typeKey, plot) {
  const def = TOWER_TYPES[typeKey];
  return {
    type: typeKey,
    def,
    x: plot.x,
    y: plot.y,
    plot,
    level: 1,
    invested: def.cost,
    cooldown: 0,
    angle: -Math.PI / 2,
    flash: 0,
  };
}

export function towerDamage(tower) {
  return Math.round(tower.def.damage * UPGRADE_DAMAGE_FACTOR[tower.level - 1]);
}

export function towerRange(tower) {
  return tower.def.range * UPGRADE_RANGE_FACTOR[tower.level - 1];
}

export function upgradeCost(tower) {
  if (tower.level >= 3) return null;
  return Math.round(tower.def.cost * UPGRADE_COST_FACTOR[tower.level]);
}

export function sellValue(tower) {
  return Math.floor(tower.invested * 0.7);
}

/** First (furthest along the path) enemy inside the tower's range, or null. */
function pickTarget(tower, enemies) {
  const range = towerRange(tower);
  let best = null;
  for (const enemy of enemies) {
    if (enemy.dead || enemy.leaked) continue;
    const d = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
    if (d > range + enemy.radius) continue;
    if (!best || enemy.distance > best.distance) best = enemy;
  }
  return best;
}

export function createProjectile(tower, target) {
  return {
    x: tower.x,
    y: tower.y - 14,
    target,
    speed: tower.def.projectileSpeed,
    damage: towerDamage(tower),
    splash: tower.def.splash || 0,
    slowFactor: tower.def.slowFactor || 0,
    slowSeconds: tower.def.slowSeconds || 0,
    kind: tower.type,
    color: tower.def.color,
    dead: false,
  };
}

/** Fire every ready tower; returns how many shots fired and the first shot's kind. */
export function updateTowers(towers, enemies, projectiles, dt) {
  let shots = 0;
  let kind = null;
  for (const tower of towers) {
    tower.cooldown -= dt;
    tower.flash = Math.max(0, tower.flash - dt * 6);
    const target = pickTarget(tower, enemies);
    if (!target) continue;
    tower.angle = Math.atan2(target.y - (tower.y - 14), target.x - tower.x);
    if (tower.cooldown > 0) continue;
    tower.cooldown = 1 / tower.def.rate;
    tower.flash = 1;
    projectiles.push(createProjectile(tower, target));
    if (shots === 0) kind = tower.type;
    shots += 1;
  }
  return { shots, kind };
}

/** Move projectiles; on hit, damage the target (and splash neighbours). Returns hits. */
export function updateProjectiles(projectiles, enemies, dt, now, onHit) {
  const hits = [];
  for (const p of projectiles) {
    if (p.dead) continue;
    if (!p.target || p.target.dead || p.target.leaked) {
      p.dead = true;
      continue;
    }
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= step + p.target.radius * 0.5) {
      p.dead = true;
      applyDamage(p.target, p.damage);
      if (p.slowFactor) applySlow(p.target, p.slowFactor, p.slowSeconds, now);
      if (p.splash) {
        for (const other of enemies) {
          if (other === p.target || other.dead || other.leaked) continue;
          if (Math.hypot(other.x - p.target.x, other.y - p.target.y) <= p.splash) {
            applyDamage(other, Math.round(p.damage * 0.6));
          }
        }
      }
      hits.push({ x: p.target.x, y: p.target.y, kind: p.kind, damage: p.damage });
      if (onHit) onHit(p);
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
  }
  return hits;
}
