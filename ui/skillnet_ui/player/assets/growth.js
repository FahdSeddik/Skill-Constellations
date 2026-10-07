class Growth {
  constructor(grow, count) {
    this.ramp = grow.ramp;
    this.time = Float64Array.from(grow.t);
    this.value = Float64Array.from(grow.v);
    this.first = new Int32Array(count + 1);
    for (const node of grow.n) this.first[node + 1] += 1;
    for (let node = 0; node < count; node += 1) this.first[node + 1] += this.first[node];
  }

  valueAt(node, t) {
    const low = this.first[node];
    const high = upperBound(this.time, t, low, this.first[node + 1]);
    if (high === low) return 0;
    const last = high - 1;
    const before = last > low ? this.value[last - 1] : 0;
    const share = Math.min(1, (t - this.time[last]) / this.ramp);
    return before + (this.value[last] - before) * share;
  }
}
