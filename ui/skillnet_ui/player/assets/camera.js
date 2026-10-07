const AUTO_EASE = 0.5;
const USER_EASE = 0.12;
const AUTO_ROOM = 1.2;
const AUTO_CLOSEST = 24;
const USER_ZOOM = [0.6, 40];
const SETTLED = 1e-4;

function easeFrame(now, goal, share) {
  const zoom = Math.exp(Math.log(now[0]) + (Math.log(goal[0]) - Math.log(now[0])) * share);
  return [zoom, now[1] + (goal[1] - now[1]) * share, now[2] + (goal[2] - now[2]) * share];
}

class Camera {
  constructor(view) {
    this.home = [1, view.centre[0], view.centre[1]];
    this.spans = view.spans;
    this.now = [...this.home];
    this.goal = [...this.home];
    this.user = false;
  }

  fit(box) {
    if (!box) return this.home;
    const share = Math.max((box[1] - box[0]) / this.spans[0], (box[3] - box[2]) / this.spans[1]);
    const zoom = Math.min(AUTO_CLOSEST, Math.max(1, 1 / Math.max(share * AUTO_ROOM, 1e-9)));
    return [zoom, (box[0] + box[1]) / 2, (box[2] + box[3]) / 2];
  }

  settled(frame) {
    const shift = Math.hypot(frame[1] - this.goal[1], frame[2] - this.goal[2]) * this.goal[0];
    return Math.abs(Math.log(frame[0] / this.goal[0])) < SETTLED && shift < SETTLED * this.spans[0];
  }

  step(seconds, box) {
    if (!this.user) this.goal = this.fit(box);
    const share = 1 - Math.exp(-seconds / (this.user ? USER_EASE : AUTO_EASE));
    const next = easeFrame(this.now, this.goal, share);
    const moving = !this.settled(next);
    this.now = moving ? next : [...this.goal];
    return moving;
  }

  take() {
    if (!this.user) this.goal = [...this.now];
    this.user = true;
  }

  zoomAt(view, sx, sy, factor) {
    this.take();
    const [wx, wy] = view.toWorld(sx, sy);
    const zoom = Math.min(USER_ZOOM[1], Math.max(USER_ZOOM[0], this.goal[0] * factor));
    const size = view.scale * zoom;
    this.goal = [zoom, wx - (sx - view.middle[0]) / size, wy + (sy - view.middle[1]) / size];
  }

  panBy(view, dx, dy) {
    this.take();
    const size = view.scale * this.now[0];
    this.goal = [this.goal[0], this.goal[1] - dx / size, this.goal[2] + dy / size];
    this.now = [this.now[0], this.now[1] - dx / size, this.now[2] + dy / size];
  }

  release() {
    this.user = false;
  }
}
