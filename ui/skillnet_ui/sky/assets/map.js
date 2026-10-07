const MAP_CELL = 32;
const MAP_JITTER = 0.6;

function scatter(node, salt) {
  const mixed = Math.imul(node + 1, 2654435761) ^ Math.imul(salt + 7, 2246822519);
  return ((mixed >>> 0) / 4294967296 - 0.5) * MAP_JITTER;
}

function largest(values) {
  let top = 0;
  for (let index = 0; index < values.length; index += 1) top = Math.max(top, values[index]);
  return top;
}

class StarMap {
  constructor(data) {
    this.count = data.nx.length;
    this.wx = Float32Array.from(data.nx, (x, node) => x + scatter(node, 1));
    this.wy = Float32Array.from(data.ny, (y, node) => y + scatter(node, 2));
    this.size = Math.max(largest(data.nx), largest(data.ny)) + 1;
    this.columns = Math.ceil(this.size / MAP_CELL);
    this.index();
  }

  cellOf(node) {
    const column = Math.min(this.columns - 1, Math.floor(this.wx[node] / MAP_CELL));
    const row = Math.min(this.columns - 1, Math.floor(this.wy[node] / MAP_CELL));
    return row * this.columns + column;
  }

  index() {
    const cells = this.columns * this.columns;
    this.start = new Int32Array(cells + 1);
    for (let node = 0; node < this.count; node += 1) this.start[this.cellOf(node) + 1] += 1;
    for (let cell = 0; cell < cells; cell += 1) this.start[cell + 1] += this.start[cell];
    const filled = this.start.slice(0, cells);
    this.members = new Int32Array(this.count);
    for (let node = 0; node < this.count; node += 1) this.members[filled[this.cellOf(node)]++] = node;
  }

  nearest(x, y, reach, held) {
    const low = (value) => Math.max(0, Math.floor((value - reach) / MAP_CELL));
    const high = (value) => Math.min(this.columns - 1, Math.floor((value + reach) / MAP_CELL));
    let best = -1;
    let closest = reach * reach;
    for (let row = low(y); row <= high(y); row += 1) {
      for (let column = low(x); column <= high(x); column += 1) {
        const cell = row * this.columns + column;
        for (let at = this.start[cell]; at < this.start[cell + 1]; at += 1) {
          const node = this.members[at];
          const distance = (this.wx[node] - x) ** 2 + (this.wy[node] - y) ** 2;
          if (held[node] > 0 && distance < closest) [best, closest] = [node, distance];
        }
      }
    }
    return best;
  }
}
