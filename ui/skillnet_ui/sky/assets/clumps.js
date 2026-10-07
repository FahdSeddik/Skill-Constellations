const LABEL_FULL_ZOOM = 12;
const LABEL_GONE_ZOOM = 32;
const LABEL_GROWTH = 0.22;
const LABEL_GROWTH_MAX = 1.6;
const LABEL_GAP = 7;
const LABEL_SIDE_ROOM = 14;
const LABEL_TOP_ROOM = 76;
const LABEL_BOTTOM_ROOM = 104;
const LABEL_LIT_SHARE = 0.2;
const LABEL_COUNT_MS = 300;
const LABEL_SAFE_SHARE = 0.05;
const LABEL_FADE_SECONDS = 0.5;

function labelSize(size) {
  return Math.round(12.5 + 2.6 * Math.log10(Math.max(1, size / 100)));
}

function clampInto(value, low, high) {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

function labelBox(centre, size, view, side) {
  const x = clampInto(centre[0] - size[0] / 2, side, view[0] - size[0] - side);
  const y = clampInto(centre[1] - size[1] / 2, LABEL_TOP_ROOM, view[1] - size[1] - LABEL_BOTTOM_ROOM);
  return [x, y, x + size[0], y + size[1]];
}

function inView(centre, view) {
  return centre[0] >= 0 && centre[0] <= view[0] && centre[1] >= LABEL_TOP_ROOM && centre[1] <= view[1] - LABEL_BOTTOM_ROOM;
}

function overlaps(box, other) {
  return box[0] < other[2] && other[0] < box[2] && box[1] < other[3] && other[1] < box[3];
}

function layerBox(element, layer) {
  const [box, origin] = [element.getBoundingClientRect(), layer.getBoundingClientRect()];
  return [box.left - origin.left, box.top - origin.top, box.right - origin.left, box.bottom - origin.top];
}

function focusOption() {
  const focus = recordOption("focus");
  return focus ? focus.split(",").map((clump) => Number(clump) - 1) : [];
}

class ClumpLabels {
  constructor(host, clumps, palette, scale, avoided) {
    this.items = clumps.items;
    this.avoided = avoided;
    this.safe = isRecording() ? LABEL_SAFE_SHARE : 0;
    this.focus = focusOption();
    this.fadeStep = isRecording() ? RECORD_STEP / LABEL_FADE_SECONDS : 1;
    this.layer = element("div", "clumps", host);
    this.labels = this.items.map((item) => {
      const label = element("div", "clump", this.layer);
      label.textContent = item.label;
      label.style.fontSize = `${labelSize(item.size) * scale}px`;
      return label;
    });
    this.recolour(clumps.coloured, palette);
    this.lit = new Float32Array(this.items.length);
    this.goal = new Float32Array(this.items.length);
    this.alpha = new Float32Array(this.items.length);
    this.countedAt = -Infinity;
  }

  recolour(coloured, palette) {
    this.labels.forEach((label, index) => {
      label.style.color = coloured ? labelColour(palette.tints[this.items[index].colour], palette) : "";
    });
  }

  update(sky, now) {
    if (now - this.countedAt > LABEL_COUNT_MS) this.count(sky.data.nclump, sky.ledger.held, now);
    const zoom = sky.camera.now[0];
    const fade = Math.min(1, Math.max(0, Math.log(LABEL_GONE_ZOOM / zoom) / Math.log(LABEL_GONE_ZOOM / LABEL_FULL_ZOOM)));
    const grow = Math.min(LABEL_GROWTH_MAX, 1 + LABEL_GROWTH * Math.log2(Math.max(1, zoom)));
    const key = `${sky.transform.join()}|${fade}|${grow}|${this.version}`;
    if (key !== this.placed) {
      this.placed = key;
      this.layer.style.opacity = fade;
      if (fade > 0) this.place(sky.transform, grow);
    }
    this.fade();
  }

  fade() {
    this.labels.forEach((label, index) => {
      const change = Math.max(-this.fadeStep, Math.min(this.fadeStep, this.goal[index] - this.alpha[index]));
      if (change === 0) return;
      this.alpha[index] += change;
      label.style.opacity = this.alpha[index];
    });
  }

  order() {
    const rank = (index) => (this.focus.includes(index) ? 0 : this.alpha[index] > 0 || this.goal[index] > 0 ? 1 : 2);
    return this.items.map((_, index) => index).sort((a, b) => rank(a) - rank(b) || a - b);
  }

  shows(index) {
    return this.goal[index] > 0;
  }

  count(clumpOf, held, now) {
    const lit = new Uint32Array(this.items.length);
    for (let node = 0; node < clumpOf.length; node += 1) {
      if (clumpOf[node] > 0 && held[node] > 0) lit[clumpOf[node] - 1] += 1;
    }
    this.lit = Float32Array.from(lit, (count, index) => Math.min(1, count / (LABEL_LIT_SHARE * this.items[index].size)));
    this.version = this.lit.join();
    this.countedAt = now;
  }

  place(transform, grow) {
    if (!this.boxes) this.boxes = this.labels.map((label) => [label.offsetWidth, label.offsetHeight]);
    const [scale, ox, oy] = transform;
    const view = [this.layer.clientWidth, this.layer.clientHeight];
    const side = Math.max(LABEL_SIDE_ROOM, this.safe * view[0]);
    const taken = this.avoided.map((element) => layerBox(element, this.layer));
    for (const index of this.order()) {
      const label = this.labels[index];
      const centre = [this.items[index].x * scale + ox, this.items[index].y * scale + oy];
      const [x, y, right, bottom] = labelBox(centre, [this.boxes[index][0] * grow, this.boxes[index][1] * grow], view, side);
      const box = [x - LABEL_GAP, y - LABEL_GAP, right + LABEL_GAP, bottom + LABEL_GAP];
      const shown = this.items[index].label !== "" && this.lit[index] > 0 && inView(centre, view) && !taken.some((other) => overlaps(box, other));
      if (shown || this.alpha[index] > 0) taken.push(box);
      label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${grow.toFixed(3)})`;
      this.goal[index] = shown ? this.lit[index] : 0;
    }
  }

  show(on) {
    this.layer.classList.toggle("off", !on);
  }

  describe(clump) {
    return clump > 0 && this.items[clump - 1].label ? ` · ${this.items[clump - 1].label}` : "";
  }
}
