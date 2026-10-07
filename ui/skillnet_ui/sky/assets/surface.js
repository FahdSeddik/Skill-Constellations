const MOTION_RATIO = 0.5;

class Surface {
  constructor(host, ratio, sky) {
    this.ratio = ratio;
    this.canvas = element("canvas", "surface", host);
    this.context = this.canvas.getContext("2d", { alpha: false });
    this.stars = new StarLayer(sky.map, sky.data, sky.levels, sky.scene, ratio);
    this.light = new LightLayer();
    this.next = new LightLayer();
  }

  resize(width, height, palette) {
    const w = Math.max(1, Math.round(width * this.ratio));
    const h = Math.max(1, Math.round(height * this.ratio));
    [this.canvas.width, this.canvas.height] = [w, h];
    this.image = this.context.createImageData(w, h);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.stars.resize(w, h, skyBackground(w, h, palette));
    this.light.resize(w, h);
    this.next.resize(w, h);
  }

  swap() {
    [this.light, this.next] = [this.next, this.light];
  }

  frame(transform) {
    return transform.map((value) => value * this.ratio);
  }

  present(gain, table) {
    compose(this.pixels, this.stars.buffer, this.light.buffer, gain, table);
    this.context.putImageData(this.image, 0, 0);
  }

  show(on) {
    this.canvas.classList.toggle("on", on);
  }
}

const SkyMotion = {
  use(surface) {
    this.active = surface;
    for (const each of this.surfaces) each.show(each === surface);
    this.painter.use(surface.stars, surface.light, surface.ratio);
  },

  turn(transform, now) {
    if (isRecording()) return this.reframe(transform);
    const [full, quick] = this.surfaces;
    if (this.active === full) {
      this.drop();
      quick.light.shrink(full.light);
      this.use(quick);
    }
    quick.light.warp(quick.frame(this.transform), quick.frame(transform));
    this.transform = transform;
    quick.stars.paint(quick.frame(transform), this.ledger.held, false);
    this.painter.setView(quick.frame(transform));
    this.turnedAt = now;
    this.dirty = true;
  },

  settle() {
    const [full, quick] = this.surfaces;
    full.light.grow(quick.light);
    this.use(full);
    full.stars.paint(full.frame(this.transform), this.ledger.held, false);
    this.painter.setView(full.frame(this.transform));
    this.relightLater();
    this.dirty = true;
  },
};
