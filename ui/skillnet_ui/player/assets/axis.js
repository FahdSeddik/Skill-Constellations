const PLOT_INSET = { left: 66, right: 24, top: 36, bottom: 26 };
const COMPACT_FORMAT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function niceStep(span, count) {
  const raw = span / Math.max(1, count);
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const scaled = raw / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return Math.max(1, step * power);
}

function niceTicks(highest, count) {
  const step = niceStep(Math.max(highest, 1), count);
  const top = Math.max(step, Math.ceil(highest / step) * step);
  const ticks = [];
  for (let value = 0; value <= top + 1e-9; value += step) ticks.push(value);
  return ticks;
}

function prepareSeries(line, step) {
  const t = Float64Array.from(line.t);
  const y = line.y.length ? Float64Array.from(line.y) : Float64Array.from(line.t, (_, index) => index + 1);
  return { label: line.label, tone: line.tone, dashed: Boolean(line.dashed), t, y, step };
}

function seriesValue(series, t) {
  const index = upperBound(series.t, t) - 1;
  if (series.step) return index < 0 ? 0 : series.y[index];
  if (index < 0) return series.y[0] || 0;
  if (index >= series.t.length - 1) return series.y[series.y.length - 1];
  const share = (t - series.t[index]) / (series.t[index + 1] - series.t[index]);
  return series.y[index] + (series.y[index + 1] - series.y[index]) * share;
}

function traceSeries(context, series, frame, end) {
  context.beginPath();
  context.moveTo(frame.x(series.t[0]), frame.y(series.step ? 0 : series.y[0]));
  for (let index = 0; index < series.t.length; index += 1) {
    if (series.step) context.lineTo(frame.x(series.t[index]), frame.y(index ? series.y[index - 1] : 0));
    context.lineTo(frame.x(series.t[index]), frame.y(series.y[index]));
  }
  context.lineTo(frame.x(end), frame.y(series.y[series.y.length - 1] || 0));
}

class PlotFrame {
  constructor(width, height, clock, top, right) {
    this.left = PLOT_INSET.left;
    this.right = width - right;
    this.top = PLOT_INSET.top;
    this.bottom = height - PLOT_INSET.bottom;
    this.start = clock.start;
    this.end = clock.end;
    this.highest = top;
  }

  x(t) {
    return this.left + ((t - this.start) / (this.end - this.start)) * (this.right - this.left);
  }

  y(value) {
    return this.bottom - (value / this.highest) * (this.bottom - this.top);
  }

  timeAt(x) {
    const share = clampUnit((x - this.left) / (this.right - this.left));
    return this.start + share * (this.end - this.start);
  }
}
