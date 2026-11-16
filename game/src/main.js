// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, game over and win.
//
// ?seed=N fixes the waves. ?shot=start|play|end (with &seed=N) stages that scene instead
// of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createGame, updateGame } from './state.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(seed);
const renderer = createRenderer(canvas);
const input = createInput(canvas, game);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

let best = readBest();

function runShot(name) {
  const scene = stageShot(name, game, best);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.best, input.fit());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const screenBefore = game.screen;
    const steps = Math.floor(accumulator / STEP);
    if (game.screen === 'play') {
      for (let i = 0; i < steps; i += 1) {
        const scaled = STEP * game.speed;
        updateGame(game, scaled);
        if (game.screen !== 'play') break;
      }
    }
    accumulator -= steps * STEP;
    if (accumulator < 0) accumulator = 0;
    if (game.screen !== screenBefore) {
      if (game.screen === 'over' || game.screen === 'win') {
        if (game.score > best) {
          best = game.score;
          saveBest(best);
        }
        announce(game.screen === 'win' ? `You win! Score ${game.score}.` : `Game over. Score ${game.score}. Best ${best}.`);
      }
    }
    renderer.draw(game, best, input.fit());
  }

  announce('Lumenhold. Click a plot to build a tower, then send wave one. Press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
