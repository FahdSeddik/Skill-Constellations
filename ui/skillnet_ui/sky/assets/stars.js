const STAR_BASE = 0.6;
const STAR_GAIN = 0.24;
const STAR_CAP = 2.6;
const GLOW_FROM = 24;
const GLOW_GAIN = 0.2;
const FIELD_DIM = 0.32;
const STAR_MARGIN = 32;
const CORE_PROFILE = (distance) => Math.exp(-4.6 * distance * distance);
const GLOW_PROFILE = (distance) => (distance >= 1 ? 0 : (1 - distance) ** 2 / (1 + 14 * distance * distance));

function unitRgb(hex) {
  return hexToRgb(hex).map((value) => value / 255);
}

function coreLight(held) {
  return held > 0 ? Math.min(STAR_CAP, STAR_BASE + STAR_GAIN * Math.log2(held)) : 0;
}

function glowLight(held) {
  return held >= GLOW_FROM ? GLOW_GAIN * Math.log2((2 * held) / GLOW_FROM) : 0;
}

class StarLayer {
  constructor(map, data, levels, scene, ratio) {
    Object.assign(this, { map, ratio, coreOf: levels.core, glowOf: levels.glow });
    this.data = data;
    this.field = data.nfield;
    this.type = data.ntype;
    this.tone = starTones(data, scene.clumps);
    this.coloured = scene.clumps.coloured;
    this.colours = starColours(scene.palette);
    this.tints = tintColors(scene.palette, scene.types.length).map(unitRgb);
  }

  recolour(clumps) {
    this.tone = starTones(this.data, clumps);
    this.coloured = clumps.coloured;
  }

  resize(width, height, background) {
    this.width = width;
    this.height = height;
    this.buffer = new Float32Array(width * height * 3);
    this.background = background;
    this.scale = 0;
  }

  look(scale) {
    if (scale === this.scale) return;
    const css = scale / this.ratio;
    const radius = 0.8 * Math.sqrt(css) * this.ratio;
    this.coreKernel = radius > 1 ? radialKernel(radius * 1.6, CORE_PROFILE) : null;
    this.glowKernel = radialKernel((4 + 3 * Math.log2(1 + css / 0.2)) * this.ratio, GLOW_PROFILE);
    this.level = Math.min(1, 0.3 + 0.3 * css) * Math.sqrt(this.ratio);
    this.scale = scale;
  }

  measure(held) {
    for (let node = 0; node < held.length; node += 1) {
      this.coreOf[node] = coreLight(held[node]) * (this.field[node] === 1 ? FIELD_DIM : 1);
      this.glowOf[node] = glowLight(held[node]);
    }
  }

  paint(transform, held, fresh) {
    this.look(transform[0]);
    this.transform = transform;
    if (fresh) this.measure(held);
    this.buffer.set(this.background);
    if (this.coreKernel) this.paintKernels();
    else paintPoints(this, transform, this.coreOf, this.level);
    for (let node = 0; node < this.glowOf.length; node += 1) {
      if (this.glowOf[node] > 0) this.splat(node, 0, this.glowOf[node]);
    }
  }

  paintKernels() {
    for (let node = 0; node < this.coreOf.length; node += 1) {
      if (this.coreOf[node] > 0) this.splat(node, this.coreOf[node], 0);
    }
  }

  adjust(node, before, after) {
    const dim = this.field[node] === 1 ? FIELD_DIM : 1;
    const core = coreLight(after) * dim;
    const glow = glowLight(after);
    this.splat(node, core - this.coreOf[node], glow - this.glowOf[node]);
    this.coreOf[node] = core;
    this.glowOf[node] = glow;
  }

  splat(node, core, glow) {
    const [scale, ox, oy] = this.transform;
    const x = this.map.wx[node] * scale + ox;
    const y = this.map.wy[node] * scale + oy;
    if (x < -STAR_MARGIN || y < -STAR_MARGIN || x > this.width + STAR_MARGIN || y > this.height + STAR_MARGIN) return;
    const tone = this.colours[this.tone[node]];
    if (core !== 0 && this.coreKernel) addKernel(this, this.coreKernel, x, y, tone, core * this.level);
    else if (core !== 0) addPoint(this, x, y, tone, core * this.level);
    const halo = this.coloured ? tone : this.tints[this.type[node]];
    if (glow !== 0) addKernel(this, this.glowKernel, x, y, halo, glow * this.level);
  }
}

function paintPoints(layer, transform, levels, level) {
  const { buffer, width, height, map, tone, colours } = layer;
  const [scale, ox, oy] = transform;
  for (let node = 0; node < levels.length; node += 1) {
    const amount = levels[node] * level;
    if (amount === 0) continue;
    const x = map.wx[node] * scale + ox - 0.5;
    const y = map.wy[node] * scale + oy - 0.5;
    if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) continue;
    const left = x | 0;
    const top = y | 0;
    const fx = x - left;
    const fy = y - top;
    const rgb = colours[tone[node]];
    const at = (top * width + left) * 3;
    const below = at + width * 3;
    const upper = (1 - fy) * amount;
    const lower = fy * amount;
    for (let channel = 0; channel < 3; channel += 1) {
      const value = rgb[channel];
      buffer[at + channel] += value * (1 - fx) * upper;
      buffer[at + 3 + channel] += value * fx * upper;
      buffer[below + channel] += value * (1 - fx) * lower;
      buffer[below + 3 + channel] += value * fx * lower;
    }
  }
}
