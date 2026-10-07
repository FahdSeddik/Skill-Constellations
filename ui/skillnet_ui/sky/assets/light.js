const LIGHT_DECAY = 1 / 0.22;
const LIGHT_RENEW = 8;
const LIGHT_WINDOW_HOURS = Math.round((5 / LIGHT_DECAY) * WEEK_HOURS);

function copyRow(buffer, spare, row, out, columns) {
  for (let x = 0, at = out; x < columns.length; x += 1, at += 3) {
    const column = columns[x];
    if (column < 0) {
      spare[at] = spare[at + 1] = spare[at + 2] = 0;
      continue;
    }
    spare[at] = buffer[row + column];
    spare[at + 1] = buffer[row + column + 1];
    spare[at + 2] = buffer[row + column + 2];
  }
}

class LightLayer {
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = new Float32Array(width * height * 3);
    this.spare = new Float32Array(width * height * 3);
    this.columns = new Int32Array(width);
    this.ref = 0;
  }

  clear(t) {
    this.buffer.fill(0);
    this.ref = t;
  }

  weight(t) {
    return Math.exp(LIGHT_DECAY * (t - this.ref));
  }

  gain(t) {
    return Math.exp(-LIGHT_DECAY * (t - this.ref));
  }

  renew(t) {
    if (LIGHT_DECAY * (t - this.ref) < LIGHT_RENEW) return;
    const gain = this.gain(t);
    const buffer = this.buffer;
    for (let index = 0; index < buffer.length; index += 1) buffer[index] *= gain;
    this.ref = t;
  }

  grow(source) {
    const { width, height, buffer } = this;
    const [across, down] = [source.width / width, source.height / height];
    for (let y = 0; y < height; y += 1) {
      const row = Math.min(source.height - 1, Math.floor(y * down)) * source.width;
      for (let x = 0; x < width; x += 1) {
        const from = (row + Math.min(source.width - 1, Math.floor(x * across))) * 3;
        const at = (y * width + x) * 3;
        buffer[at] = source.buffer[from];
        buffer[at + 1] = source.buffer[from + 1];
        buffer[at + 2] = source.buffer[from + 2];
      }
    }
    this.ref = source.ref;
  }

  shrink(source) {
    const { width, height, buffer } = this;
    const wide = source.width * 3;
    for (let y = 0; y < height; y += 1) {
      const top = Math.min(2 * y, source.height - 2) * wide;
      for (let x = 0, at = y * width * 3; x < width; x += 1, at += 3) {
        const left = top + Math.min(2 * x, source.width - 2) * 3;
        for (let channel = 0; channel < 3; channel += 1) {
          const corner = left + channel;
          const sum = source.buffer[corner] + source.buffer[corner + 3] + source.buffer[corner + wide] + source.buffer[corner + wide + 3];
          buffer[at + channel] = sum / 4;
        }
      }
    }
    this.ref = source.ref;
  }

  warp(from, to) {
    const share = from[0] / to[0];
    const { width, height, buffer, spare, columns } = this;
    for (let x = 0; x < width; x += 1) {
      const column = Math.floor((x + 0.5) * share + from[1] - to[1] * share);
      columns[x] = column >= 0 && column < width ? column * 3 : -1;
    }
    for (let y = 0; y < height; y += 1) {
      const source = Math.floor((y + 0.5) * share + from[2] - to[2] * share);
      const out = y * width * 3;
      if (source < 0 || source >= height) {
        spare.fill(0, out, out + width * 3);
        continue;
      }
      copyRow(buffer, spare, source * width * 3, out, columns);
    }
    [this.buffer, this.spare] = [spare, buffer];
  }
}
