const QUIET = { birth() {}, arrival() {}, copy() {} };

class Ledger {
  constructor(data, count) {
    this.data = data;
    this.held = new Uint32Array(count);
    this.passed = new Uint32Array(count);
    this.reset();
  }

  reset() {
    this.held.fill(0);
    this.passed.fill(0);
    this.cursor = [0, 0, 0];
    this.hour = -1;
  }

  forward(hour, sink) {
    const data = this.data;
    const stop = [upperBound(data.bh, hour), upperBound(data.ah, hour), upperBound(data.ch, hour)];
    for (let row = this.cursor[0]; row < stop[0]; row += 1) {
      const node = data.bn[row];
      const before = this.held[node];
      this.held[node] = before + data.bc[row];
      sink.birth(row, node, before);
    }
    for (let row = this.cursor[1]; row < stop[1]; row += 1) {
      const node = data.ad[row];
      const before = this.held[node];
      this.held[node] = before + data.ac[row];
      sink.arrival(row, node, before);
    }
    for (let row = this.cursor[2]; row < stop[2]; row += 1) {
      this.passed[data.cs[row]] += 1;
      sink.copy(row);
    }
    this.cursor = stop;
    this.hour = hour;
  }

  seek(hour) {
    if (hour < this.hour) this.reset();
    this.forward(hour, QUIET);
  }
}
