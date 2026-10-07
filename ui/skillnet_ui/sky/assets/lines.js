function clipLine(target, line) {
  const [x0, y0, x1, y1, a0, a1] = line;
  const [dx, dy] = [x1 - x0, y1 - y0];
  let [low, high] = [0, 1];
  const edges = [[-dx, x0 + 1], [dx, target.width - x0], [-dy, y0 + 1], [dy, target.height - y0]];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    if (p < 0) low = Math.max(low, q / p);
    else high = Math.min(high, q / p);
  }
  if (low > high) return false;
  line[0] = x0 + dx * low;
  line[1] = y0 + dy * low;
  line[2] = x0 + dx * high;
  line[3] = y0 + dy * high;
  line[4] = a0 + (a1 - a0) * low;
  line[5] = a0 + (a1 - a0) * high;
  return true;
}

function plotPair(target, steep, x, y, rgb, level) {
  const floor = Math.floor(y);
  const share = y - floor;
  if (steep) {
    addPixel(target, floor, x, rgb, level * (1 - share));
    addPixel(target, floor + 1, x, rgb, level * share);
  } else {
    addPixel(target, x, floor, rgb, level * (1 - share));
    addPixel(target, x, floor + 1, rgb, level * share);
  }
}

function drawLine(target, line, rgb) {
  if (!clipLine(target, line)) return;
  let [x0, y0, x1, y1, a0, a1] = line;
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  if (steep) [x0, y0, x1, y1] = [y0, x0, y1, x1];
  if (x0 > x1) [x0, y0, x1, y1, a0, a1] = [x1, y1, x0, y0, a1, a0];
  const span = Math.max(x1 - x0, 1e-6);
  const gradient = (y1 - y0) / span;
  const first = Math.round(x0);
  let y = y0 + gradient * (first - x0);
  for (let x = first; x <= Math.round(x1); x += 1) {
    plotPair(target, steep, x, y, rgb, a0 + (a1 - a0) * clampUnit((x - x0) / span));
    y += gradient;
  }
}
