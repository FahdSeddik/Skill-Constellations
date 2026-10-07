const TRAIL_ALPHA = [0.42, 0.52];
const TRAIL_WIDTH = 1.15;
const COUNT_CAP = 12;
const TONES = 2;

function trailColors(palette) {
  return [palette.trail, palette.risk];
}

function trailAlpha(risk, look) {
  return TRAIL_ALPHA[risk] * look.trail;
}

class TrailPainter {
  constructor(run, palette) {
    this.run = run;
    this.colors = trailColors(palette);
    this.counts = new Map();
    this.counted = 0;
    this.layers = Array.from({ length: TONES * COUNT_CAP }, () => []);
  }

  sync(t) {
    const stop = upperBound(this.run.settledTimes, t);
    if (stop < this.counted) this.reset();
    for (let rank = this.counted; rank < stop; rank += 1) this.add(this.run.settledOrder[rank]);
    this.counted = stop;
  }

  reset() {
    this.counts.clear();
    this.counted = 0;
    for (const layer of this.layers) layer.length = 0;
  }

  add(index) {
    const run = this.run;
    const key = (run.source[index] * run.lit.length + run.copier[index]) * TONES + run.risk[index];
    const copies = (this.counts.get(key) || 0) + 1;
    this.counts.set(key, copies);
    if (copies <= COUNT_CAP) this.layers[run.risk[index] * COUNT_CAP + copies - 1].push(run.source[index], run.copier[index]);
  }

  draw(context, view, t) {
    this.sync(t);
    const { px, py } = view;
    context.lineWidth = TRAIL_WIDTH * view.unit * view.look.width;
    this.layers.forEach((pairs, layer) => {
      if (pairs.length === 0) return;
      const risk = Math.floor(layer / COUNT_CAP);
      context.beginPath();
      for (let index = 0; index < pairs.length; index += 2) {
        context.moveTo(px[pairs[index]], py[pairs[index]]);
        context.lineTo(px[pairs[index + 1]], py[pairs[index + 1]]);
      }
      context.strokeStyle = rgba(this.colors[risk], trailAlpha(risk, view.look));
      context.stroke();
    });
  }
}
