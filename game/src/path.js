// The winding path the shadows march, and the build plots on the grass beside it.
// Plots are laid out on a grid; any cell too close to the path or the lighthouse is
// skipped, so a tower never sits on the road.
import { FIELD, LIGHTHOUSE, PATH_POINTS, PATH_WIDTH } from './config.js';

export const PLOT_SIZE = 56;
const GRID_STEP = 86;
const GRID_X0 = 62;
const GRID_Y0 = 104;

/** Distance from a point to one segment of the path. */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function distanceToPath(x, y) {
  let best = Infinity;
  for (let i = 0; i + 1 < PATH_POINTS.length; i += 1) {
    const [ax, ay] = PATH_POINTS[i];
    const [bx, by] = PATH_POINTS[i + 1];
    best = Math.min(best, distanceToSegment(x, y, ax, ay, bx, by));
  }
  return best;
}

/** Every buildable plot: {x, y} of its centre, plus its column/row for the autopilot. */
export function buildPlots() {
  const plots = [];
  for (let row = 0; ; row += 1) {
    const y = GRID_Y0 + row * GRID_STEP;
    if (y > FIELD.height - 96) break;
    for (let col = 0; ; col += 1) {
      const x = GRID_X0 + col * GRID_STEP;
      if (x > FIELD.width - 40) break;
      if (distanceToPath(x, y) < PATH_WIDTH / 2 + PLOT_SIZE / 2 + 8) continue;
      if (Math.hypot(x - LIGHTHOUSE.x, y - LIGHTHOUSE.y) < 110) continue;
      plots.push({ x, y, col, row });
    }
  }
  return plots;
}

/** Walk the path: given a travelled distance, return the position on the path. */
export function pointOnPath(distance) {
  let rest = distance;
  for (let i = 0; i + 1 < PATH_POINTS.length; i += 1) {
    const [ax, ay] = PATH_POINTS[i];
    const [bx, by] = PATH_POINTS[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (rest <= len) {
      const t = len === 0 ? 0 : rest / len;
      return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
    }
    rest -= len;
  }
  const last = PATH_POINTS[PATH_POINTS.length - 1];
  return { x: last[0], y: last[1] };
}

export function pathLength() {
  let total = 0;
  for (let i = 0; i + 1 < PATH_POINTS.length; i += 1) {
    total += Math.hypot(PATH_POINTS[i + 1][0] - PATH_POINTS[i][0], PATH_POINTS[i + 1][1] - PATH_POINTS[i][1]);
  }
  return total;
}
