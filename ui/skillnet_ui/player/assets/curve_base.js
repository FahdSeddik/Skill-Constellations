function paintCurveBase(curve, context) {
  context.setTransform(curve.ratio, 0, 0, curve.ratio, 0, 0);
  context.fillStyle = curve.palette.sky;
  context.fillRect(0, 0, curve.width, curve.height);
  paintGrid(curve, context);
  paintTimeTicks(curve, context);
  curve.clipPlot(context, curve.frame.right);
  for (const line of curve.series) curve.stroke(context, line, line.tone === "faint" ? 0.45 : 0.3, 1.4);
  context.restore();
  paintMarks(curve, context);
  paintRules(curve, context);
  paintEnds(curve, context);
  paintAxis(curve, context);
  curve.text(context, 12.5, curve.palette.ink, "left");
  context.fillText(curve.spec.title, PLOT_INSET.left - 52, 20);
}

function paintGrid(curve, context) {
  const frame = curve.frame;
  context.strokeStyle = curve.palette.line;
  context.lineWidth = 1;
  curve.text(context, LABEL_FONT, curve.palette.muted, "right");
  context.textBaseline = "middle";
  for (const value of curve.ticks) {
    const y = Math.round(frame.y(value)) + 0.5;
    context.beginPath();
    context.moveTo(frame.left, y);
    context.lineTo(frame.right, y);
    context.stroke();
    context.fillText(COMPACT_FORMAT.format(value), frame.left - 10, y);
  }
  context.textBaseline = "alphabetic";
}

function paintTimeTicks(curve, context) {
  const frame = curve.frame;
  curve.text(context, LABEL_FONT, curve.palette.muted, "center");
  context.strokeStyle = curve.palette.muted;
  for (const tick of visibleTicks(curve, context)) {
    const x = frame.x(tick.t);
    context.beginPath();
    context.moveTo(x, frame.bottom);
    context.lineTo(x, frame.bottom + 4);
    context.stroke();
    context.fillText(tick.label, x, frame.bottom + 17);
  }
}

function paintAxis(curve, context) {
  if (!curve.spec.axis) return;
  curve.text(context, LABEL_FONT, curve.palette.muted, "right");
  context.fillText(curve.spec.axis, curve.frame.right, 20);
}

function paintMarks(curve, context) {
  const frame = curve.frame;
  for (const mark of curve.spec.marks) {
    const [x, y] = [frame.x(mark.t), frame.y(mark.y)];
    context.fillStyle = curve.palette.mark;
    context.beginPath();
    context.arc(x, y, 3.6, 0, 2 * Math.PI);
    context.fill();
  }
}

function paintRules(curve, context) {
  const frame = curve.frame;
  curve.text(context, LABEL_FONT, curve.palette.ink, "left");
  context.strokeStyle = rgba(curve.palette.ink, 0.6);
  context.setLineDash([4, 4]);
  for (const rule of curve.spec.rules || []) {
    const x = Math.round(frame.x(rule.t)) + 0.5;
    context.beginPath();
    context.moveTo(x, frame.top - 6);
    context.lineTo(x, frame.bottom);
    context.stroke();
    curve.label(context, rule.label, x + 6, frame.top + 4);
  }
  context.setLineDash([]);
}

function paintEnds(curve, context) {
  if (!curve.spec.ends) return;
  const frame = curve.frame;
  const ends = curve.series.map((line) => ({ line, y: frame.y(line.y[line.y.length - 1]) }));
  ends.sort((a, b) => a.y - b.y);
  let floor = -Infinity;
  for (const end of ends) {
    const y = Math.max(end.y + 4, floor + LABEL_GAP);
    floor = y;
    curve.text(context, LABEL_FONT, curve.tone(end.line.tone), "left");
    curve.label(context, end.line.label, frame.right + 8, y);
  }
}
