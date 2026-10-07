const KERNEL_FLOOR = 0.004;

function radialKernel(radius, profile) {
  const reach = Math.ceil(radius);
  const [dx, dy, weight] = [[], [], []];
  for (let y = -reach; y <= reach; y += 1) {
    for (let x = -reach; x <= reach; x += 1) {
      const value = profile(Math.hypot(x, y) / radius, x, y);
      if (value < KERNEL_FLOOR) continue;
      dx.push(x);
      dy.push(y);
      weight.push(value);
    }
  }
  return { dx: Int16Array.from(dx), dy: Int16Array.from(dy), weight: Float32Array.from(weight) };
}

function addKernel(target, kernel, cx, cy, rgb, amount) {
  const { buffer, width, height } = target;
  const [px, py] = [Math.round(cx), Math.round(cy)];
  const { dx, dy, weight } = kernel;
  for (let index = 0; index < weight.length; index += 1) {
    const x = px + dx[index];
    const y = py + dy[index];
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const at = (y * width + x) * 3;
    const value = weight[index] * amount;
    buffer[at] += rgb[0] * value;
    buffer[at + 1] += rgb[1] * value;
    buffer[at + 2] += rgb[2] * value;
  }
}

function addPixel(target, x, y, rgb, value) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  const at = (y * target.width + x) * 3;
  target.buffer[at] += rgb[0] * value;
  target.buffer[at + 1] += rgb[1] * value;
  target.buffer[at + 2] += rgb[2] * value;
}

function addPoint(target, cx, cy, rgb, amount) {
  const x = Math.floor(cx - 0.5);
  const y = Math.floor(cy - 0.5);
  const fx = cx - 0.5 - x;
  const fy = cy - 0.5 - y;
  addPixel(target, x, y, rgb, amount * (1 - fx) * (1 - fy));
  addPixel(target, x + 1, y, rgb, amount * fx * (1 - fy));
  addPixel(target, x, y + 1, rgb, amount * (1 - fx) * fy);
  addPixel(target, x + 1, y + 1, rgb, amount * fx * fy);
}
