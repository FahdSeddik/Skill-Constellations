const LINK_PEAK = [0.95, 1];
const LINK_WIDTH = [1.0, 1.3];
const ALPHA_LEVELS = 24;
const COMET_SIZE = 15;
const PULSE_SHARE = 0.45;
const PULSE_REACH = 11;

class LinkPainter {
  constructor(palette) {
    this.colors = trailColors(palette);
    this.buckets = Array.from({ length: TONES * ALPHA_LEVELS }, () => []);
    this.comets = [];
    this.pulses = [];
  }

  collect(run, view, t) {
    const [low, high] = run.activeRange(t);
    for (let index = low; index < high; index += 1) {
      const settled = run.arrive[index] + run.settle;
      if (t < settled) this.collectOne(run, view, t, index);
    }
  }

  collectOne(run, view, t, index) {
    const risk = run.risk[index];
    const from = run.source[index];
    const to = run.copier[index];
    const depart = run.depart[index];
    const arrive = run.arrive[index];
    const peak = LINK_PEAK[risk] * view.look.flash;
    let reach = 1;
    let alpha;
    if (t < arrive) {
      const share = (t - depart) / Math.max(arrive - depart, 1e-6);
      alpha = peak * smooth(clampUnit(share * 1.5));
      if (!run.lighting[index]) {
        reach = easeInOut(share);
        this.comets.push(index, reach, clampUnit(share * 5));
      }
    } else {
      const share = (t - arrive) / run.settle;
      alpha = trailAlpha(risk, view.look) + (peak - trailAlpha(risk, view.look)) * (1 - smooth(share));
      if (share < PULSE_SHARE && !run.lighting[index]) this.pulses.push(index, share / PULSE_SHARE);
    }
    const x = view.px[from] + (view.px[to] - view.px[from]) * reach;
    const y = view.py[from] + (view.py[to] - view.py[from]) * reach;
    const level = Math.min(ALPHA_LEVELS - 1, Math.round(alpha * (ALPHA_LEVELS - 1)));
    this.buckets[risk * ALPHA_LEVELS + level].push(view.px[from], view.py[from], x, y);
  }

  drawLines(context, run, view, t) {
    this.collect(run, view, t);
    this.buckets.forEach((segments, bucket) => this.stroke(context, segments, bucket, view.unit * view.look.width));
  }

  drawLights(context, run, view, sprites) {
    this.drawComets(context, run, view, sprites);
    this.drawPulses(context, run, view, sprites);
  }

  stroke(context, segments, bucket, unit) {
    if (segments.length === 0) return;
    const risk = Math.floor(bucket / ALPHA_LEVELS);
    const alpha = (bucket % ALPHA_LEVELS) / (ALPHA_LEVELS - 1);
    context.beginPath();
    for (let index = 0; index < segments.length; index += 4) {
      context.moveTo(segments[index], segments[index + 1]);
      context.lineTo(segments[index + 2], segments[index + 3]);
    }
    context.strokeStyle = rgba(this.colors[risk], alpha);
    context.lineWidth = LINK_WIDTH[risk] * unit;
    context.stroke();
    segments.length = 0;
  }

  drawComets(context, run, view, sprites) {
    const comets = this.comets;
    for (let index = 0; index < comets.length; index += 3) {
      const event = comets[index];
      const from = run.source[event];
      const to = run.copier[event];
      const x = view.px[from] + (view.px[to] - view.px[from]) * comets[index + 1];
      const y = view.py[from] + (view.py[to] - view.py[from]) * comets[index + 1];
      context.globalAlpha = comets[index + 2];
      drawSprite(context, sprites.flashes[run.risk[event]], x, y, COMET_SIZE * view.unit * view.look.width * view.magnify);
    }
    context.globalAlpha = 1;
    comets.length = 0;
  }

  drawPulses(context, run, view, sprites) {
    const pulses = this.pulses;
    for (let index = 0; index < pulses.length; index += 2) {
      const event = pulses[index];
      const share = pulses[index + 1];
      const node = run.copier[event];
      context.globalAlpha = 0.5 * Math.pow(1 - share, 2);
      const radius = (2 + PULSE_REACH * easeOut(share)) * view.unit * view.magnify;
      drawRing(context, sprites.rings[run.risk[event]], view.px[node], view.py[node], radius);
    }
    context.globalAlpha = 1;
    pulses.length = 0;
  }
}
