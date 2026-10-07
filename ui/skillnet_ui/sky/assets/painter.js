const BIRTH_LIGHT = 0.4;
const FIELD_BIRTH = 0.45;
const ORIGIN_LIGHT = 0.1;
const RISK_LIGHT = 0.42;
const RISK_DIM = isRecording() ? 0.25 : 0.4;
const COPY_LIGHT = 0.9;
const COPY_SIDES = [[0, 1], [1, 0.3], [-1, 0.3]];
const RISK_SIDES = isRecording() ? [[0, 1], [1, 0.6], [-1, 0.6]] : [[0, 1]];
const LINE_START = 0.25;
const HALO_FROM = 150;
const HALO_LIGHT = 0.5;
const SPARKLE_PROFILE = (distance, x, y) => {
  const arm = x === 0 || y === 0 ? (1 - distance) ** 2 : 0;
  return Math.max(arm, Math.exp(-14 * distance * distance));
};

function boosted(count) {
  return 1 + 0.3 * Math.log2(count);
}

function drawBand(light, ends, amount, sides, tone) {
  const [x0, y0, x1, y1] = ends;
  const length = Math.max(Math.hypot(x1 - x0, y1 - y0), 1e-6);
  const [nx, ny] = [(y0 - y1) / length, (x1 - x0) / length];
  for (const [side, share] of sides) {
    const line = [x0 + nx * side, y0 + ny * side, x1 + nx * side, y1 + ny * side, amount * share * LINE_START, amount * share];
    drawLine(light, line, tone);
  }
}

class EventPainter {
  constructor(data, map, ledger, palette) {
    Object.assign(this, { data, map, ledger });
    this.tones = {
      star: unitRgb(palette.star), glow: unitRgb(palette.glow),
      trail: unitRgb(palette.trail), risk: isRecording() ? vividRgb(palette.risk) : unitRgb(palette.risk),
    };
    this.halos = new Map();
    this.risk = false;
    this.extra = null;
    this.draws = [(row, light) => this.drawBirth(row, light), (row, light) => this.drawArrival(row, light), (row, light) => this.drawCopy(row, light)];
  }

  use(stars, light, ratio) {
    Object.assign(this, { stars, light, ratio });
  }

  setView(transform) {
    this.transform = transform;
    this.reach = Math.min(2.2, Math.max(1, Math.sqrt(transform[0] / this.ratio / 0.25))) * this.ratio;
    this.sparkle = radialKernel(3.5 * this.reach, SPARKLE_PROFILE);
    this.halos.clear();
  }

  at(node) {
    const [scale, ox, oy] = this.transform;
    return [this.map.wx[node] * scale + ox, this.map.wy[node] * scale + oy];
  }

  live(kind, row) {
    this.draws[kind](row, this.light);
    if (this.extra) this.draws[kind](row, this.extra);
  }

  birth(row, node, before) {
    this.stars.adjust(node, before, this.ledger.held[node]);
    this.live(0, row);
  }

  arrival(row, node, before) {
    this.stars.adjust(node, before, this.ledger.held[node]);
    this.live(1, row);
  }

  copy(row) {
    this.live(2, row);
  }

  drawBirth(row, light) {
    const data = this.data;
    const weight = light.weight(data.bh[row] / WEEK_HOURS);
    const count = data.bc[row];
    const node = data.bn[row];
    const [x, y] = this.at(node);
    const amount = weight * BIRTH_LIGHT * boosted(count) * (data.nfield[node] ? FIELD_BIRTH : 1);
    addKernel(light, this.sparkle, x, y, this.tones.star, amount);
    if (count >= HALO_FROM) this.halo(light, x, y, count, weight);
  }

  drawArrival(row, light) {
    const data = this.data;
    const weight = light.weight(data.ah[row] / WEEK_HOURS);
    const risky = this.risk && data.ar[row] > 0;
    const level = risky ? RISK_LIGHT * boosted(data.ar[row]) : ORIGIN_LIGHT * boosted(data.ac[row]);
    const amount = weight * level * (this.risk && !risky ? RISK_DIM : 1);
    const [x0, y0] = this.at(data.ao[row]);
    const [x1, y1] = this.at(data.ad[row]);
    if (risky) drawBand(light, [x0, y0, x1, y1], amount, RISK_SIDES, this.tones.risk);
    else drawLine(light, [x0, y0, x1, y1, amount * LINE_START, amount], this.tones.trail);
  }

  drawCopy(row, light) {
    const data = this.data;
    const weight = light.weight(data.ch[row] / WEEK_HOURS);
    const [x0, y0] = this.at(data.cs[row]);
    const [x1, y1] = this.at(data.cc[row]);
    drawBand(light, [x0, y0, x1, y1], weight * COPY_LIGHT, COPY_SIDES, this.tones.glow);
    if (data.cl[row] >= HALO_FROM) this.halo(light, x1, y1, data.cl[row], weight);
  }

  halo(light, x, y, count, weight) {
    const radius = Math.round((10 + 6 * Math.log2(count / HALO_FROM)) * this.reach);
    if (!this.halos.has(radius)) this.halos.set(radius, radialKernel(radius, GLOW_PROFILE));
    addKernel(light, this.halos.get(radius), x, y, this.tones.glow, weight * HALO_LIGHT);
  }

  window(hour) {
    const from = hour - LIGHT_WINDOW_HOURS;
    return [this.data.bh, this.data.ah, this.data.ch].map((hours) => [lowerBound(hours, from), upperBound(hours, hour)]);
  }

  replay(hour, light) {
    this.window(hour).forEach(([from, stop], kind) => {
      for (let row = from; row < stop; row += 1) this.draws[kind](row, light);
    });
  }
}
