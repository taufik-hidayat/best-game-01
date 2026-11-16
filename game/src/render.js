// Every pixel of LUMENHOLD: the night garden, the path, the lighthouse beam, towers,
// shadows, projectiles, HUD, build bar and all screens. Canvas 2D only, no images.
import { BAR_HEIGHT, FIELD, HUD_HEIGHT, LIGHTHOUSE, PALETTE, PATH_POINTS, PATH_WIDTH, TOTAL_WAVES, TOWER_ORDER, TOWER_TYPES } from './config.js';
import { pointOnPath, pathLength, PLOT_SIZE } from './path.js';
import { towerDamage, towerRange, upgradeCost, sellValue } from './towers.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_TITLE, SCREEN_WIN, uiLayout } from './state.js';
import { createRandom } from './random.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const rng = createRandom(1337);
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: rng.range(0, FIELD.width), y: rng.range(0, 58), r: rng.range(0.6, 2.1), tw: rng.range(0, Math.PI * 2) });
  }
  const grassDots = [];
  for (let i = 0; i < 220; i += 1) {
    grassDots.push({ x: rng.range(0, FIELD.width), y: rng.range(HUD_HEIGHT, FIELD.height - BAR_HEIGHT), r: rng.range(1, 3) });
  }
  const pathStones = [];
  const total = pathLength();
  for (let d = 14; d < total - 10; d += 26) {
    const p = pointOnPath(d);
    pathStones.push({ x: p.x + rng.range(-16, 16), y: p.y + rng.range(-14, 14), r: rng.range(2, 4.5) });
  }

  function drawField(game) {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(game.now * 0.8 + star.tw));
      ctx.fillStyle = '#e8ecff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Moon — high in the sky strip above the grass, so the grass never covers it.
    ctx.fillStyle = '#f5edd0';
    ctx.beginPath();
    ctx.arc(1120, 36, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(245, 237, 208, 0.18)';
    ctx.beginPath();
    ctx.arc(1120, 36, 38, 0, Math.PI * 2);
    ctx.fill();

    // Grass.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT - BAR_HEIGHT);
    ctx.fillStyle = PALETTE.grassDot;
    for (const dot of grassDots) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Path.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PALETTE.pathEdge;
    ctx.lineWidth = PATH_WIDTH + 10;
    ctx.beginPath();
    PATH_POINTS.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = PALETTE.path;
    ctx.lineWidth = PATH_WIDTH;
    ctx.stroke();
    ctx.fillStyle = PALETTE.pathStone;
    for (const stone of pathStones) {
      ctx.beginPath();
      ctx.arc(stone.x, stone.y, stone.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Build plots.
    for (const plot of game.plots) {
      const occupied = game.towers.some((t) => t.plot === plot);
      const hovered = game.hoverPlot === plot;
      ctx.fillStyle = hovered && !occupied ? PALETTE.plotHover : PALETTE.plot;
      ctx.strokeStyle = PALETTE.plotEdge;
      ctx.lineWidth = 2;
      roundRect(ctx, plot.x - PLOT_SIZE / 2, plot.y - PLOT_SIZE / 2, PLOT_SIZE, PLOT_SIZE, 10);
      ctx.fill();
      ctx.stroke();
      if (!occupied) {
        ctx.strokeStyle = 'rgba(255, 201, 77, 0.35)';
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.arc(plot.x, plot.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    drawLighthouse(game);
    drawTowers(game);
    drawEnemies(game);
    drawProjectiles(game);
    game.effects.draw(ctx);
  }

  function drawLighthouse(game) {
    const { x, y } = LIGHTHOUSE;
    // Rotating beam.
    const beamLen = 560;
    const a = game.beamAngle;
    const spread = 0.16;
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.moveTo(x, y - 62);
    ctx.arc(x, y - 62, beamLen, a - spread, a + spread);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.07;
    ctx.beginPath();
    ctx.moveTo(x, y - 62);
    ctx.arc(x, y - 62, beamLen, a - spread * 1.8, a + spread * 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Stone tower.
    ctx.fillStyle = '#3d3a55';
    ctx.beginPath();
    ctx.moveTo(x - 26, y + 26);
    ctx.lineTo(x - 18, y - 52);
    ctx.lineTo(x + 18, y - 52);
    ctx.lineTo(x + 26, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#57547a';
    ctx.fillRect(x - 18, y - 30, 36, 10);
    ctx.fillRect(x - 21, y - 2, 42, 10);
    // Lamp.
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.arc(x, y - 62, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 217, 122, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y - 62, 22, 0, Math.PI * 2);
    ctx.fill();
    // HP pips above the lighthouse.
    for (let i = 0; i < 20; i += 1) {
      ctx.fillStyle = i < game.hp ? '#ff5a5a' : 'rgba(255, 90, 90, 0.18)';
      ctx.fillRect(x - 30 + i * 3.2, y - 84, 2.4, 7);
    }
  }

  function drawTowerShape(game, tower) {
    const { x, y } = tower;
    const top = y - 14;
    // Base.
    ctx.fillStyle = '#232a4a';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a4470';
    ctx.lineWidth = 2;
    ctx.stroke();
    const flicker = 1 + 0.12 * Math.sin(game.now * 9 + x);
    if (tower.type === 'ember') {
      ctx.save();
      ctx.shadowColor = tower.def.glow;
      ctx.shadowBlur = 14 + 8 * tower.flash;
      ctx.fillStyle = tower.def.color;
      ctx.beginPath();
      ctx.moveTo(x, top - 22 * flicker);
      ctx.quadraticCurveTo(x + 11, top - 2, x + 6, top + 8);
      ctx.quadraticCurveTo(x, top + 12, x - 6, top + 8);
      ctx.quadraticCurveTo(x - 11, top - 2, x, top - 22 * flicker);
      ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.moveTo(x, top - 10 * flicker);
      ctx.quadraticCurveTo(x + 5, top + 2, x, top + 7);
      ctx.quadraticCurveTo(x - 5, top + 2, x, top - 10 * flicker);
      ctx.fill();
      ctx.restore();
    } else if (tower.type === 'frost') {
      ctx.save();
      ctx.shadowColor = tower.def.glow;
      ctx.shadowBlur = 12 + 8 * tower.flash;
      ctx.fillStyle = tower.def.color;
      roundRect(ctx, x - 11, top - 18, 22, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#e0faff';
      ctx.beginPath();
      ctx.arc(x, top - 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tower.def.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, top - 5, 13 + 3 * Math.sin(game.now * 3 + x), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(x, top - 4);
      ctx.rotate(game.now * 0.6 + x);
      ctx.shadowColor = tower.def.glow;
      ctx.shadowBlur = 14 + 8 * tower.flash;
      ctx.fillStyle = tower.def.color;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f3e8ff';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Level pips.
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < tower.level ? PALETTE.gold : 'rgba(255, 201, 77, 0.2)';
      ctx.beginPath();
      ctx.arc(x - 10 + i * 10, y + 32, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTowers(game) {
    const selected = game.selectedTower;
    const hovered = game.hoverTower;
    for (const tower of game.towers) {
      if (tower === selected || tower === hovered) {
        ctx.fillStyle = 'rgba(255, 201, 77, 0.08)';
        ctx.strokeStyle = 'rgba(255, 201, 77, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y - 14, towerRange(tower), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    for (const tower of game.towers) drawTowerShape(game, tower);
    if (selected) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(selected.x, selected.y, 30, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEnemies(game) {
    for (const enemy of game.enemies) {
      const { x, y } = enemy;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + enemy.radius * 0.8, enemy.radius, enemy.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = enemy.def.glow;
      ctx.shadowBlur = 12;
      if (enemy.type === 'wisp') {
        ctx.fillStyle = enemy.def.color;
        ctx.beginPath();
        ctx.arc(x, y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e9e4ff';
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'beetle') {
        ctx.fillStyle = enemy.def.color;
        ctx.beginPath();
        ctx.arc(x, y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2f3a55';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, enemy.radius - 5, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.fillStyle = '#ff5a5a';
        ctx.beginPath();
        ctx.arc(x - 5, y - 4, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 5, y - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'spark') {
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4 + Math.sin(game.now * 6 + enemy.wobble) * 0.2);
        ctx.fillStyle = enemy.def.color;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.fillStyle = '#fff0f6';
        ctx.fillRect(-3.5, -3.5, 7, 7);
        ctx.restore();
        ctx.save();
      } else {
        const flap = Math.sin(game.now * 7 + enemy.wobble) * 0.45;
        ctx.fillStyle = '#4c1d95';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.5 - flap * 0.4);
        ctx.beginPath();
        ctx.ellipse(-20, -6, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.5 + flap * 0.4);
        ctx.beginPath();
        ctx.ellipse(20, -6, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = enemy.def.color;
        ctx.beginPath();
        ctx.ellipse(x, y, 9, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(x - 4, y - 12, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (game.now < enemy.slowUntil) {
        ctx.strokeStyle = 'rgba(110, 231, 249, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, enemy.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (enemy.hp < enemy.maxHp) {
        const w = 30;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(x - w / 2, y - enemy.radius - 12, w, 5);
        ctx.fillStyle = enemy.hp / enemy.maxHp > 0.5 ? PALETTE.green : PALETTE.red;
        ctx.fillRect(x - w / 2, y - enemy.radius - 12, w * (enemy.hp / enemy.maxHp), 5);
      }
    }
  }

  function drawProjectiles(game) {
    for (const p of game.projectiles) {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.kind === 'prism' ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawButton(rect, label, enabled = true, highlight = false) {
    ctx.fillStyle = highlight ? '#3a2f10' : '#1c2450';
    ctx.strokeStyle = highlight ? PALETTE.gold : PALETTE.hudEdge;
    ctx.lineWidth = highlight ? 2 : 1.5;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = enabled ? PALETTE.text : PALETTE.textDim;
    ctx.font = 'bold 15px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  function drawHUD(game) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
    ctx.fillStyle = PALETTE.hudEdge;
    ctx.fillRect(0, HUD_HEIGHT - 2, FIELD.width, 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px Trebuchet MS, sans-serif';
    ctx.fillStyle = PALETTE.text;
    const waveLabel = game.wave === 0 ? 'WAVE –/10' : `WAVE ${game.wave}/${TOTAL_WAVES}`;
    ctx.fillText(waveLabel, 18, HUD_HEIGHT / 2);
    ctx.font = 'bold 18px Trebuchet MS, sans-serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`◉ ${game.lumen}`, 150, HUD_HEIGHT / 2);
    ctx.fillStyle = PALETTE.red;
    ctx.fillText(`♥ ${game.hp}`, 250, HUD_HEIGHT / 2);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`SCORE ${game.score}`, 330, HUD_HEIGHT / 2);
    ctx.textBaseline = 'alphabetic';
    const { buttons } = uiLayout();
    const sendLabel = game.waveActive
      ? `Wave ${game.wave}…`
      : game.wave >= TOTAL_WAVES
        ? 'All waves done'
        : game.wave === 0
          ? 'Send Wave 1 ▸'
          : game.countdown > 0
            ? `Next in ${Math.ceil(game.countdown)}s ▸`
            : 'Send Wave ▸';
    drawButton(buttons.sendWave, sendLabel, !game.waveActive && game.wave < TOTAL_WAVES, !game.waveActive);
    drawButton(buttons.speed, game.speed === 1 ? '1× Speed' : '2× Speed');
    drawButton(buttons.pause, game.screen === SCREEN_PAUSED ? '▶ Resume' : '❚❚ Pause');
    drawButton(buttons.sound, game.muted ? '✕ Sound' : '♪ Sound');
    if (game.message) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (game.messageUntil - game.now) / 0.8));
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 17px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.message, FIELD.width / 2, HUD_HEIGHT + 26);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }

  function drawBuildBar(game) {
    const barY = FIELD.height - BAR_HEIGHT;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, barY, FIELD.width, BAR_HEIGHT);
    ctx.fillStyle = PALETTE.hudEdge;
    ctx.fillRect(0, barY, FIELD.width, 2);
    const { cards, towerPanel } = uiLayout();
    if (game.selectedTower) {
      const t = game.selectedTower;
      const cost = upgradeCost(t);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px Trebuchet MS, sans-serif';
      ctx.fillStyle = t.def.color;
      ctx.fillText(`${t.def.name}  ·  Lv ${t.level}`, 24, barY + 30);
      ctx.font = '16px Trebuchet MS, sans-serif';
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText(`DMG ${towerDamage(t)}   RNG ${Math.round(towerRange(t))}   ${t.def.blurb}`, 24, barY + 58);
      ctx.textBaseline = 'alphabetic';
      drawButton(towerPanel.upgrade, cost === null ? 'MAX LEVEL' : `UPGRADE — ${cost} ◉`, cost !== null && game.lumen >= cost);
      drawButton(towerPanel.sell, `SELL +${sellValue(t)} ◉`);
      ctx.textAlign = 'right';
      ctx.font = '14px Trebuchet MS, sans-serif';
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText('U upgrade · X sell', FIELD.width - 14, barY + 46);
      ctx.textAlign = 'left';
      return;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '15px Trebuchet MS, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText('Click a plot to build.', 24, barY + 30);
    ctx.fillText('1 / 2 / 3 pick tower.', 24, barY + 56);
    ctx.textBaseline = 'alphabetic';
    for (const card of cards) {
      const def = TOWER_TYPES[card.key];
      const afford = game.lumen >= def.cost;
      const chosen = game.buildChoice === card.key;
      ctx.fillStyle = chosen ? '#2c2410' : '#141a38';
      ctx.strokeStyle = chosen ? PALETTE.gold : PALETTE.hudEdge;
      ctx.lineWidth = chosen ? 2.5 : 1.5;
      roundRect(ctx, card.x, card.y, card.w, card.h, 10);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 16px Trebuchet MS, sans-serif';
      ctx.fillStyle = def.color;
      ctx.fillText(`${def.short}  [${TOWER_ORDER.indexOf(card.key) + 1}]`, card.x + 12, card.y + 19);
      ctx.font = '15px Trebuchet MS, sans-serif';
      ctx.fillStyle = afford ? PALETTE.gold : PALETTE.red;
      ctx.fillText(`◉ ${def.cost}`, card.x + 12, card.y + 41);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '13px Trebuchet MS, sans-serif';
      ctx.fillText(def.blurb, card.x + 12, card.y + 59);
      ctx.textBaseline = 'alphabetic';
    }
  }

  function drawOverlay(title, lines, buttonLabel, accent) {
    ctx.fillStyle = 'rgba(6, 8, 20, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 58px Trebuchet MS, sans-serif';
    ctx.fillText(title, FIELD.width / 2, 218);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px Trebuchet MS, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 272 + i * 32));
    const btn = { x: FIELD.width / 2 - 150, y: 540, w: 300, h: 56 };
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
    ctx.fill();
    ctx.fillStyle = '#231a05';
    ctx.font = 'bold 20px Trebuchet MS, sans-serif';
    ctx.fillText(buttonLabel, FIELD.width / 2, btn.y + 36);
    ctx.textAlign = 'left';
  }

  function drawTitle(game, best) {
    drawOverlay(
      'LUMENHOLD',
      [
        'Defend the Last Lighthouse from the marching shadows.',
        'Build Ember Spires, Frost Lanterns and Prism Cannons on the grass plots.',
        'Survive all 10 waves — every shadow that reaches the lighthouse costs light.',
        'Mouse to build · 1/2/3 pick a tower · Space sends a wave · P pause · F fast · M mute',
      ],
      '▶  START — SPACE',
      PALETTE.gold,
    );
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '17px Trebuchet MS, sans-serif';
    if (best > 0) ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 500);
    ctx.textAlign = 'left';
  }

  function drawEnd(game, won) {
    const s = game.finalStats || { score: game.score, hpBonus: 0, waves: game.wave, kills: game.kills, leaks: game.leaks, lumenEarned: game.earned, towersBuilt: game.towersBuilt, timePlayed: 0 };
    const minutes = Math.floor(s.timePlayed / 60);
    const seconds = String(s.timePlayed % 60).padStart(2, '0');
    drawOverlay(
      won ? 'THE DAWN BREAKS!' : 'THE LIGHT HAS FALLEN',
      won
        ? [
            `You held the lighthouse through all ${TOTAL_WAVES} waves.`,
            `Score ${s.score}  ·  Shadows banished ${s.kills}  ·  Leaks ${s.leaks}`,
            `Lighthouse bonus +${s.hpBonus}  ·  Lumen earned ${s.lumenEarned}  ·  Towers built ${s.towersBuilt}`,
            `Time ${minutes}:${seconds}`,
          ]
        : [
            `The shadows reached the lighthouse on wave ${s.waves} of ${TOTAL_WAVES}.`,
            `Score ${s.score}  ·  Shadows banished ${s.kills}  ·  Leaks ${s.leaks}`,
            `Lumen earned ${s.lumenEarned}  ·  Towers built ${s.towersBuilt}  ·  Time ${minutes}:${seconds}`,
            'Build nearer the bends — towers there cover the road twice.',
          ],
      '↻  PLAY AGAIN — SPACE',
      won ? PALETTE.gold : PALETTE.red,
    );
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(6, 8, 20, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 52px Trebuchet MS, sans-serif';
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.font = '20px Trebuchet MS, sans-serif';
    ctx.fillText('Press P to resume', FIELD.width / 2, 380);
    ctx.textAlign = 'left';
  }

  return {
    draw(game, best, fit) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const shakeX = game.effects.shake > 0 ? (Math.random() - 0.5) * game.effects.shake : 0;
      const shakeY = game.effects.shake > 0 ? (Math.random() - 0.5) * game.effects.shake : 0;
      ctx.setTransform(dpr * fit.scale, 0, 0, dpr * fit.scale, dpr * (fit.ox + shakeX), dpr * (fit.oy + shakeY));
      drawField(game);
      if (game.screen !== SCREEN_TITLE) {
        drawHUD(game);
        drawBuildBar(game);
      }
      if (game.screen === SCREEN_TITLE) drawTitle(game, best);
      else if (game.screen === SCREEN_PAUSED) drawPaused();
      else if (game.screen === SCREEN_OVER) drawEnd(game, false);
      else if (game.screen === SCREEN_WIN) drawEnd(game, true);
    },
  };
}
