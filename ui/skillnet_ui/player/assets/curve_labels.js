const LABEL_PAD = 3;
const TICK_GAP = 6;

function labelBox(context, text, x, y, align) {
  const width = context.measureText(text).width;
  const left = align === "right" ? x - width : x;
  return [left - LABEL_PAD, y - LABEL_FONT, left + width + LABEL_PAD, y + LABEL_PAD];
}

function boxesCollide(a, b) {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

function markLabels(curve, context) {
  curve.text(context, LABEL_FONT, curve.palette.ink, "left");
  const kept = [];
  for (const mark of [...curve.spec.marks].sort((a, b) => a.t - b.t)) {
    const free = markPlaces(curve, context, mark).find((place) => !kept.some((other) => boxesCollide(place.box, other.box)));
    if (free) kept.push({ mark, ...free });
  }
  return kept;
}

function markPlaces(curve, context, mark) {
  const [x, y] = [curve.frame.x(mark.t), curve.frame.y(mark.y) - 9];
  const left = { x: x - 5, y, box: labelBox(context, mark.label, x - 5, y, "right"), align: "right" };
  const right = { x: x + 5, y, box: labelBox(context, mark.label, x + 5, y, "left"), align: "left" };
  return left.box[0] > curve.frame.left + LABEL_PAD ? [left, right] : [right];
}

function drawMarkLabels(curve, context, taken) {
  for (const { mark, x, y, box, align } of curve.markPlan) {
    curve.text(context, LABEL_FONT, curve.palette.ink, align);
    if (!taken.some((other) => boxesCollide(box, other))) curve.label(context, mark.label, x, y);
  }
}

function visibleTicks(curve, context) {
  curve.text(context, LABEL_FONT, curve.palette.muted, "center");
  let edge = -Infinity;
  return curve.clock.ticks.filter((tick) => {
    const x = curve.frame.x(tick.t);
    const half = context.measureText(tick.label).width / 2;
    if (x < curve.frame.left - 1 || x > curve.frame.right + 1 || x - half < edge + TICK_GAP) return false;
    edge = x + half;
    return true;
  });
}
