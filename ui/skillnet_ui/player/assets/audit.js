const RING_RADIUS = 6.5;
const RING_WIDTH = 1.6;

class AuditRings {
  constructor(panel) {
    this.nodes = Int32Array.from(panel.audited || []);
    this.from = panel.auditAt === undefined ? Infinity : panel.auditAt;
  }

  draw(context, run, view, t, colour) {
    if (t < this.from || this.nodes.length === 0) return;
    const radius = RING_RADIUS * view.unit * view.magnify;
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    context.strokeStyle = colour;
    context.lineWidth = RING_WIDTH * view.ratio;
    context.beginPath();
    for (const node of this.nodes) {
      if (run.lit[node] > t) continue;
      context.moveTo(view.px[node] + radius, view.py[node]);
      context.arc(view.px[node], view.py[node], radius, 0, 2 * Math.PI);
    }
    context.stroke();
  }
}
