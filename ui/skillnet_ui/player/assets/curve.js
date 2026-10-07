const LABEL_FONT = 11.5;
const LABEL_GAP = 14;
const END_ROOM = 92;
const LABEL_ROOM = 6;

function labelPlaces(heights, lowest) {
  const places = [];
  for (const height of heights) places.push(Math.max(height - 4, places.length ? places[places.length - 1] + LABEL_GAP : -Infinity));
  const excess = places.length ? places[places.length - 1] - lowest : 0;
  return excess > 0 ? places.map((place) => place - excess) : places;
}

class GrowthCurve {
  constructor(host, scene, scrub) {
    this.element = document.createElement("div");
    this.element.className = "curve";
    this.canvas = document.createElement("canvas");
    this.element.appendChild(this.canvas);
    host.appendChild(this.element);
    this.context = this.canvas.getContext("2d");
    this.base = document.createElement("canvas");
    this.spec = scene.curve;
    this.clock = scene.clock;
    this.palette = scene.palette;
    this.font = scene.font;
    this.series = scene.curve.series.map((line) => prepareSeries(line, scene.curve.step)).sort((a, b) => a.dashed - b.dashed);
    this.listen(scrub);
  }

  tone(name) {
    const tones = { risk: this.palette.risk, ink: this.palette.ink, glow: this.palette.glow, mark: this.palette.mark };
    return tones[name] || this.palette.muted;
  }

  text(context, size, color, align) {
    context.font = `${size}px ${this.font}`;
    context.fillStyle = color;
    context.textAlign = align;
  }

  label(context, text, x, y) {
    context.strokeStyle = this.palette.sky;
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.strokeText(text, x, y);
    context.fillText(text, x, y);
  }

  listen(scrub) {
    const canvas = this.canvas;
    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      scrub.begin(this.frame.timeAt(event.offsetX));
    });
    canvas.addEventListener("pointermove", (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) scrub.move(this.frame.timeAt(event.offsetX));
    });
    canvas.addEventListener("pointerup", () => scrub.end());
  }

  resize(ratio, scale) {
    const box = this.element.getBoundingClientRect();
    this.ratio = ratio * scale;
    this.width = box.width / scale;
    this.height = box.height / scale;
    for (const canvas of [this.canvas, this.base]) {
      canvas.width = Math.round(box.width * ratio);
      canvas.height = Math.round(box.height * ratio);
    }
    const highest = Math.max(1, ...this.series.map((line) => Math.max(...line.y, 0)));
    this.ticks = niceTicks(highest * 1.06, 3);
    const right = this.spec.ends ? END_ROOM : PLOT_INSET.right;
    this.frame = new PlotFrame(this.width, this.height, this.clock, this.ticks[this.ticks.length - 1], right);
    paintCurveBase(this, this.base.getContext("2d"));
    this.markPlan = markLabels(this, this.base.getContext("2d"));
  }

  draw(t) {
    const context = this.context;
    const frame = this.frame;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(this.base, 0, 0);
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    const cursor = frame.x(t);
    this.clipPlot(context, cursor);
    for (const line of this.series) this.stroke(context, line, line.tone === "faint" ? 0.9 : 1, 2.4);
    context.restore();
    context.strokeStyle = rgba(this.palette.ink, 0.4);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(cursor, frame.top - 6);
    context.lineTo(cursor, frame.bottom);
    context.stroke();
    if (this.spec.values !== false) this.drawValues(context, t, cursor);
  }

  clipPlot(context, right) {
    context.save();
    context.beginPath();
    context.rect(this.frame.left, 0, Math.max(0, right - this.frame.left), this.height);
    context.clip();
  }

  stroke(context, line, alpha, width) {
    traceSeries(context, line, this.frame, this.clock.end);
    context.strokeStyle = rgba(this.tone(line.tone), alpha);
    context.lineWidth = width;
    context.lineJoin = "round";
    context.setLineDash(line.dashed ? [3 * width, 2.5 * width] : []);
    context.stroke();
    context.setLineDash([]);
  }

  drawValues(context, t, cursor) {
    const shown = this.series.filter((line) => line.tone !== "faint");
    const points = shown.map((line) => ({ line, value: Math.round(seriesValue(line, t)) }));
    points.sort((a, b) => b.value - a.value || (a.line.tone === "risk" ? -1 : 1));
    const distinct = points.filter((point, index) => index === 0 || point.value !== points[index - 1].value);
    const places = labelPlaces(distinct.map((point) => this.frame.y(point.value)), this.frame.bottom - LABEL_ROOM);
    const flip = cursor > this.frame.right - 56;
    const labels = distinct.map((point, index) => ({ point, y: places[index], text: COUNT_FORMAT.format(point.value) }));
    const align = flip ? "right" : "left";
    const x = cursor + (flip ? -7 : 7);
    this.text(context, LABEL_FONT, this.palette.ink, align);
    drawMarkLabels(this, context, labels.map((item) => labelBox(context, item.text, x, item.y, align)));
    for (const item of labels) {
      const color = this.tone(item.point.line.tone);
      context.fillStyle = color;
      context.beginPath();
      context.arc(cursor, this.frame.y(item.point.value), 3.2, 0, 2 * Math.PI);
      context.fill();
      this.text(context, LABEL_FONT, color, align);
      this.label(context, item.text, x, item.y);
    }
  }
}
