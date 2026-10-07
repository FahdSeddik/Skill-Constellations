const RELIGHT_BUDGET_MS = 6;
const RELIGHT_CHECK = 32;

class Relight {
  constructor(painter, light, hour, t) {
    this.painter = painter;
    this.light = light;
    light.clear(t);
    this.ranges = painter.window(hour);
    this.kind = 0;
  }

  run(budget) {
    const end = performance.now() + budget;
    while (this.kind < this.ranges.length) {
      const range = this.ranges[this.kind];
      while (range[0] < range[1]) {
        this.painter.draws[this.kind](range[0], this.light);
        range[0] += 1;
        if (range[0] % RELIGHT_CHECK === 0 && performance.now() > end) return false;
      }
      this.kind += 1;
    }
    return true;
  }
}

const SkyRelight = {
  relight() {
    this.drop();
    this.active.light.clear(this.clock.t);
    this.painter.replay(this.ledger.hour, this.active.light);
    this.dirty = true;
  },

  relightLater() {
    if (isRecording()) return this.relight();
    this.job = new Relight(this.painter, this.active.next, this.ledger.hour, this.clock.t);
    this.painter.extra = this.active.next;
  },

  drop() {
    this.job = null;
    this.painter.extra = null;
  },

  work() {
    if (!this.job || !this.job.run(RELIGHT_BUDGET_MS)) return;
    this.active.swap();
    this.use(this.active);
    this.drop();
    this.dirty = true;
  },
};
