const EXPOSURE_CELL = 9;
const EXPOSURE_TARGET = 5;
const EXPOSURE_FLOOR = 0.22;
const EXPOSURE_STEP = 0.02;
const EXPOSURE_ZOOM_STEP = 0.15;
const EXPOSURE_EVERY = 20;
const CELL_OFFSET = 32768;

function cellKey(column, row) {
  return (column + CELL_OFFSET) * 65536 + row + CELL_OFFSET;
}

class Exposure {
  constructor(count) {
    this.level = new Float32Array(count).fill(1);
    this.exposedAt = -1;
    this.zoom = 0;
    this.fitted = 0;
    this.calls = 0;
  }

  update(run, view, count) {
    const stale = Math.abs(count - this.exposedAt) > Math.max(3, count * EXPOSURE_STEP);
    const zoomed = Math.abs(view.frame[0] / this.zoom - 1) > EXPOSURE_ZOOM_STEP;
    this.calls = (this.calls + 1) % EXPOSURE_EVERY;
    if (!stale && !zoomed && this.calls > 0 && this.fitted === view.version) return;
    const cell = EXPOSURE_CELL * view.ratio;
    const columns = new Int32Array(count);
    const rows = new Int32Array(count);
    const counts = new Map();
    for (let rank = 0; rank < count; rank += 1) {
      const node = run.litOrder[rank];
      columns[rank] = Math.floor(view.px[node] / cell);
      rows[rank] = Math.floor(view.py[node] / cell);
      const key = cellKey(columns[rank], rows[rank]);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (let rank = 0; rank < count; rank += 1) {
      const crowd = this.neighbours(counts, columns[rank], rows[rank]);
      this.level[run.litOrder[rank]] = Math.max(EXPOSURE_FLOOR, Math.min(1, Math.sqrt(EXPOSURE_TARGET / crowd)));
    }
    this.exposedAt = count;
    this.zoom = view.frame[0];
    this.fitted = view.version;
  }

  neighbours(counts, column, row) {
    let total = 0;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) total += counts.get(cellKey(column + dx, row + dy)) || 0;
    }
    return total;
  }
}
