const STAR_BASE = 0.95;
const STAR_STEP = 0.3;
const STAR_LIMIT = 6;
const SPIKE_FROM = 1.7;
const SPIKE_LENGTH = 9;
const FADE_SHARE = 0.18;
const FULL_BRIGHT = 4;
const FLASH_GROWTH = 2.4;
const RIPPLE_REACH = 26;
const RIPPLE_STRENGTH = 0.55;
const BLOOM_REACH = 30;
const BLOOM_SHARED = 2;

function starRadius(copies, floor, unit) {
  return Math.max(floor, Math.min(STAR_LIMIT, STAR_BASE + STAR_STEP * Math.sqrt(copies))) * unit;
}

function starBrightness(copies, faintest) {
  return faintest + (1 - faintest) * Math.min(1, Math.sqrt(copies) / FULL_BRIGHT);
}

function bloomShares(view, nodes, shares) {
  const reach = BLOOM_REACH * view.unit;
  for (const node of nodes) {
    let crowd = 0;
    for (const other of nodes) {
      crowd += Math.max(0, 1 - Math.hypot(view.px[node] - view.px[other], view.py[node] - view.py[other]) / reach);
    }
    shares[node] = Math.min(1, Math.sqrt(BLOOM_SHARED / crowd));
  }
}

function drawBloom(context, star, share, sprites) {
  const fading = Math.pow(1 - share, 2) * star.share;
  context.globalAlpha = fading * star.level;
  const flash = (2 * star.radius * (1 + FLASH_GROWTH * Math.pow(1 - share, 3))) / sprites.look.core;
  drawSprite(context, sprites.flashes[star.tone], star.x, star.y, flash);
  context.globalAlpha = RIPPLE_STRENGTH * star.share * star.level * sprites.look.reach * Math.pow(1 - share, 1.6);
  const radius = star.radius + RIPPLE_REACH * sprites.look.reach * star.unit * easeOut(share);
  drawRing(context, sprites.rings[star.tone], star.x, star.y, radius);
}

class StarPainter {
  constructor(nodes) {
    this.spike = Uint8Array.from(nodes.spike);
    this.tint = Uint8Array.from(nodes.tint);
    this.floor = Float32Array.from(nodes.floor || nodes.tint.map(() => 0));
    this.star = { x: 0, y: 0, radius: 0, unit: 1, tone: 0, bright: 1, level: 1, share: 1 };
    this.exposure = new Exposure(nodes.spike.length);
    this.shares = new Float32Array(nodes.spike.length);
  }

  draw(context, run, view, t, sprites) {
    const count = run.litCount(t);
    this.exposure.update(run, view, count);
    bloomShares(view, run.litOrder.subarray(run.litCount(t - run.bloom), count), this.shares);
    for (let rank = 0; rank < count; rank += 1) {
      const node = run.litOrder[rank];
      const age = t - run.lit[node];
      this.place(run, view, node, t);
      context.globalAlpha = this.star.bright * this.star.level * Math.min(1, age / (run.bloom * FADE_SHARE));
      this.drawStar(context, node, sprites);
      this.star.share = this.shares[node];
      if (age < run.bloom) drawBloom(context, this.star, age / run.bloom, sprites);
    }
    context.globalAlpha = 1;
  }

  place(run, view, node, t) {
    const star = this.star;
    star.x = view.px[node];
    star.y = view.py[node];
    star.unit = view.unit * view.magnify;
    const copies = run.grow.valueAt(node, t);
    star.radius = starRadius(copies, this.floor[node], star.unit);
    star.bright = starBrightness(copies, view.look.faintest);
    star.level = this.exposure.level[node];
    star.tone = run.glow[node];
  }

  drawStar(context, node, sprites) {
    const star = this.star;
    drawSprite(context, sprites.stars[this.tint[node]], star.x, star.y, (2 * star.radius) / sprites.look.core);
    if (this.spike[node] && star.radius > SPIKE_FROM * star.unit) {
      drawSprite(context, sprites.spike, star.x, star.y, SPIKE_LENGTH * star.radius);
    }
  }
}
