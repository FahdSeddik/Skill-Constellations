class Motion {
  constructor(keys, count) {
    this.times = Float64Array.from(keys.times);
    this.first = Int32Array.from(keys.first);
    this.x = Float64Array.from(keys.x);
    this.y = Float64Array.from(keys.y);
    this.offset = new Int32Array(count);
    let at = 0;
    for (let node = 0; node < count; node += 1) {
      this.offset[node] = at - Math.max(this.first[node], 0);
      if (this.first[node] >= 0) at += this.times.length - this.first[node];
    }
    this.wx = new Float64Array(count);
    this.wy = new Float64Array(count);
    this.extent = [extent(this.x), extent(this.y)];
    const homes = Int32Array.from(this.first, (first, node) => this.offset[node] + Math.max(first, 0));
    this.hx = Float64Array.from(homes, (at, node) => (this.first[node] < 0 ? NaN : this.x[at]));
    this.hy = Float64Array.from(homes, (at, node) => (this.first[node] < 0 ? NaN : this.y[at]));
  }

  place(t) {
    const last = this.times.length - 1;
    const index = Math.max(0, Math.min(last, upperBound(this.times, t) - 1));
    const span = index < last ? this.times[index + 1] - this.times[index] : 1;
    const share = index < last ? smooth(clampUnit((t - this.times[index]) / span)) : 0;
    for (let node = 0; node < this.first.length; node += 1) this.placeNode(node, index, share);
  }

  placeNode(node, index, share) {
    const first = this.first[node];
    if (first < 0) {
      this.wx[node] = NaN;
      this.wy[node] = NaN;
      return;
    }
    const from = this.offset[node] + Math.max(index, first);
    const to = first > index ? from : this.offset[node] + Math.min(index + 1, this.times.length - 1);
    this.wx[node] = this.x[from] + (this.x[to] - this.x[from]) * share;
    this.wy[node] = this.y[from] + (this.y[to] - this.y[from]) * share;
  }
}
