const VIEW_EASE = 0.12;
const VIEW_FILL = 1.02;
const VIEW_DEEPEST_PIXELS = 9;
const VIEW_SHALLOWEST = 0.7;
const VIEW_SETTLED = 1e-4;

class SkyCamera {
  constructor(size, key) {
    this.size = size;
    this.home = [1, size / 2, size / 2];
    this.key = key;
    const saved = readStore(key);
    this.user = Boolean(saved && saved.user);
    this.goal = this.user ? saved.goal : [...this.home];
    this.now = [...this.goal];
    this.savedAt = 0;
  }

  save(now) {
    if (now - this.savedAt < SAVE_EVERY_MS) return;
    writeStore(this.key, { goal: this.goal, user: this.user });
    this.savedAt = now;
  }

  fit(width, height, room) {
    this.width = width;
    this.height = height;
    const tall = height - room.top - room.bottom;
    this.base = (Math.min(width, tall) * VIEW_FILL) / this.size;
    this.middle = [width / 2, room.top + tall / 2];
    this.deepest = VIEW_DEEPEST_PIXELS / this.base;
  }

  transform(frame = this.now) {
    const scale = this.base * frame[0];
    return [scale, this.middle[0] - frame[1] * scale, this.middle[1] - frame[2] * scale];
  }

  toWorld(sx, sy) {
    const [scale, ox, oy] = this.transform();
    return [(sx - ox) / scale, (sy - oy) / scale];
  }

  step(seconds) {
    const share = 1 - Math.exp(-seconds / VIEW_EASE);
    const [zoom, x, y] = this.now;
    const next = [
      Math.exp(Math.log(zoom) + (Math.log(this.goal[0]) - Math.log(zoom)) * share),
      x + (this.goal[1] - x) * share,
      y + (this.goal[2] - y) * share,
    ];
    const shift = Math.hypot(next[1] - this.goal[1], next[2] - this.goal[2]) * this.transform(next)[0];
    const moving = Math.abs(Math.log(next[0] / this.goal[0])) > VIEW_SETTLED || shift > 0.05;
    this.now = moving ? next : [...this.goal];
    return moving;
  }

  zoomAt(sx, sy, factor) {
    this.user = true;
    const [wx, wy] = this.toWorld(sx, sy);
    const zoom = Math.min(this.deepest, Math.max(VIEW_SHALLOWEST, this.goal[0] * factor));
    const scale = this.base * zoom;
    this.goal = [zoom, wx - (sx - this.middle[0]) / scale, wy - (sy - this.middle[1]) / scale];
  }

  panBy(dx, dy) {
    this.user = true;
    const scale = this.base * this.now[0];
    this.goal = [this.goal[0], this.goal[1] - dx / scale, this.goal[2] - dy / scale];
    this.now = [this.now[0], this.now[1] - dx / scale, this.now[2] - dy / scale];
  }

  hold(view) {
    this.user = true;
    this.goal = [...view];
    this.now = [...view];
  }

  reset() {
    this.user = false;
    this.goal = [...this.home];
  }
}
