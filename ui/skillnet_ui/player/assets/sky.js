const HOVER_REACH = 9;
const LOOK_EVERY = 12;

class SkyPanel {
  constructor(host, scene, panel, motion) {
    this.element = element("div", "panel", host);
    this.background = element("canvas", "", this.element);
    this.trailCanvas = element("canvas", "", this.element);
    this.canvas = element("canvas", "", this.element);
    this.context = this.canvas.getContext("2d");
    this.palette = scene.palette;
    this.blend = glowBlend(scene.palette);
    this.typeCount = scene.types.length;
    const count = scene.nodes.spike.length;
    this.run = new Run(panel, count, scene.timing);
    this.run.adoptOrigins(motion);
    this.view = new View(motion, count);
    this.trails = makeTrails(this.trailCanvas, this.run, scene.palette);
    this.lines = new LinkPainter(scene.palette);
    this.stars = new StarPainter(scene.nodes);
    this.hud = new Hud(this.element, panel.title);
    this.rings = new AuditRings(panel);
    this.wx = new Float64Array(count);
    this.wy = new Float64Array(count);
    this.frames = 0;
  }

  resize(ratio, bottom) {
    const box = this.element.getBoundingClientRect();
    this.view.fit(box.width, box.height, ratio, bottom);
    for (const canvas of [this.canvas, this.trailCanvas, this.background]) {
      canvas.width = this.view.width;
      canvas.height = this.view.height;
    }
    this.sprites = spritesFor(this.palette, this.typeCount, this.view.look);
    paintHaze(this.background, this.palette);
  }

  place(t, motion) {
    const run = this.run;
    this.wx.set(motion.wx);
    this.wy.set(motion.wy);
    for (let rank = run.litCount(t - run.glide); rank < run.litCount(t); rank += 1) {
      const node = run.litOrder[rank];
      const origin = run.origin[node];
      if (origin < 0) continue;
      const share = easeInOut(clampUnit((t - run.lit[node]) / run.glide));
      this.wx[node] = this.wx[origin] + (this.wx[node] - this.wx[origin]) * share;
      this.wy[node] = this.wy[origin] + (this.wy[node] - this.wy[origin]) * share;
    }
  }

  extendBox(box, t) {
    let [left, right, bottom, top] = box || [Infinity, -Infinity, Infinity, -Infinity];
    for (let rank = 0; rank < this.run.litCount(t); rank += 1) {
      const node = this.run.litOrder[rank];
      const x = this.wx[node];
      const y = this.wy[node];
      if (Number.isNaN(x)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.min(bottom, y);
      top = Math.max(top, y);
    }
    return left <= right ? [left, right, bottom, top] : box;
  }

  draw(t, frame, stamp, mode) {
    const { context, run, view } = this;
    view.project(frame, this.wx, this.wy);
    this.frames = (this.frames + 1) % LOOK_EVERY;
    if (this.frames === 0 && view.refreshLook(run, run.litCount(t))) {
      this.sprites = spritesFor(this.palette, this.typeCount, view.look);
    }
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, view.width, view.height);
    this.trails.draw(context, view, t);
    this.lines.drawLines(context, run, view, t);
    context.globalCompositeOperation = this.blend;
    this.stars.draw(context, run, view, t, this.sprites);
    this.lines.drawLights(context, run, view, this.sprites);
    this.rings.draw(context, run, view, t, this.palette.ink);
    this.hud.update(stamp, noteLabel(run, mode, t));
  }

  nearest(clientX, clientY, t) {
    const box = this.canvas.getBoundingClientRect();
    const ratio = this.view.ratio;
    const [x, y] = [(clientX - box.left) * ratio, (clientY - box.top) * ratio];
    let best = -1;
    let closest = Math.pow(HOVER_REACH * ratio, 2);
    for (let rank = 0; rank < this.run.litCount(t); rank += 1) {
      const node = this.run.litOrder[rank];
      const distance = Math.pow(this.view.px[node] - x, 2) + Math.pow(this.view.py[node] - y, 2);
      if (distance < closest) [best, closest] = [node, distance];
    }
    return best;
  }
}
