// Keyboard and mouse: translate window events into logical field coordinates and
// hand them to the state machine. The canvas letterboxes the 1280x720 field.
import { FIELD } from './config.js';
import { handleClick, handleKey, plotAt } from './state.js';
import { unlockAudio } from './audio.js';

export function fitCanvas(canvas) {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  const ox = (window.innerWidth - FIELD.width * scale) / 2;
  const oy = (window.innerHeight - FIELD.height * scale) / 2;
  return { scale, ox, oy };
}

export function createInput(canvas, game) {
  let mouse = { x: -100, y: -100 };
  let fit = fitCanvas(canvas);

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - fit.ox) / fit.scale,
      y: (event.clientY - rect.top - fit.oy) / fit.scale,
    };
  }

  function resize() {
    fit = fitCanvas(canvas);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  window.addEventListener('resize', resize);
  resize();

  canvas.addEventListener('mousemove', (event) => {
    mouse = toLogical(event);
    const plot = plotAt(game, mouse.x, mouse.y);
    game.hoverPlot = plot;
    game.hoverTower = plot ? game.towers.find((t) => t.plot === plot) || null : null;
  });
  canvas.addEventListener('mousedown', (event) => {
    unlockAudio();
    const pos = toLogical(event);
    handleClick(game, pos.x, pos.y);
  });
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    game.selectedPlot = null;
    game.selectedTower = null;
  });
  window.addEventListener('keydown', (event) => {
    if ([' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
    unlockAudio();
    handleKey(game, event.key);
  });

  return {
    mouse() {
      return mouse;
    },
    fit() {
      return fit;
    },
  };
}
