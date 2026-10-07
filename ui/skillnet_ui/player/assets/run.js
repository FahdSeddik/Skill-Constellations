function sortedBy(count, keys) {
  return Int32Array.from({ length: count }, (_, index) => index).sort((a, b) => keys[a] - keys[b]);
}

function nearestEarlier(order, rank, motion) {
  const { hx, hy } = motion;
  const [x, y] = [hx[order[rank]], hy[order[rank]]];
  let best = -1;
  let closest = Infinity;
  for (let earlier = 0; earlier < rank; earlier += 1) {
    const other = order[earlier];
    const distance = (hx[other] - x) * (hx[other] - x) + (hy[other] - y) * (hy[other] - y);
    if (distance < closest) [best, closest] = [other, distance];
  }
  return best;
}

class Run {
  constructor(panel, count, timing) {
    const events = panel.events;
    this.title = panel.title;
    this.depart = Float64Array.from(events.t);
    this.arrive = Float64Array.from(events.a);
    this.source = Int32Array.from(events.s);
    this.copier = Int32Array.from(events.c);
    this.risk = Uint8Array.from(events.r);
    this.lit = Float64Array.from(panel.lit, (time) => (time < 0 ? Infinity : time));
    this.glow = Uint8Array.from(panel.glow);
    this.origin = Int32Array.from(panel.origin);
    this.settle = timing.settle;
    this.bloom = timing.bloom;
    this.glide = timing.glide;
    this.grow = new Growth(panel.grow, count);
    this.weeks = panel.weeks;
    this.prepareOrders();
    this.lighting = Uint8Array.from(this.copier, (node, index) => this.lights(node, index));
  }

  prepareOrders() {
    const count = this.depart.length;
    const settled = Float64Array.from(this.arrive, (time) => time + this.settle);
    this.settledOrder = sortedBy(count, settled);
    this.settledTimes = Float64Array.from(this.settledOrder, (index) => settled[index]);
    this.litOrder = sortedBy(this.lit.length, this.lit);
    this.litTimes = Float64Array.from(this.litOrder, (node) => this.lit[node]);
    let span = 0;
    for (let index = 0; index < count; index += 1) {
      span = Math.max(span, this.arrive[index] - this.depart[index]);
    }
    this.reach = span + this.settle;
  }

  lights(node, index) {
    return this.origin[node] === this.source[index] && Math.abs(this.lit[node] - this.depart[index]) < 1e-3;
  }

  adoptOrigins(motion) {
    const count = this.litCount(Number.MAX_VALUE);
    for (let rank = 1; rank < count; rank += 1) {
      const node = this.litOrder[rank];
      if (this.origin[node] < 0) this.origin[node] = nearestEarlier(this.litOrder, rank, motion);
    }
  }

  activeRange(t) {
    return [lowerBound(this.depart, t - this.reach), upperBound(this.depart, t)];
  }

  litCount(t) {
    return upperBound(this.litTimes, t);
  }
}
