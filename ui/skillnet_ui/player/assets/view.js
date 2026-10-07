const UNIT_BASE = 640;
const HUD_ROOM = 64;
const MARGIN = 26;
const SPACING_REFERENCE = 18;
const CROWD_FLOOR = 0.1;
const CROWD_SHARE = 0.9;
const CROWD_STEP = 0.1;
const MAGNIFY_POWER = 0.3;

function extent(values) {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return low <= high ? [low, Math.max(high, low + 1e-6)] : [-1, 1];
}

function crowding(px, py, order, count, ratio) {
  if (count < 2) return 1;
  let cx = 0;
  let cy = 0;
  for (let rank = 0; rank < count; rank += 1) {
    cx += px[order[rank]] / count;
    cy += py[order[rank]] / count;
  }
  const reach = Float64Array.from({ length: count }, (_, rank) => {
    const node = order[rank];
    return Math.hypot(px[node] - cx, py[node] - cy);
  }).sort();
  const radius = reach[Math.floor((count - 1) * CROWD_SHARE)] / ratio;
  const spacing = Math.sqrt((Math.PI * radius * radius) / (CROWD_SHARE * count));
  return Math.min(1, Math.max(CROWD_FLOOR, spacing / SPACING_REFERENCE));
}

function lookFor(crowd) {
  return {
    crowd,
    core: CORE / (0.3 + 0.7 * crowd),
    glow: 0.35 + 0.65 * crowd,
    reach: 0.35 + 0.65 * crowd,
    trail: 0.35 + 0.65 * crowd,
    width: 0.7 + 0.3 * crowd,
    flash: 0.45 + 0.55 * crowd,
    faintest: Math.min(1, 0.4 + 0.5 * crowd),
  };
}

class View {
  constructor(motion, count) {
    this.spans = motion.extent.map(([low, high]) => high - low);
    this.centre = motion.extent.map(([low, high]) => (low + high) / 2);
    this.px = new Float32Array(count);
    this.py = new Float32Array(count);
    this.look = lookFor(1);
    this.version = 0;
  }

  fit(width, height, ratio, bottom) {
    this.width = Math.max(1, Math.round(width * ratio));
    this.height = Math.max(1, Math.round(height * ratio));
    this.ratio = ratio;
    this.unit = (Math.min(width, height) / UNIT_BASE) * ratio;
    const room = [width - 2 * MARGIN, height - HUD_ROOM - MARGIN - bottom];
    this.scale = Math.min(room[0] / this.spans[0], room[1] / this.spans[1]) * ratio;
    this.middle = [this.width / 2, (HUD_ROOM + room[1] / 2) * ratio];
    this.version += 1;
  }

  project(frame, wx, wy) {
    const [zoom, x, y] = frame;
    const size = this.scale * zoom;
    for (let node = 0; node < wx.length; node += 1) {
      this.px[node] = this.middle[0] + (wx[node] - x) * size;
      this.py[node] = this.middle[1] - (wy[node] - y) * size;
    }
    this.frame = frame;
    this.magnify = Math.pow(Math.max(zoom, 1), MAGNIFY_POWER);
  }

  toWorld(sx, sy) {
    const [zoom, x, y] = this.frame;
    const size = this.scale * zoom;
    return [x + (sx - this.middle[0]) / size, y - (sy - this.middle[1]) / size];
  }

  refreshLook(run, count) {
    const crowd = crowding(this.px, this.py, run.litOrder, count, this.ratio);
    const stepped = Math.round(Math.min(1, crowd / this.magnify) / CROWD_STEP) * CROWD_STEP;
    if (Math.abs(stepped - this.look.crowd) < 1e-9) return false;
    this.look = lookFor(Math.max(CROWD_FLOOR, stepped));
    return true;
  }
}
