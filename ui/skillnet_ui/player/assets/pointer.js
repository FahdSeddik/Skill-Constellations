const WHEEL_RATE = 0.0016;
const PINCH_RATE = 0.012;
const LINE_PIXELS = 16;
const DRAG_FROM = 3;
const TIP_OFFSET = 14;

class Pointer {
  constructor(player) {
    this.player = player;
    const host = player.host;
    this.tip = element("div", "tip", player.root);
    this.reset = element("button", "reset", host);
    this.reset.textContent = "Reset view";
    this.reset.addEventListener("click", () => this.release());
    host.addEventListener("wheel", (event) => this.wheel(event), { passive: false });
    host.addEventListener("pointerdown", (event) => this.grab(event));
    host.addEventListener("pointermove", (event) => this.move(event));
    host.addEventListener("pointerup", (event) => this.drop(event));
    host.addEventListener("pointerleave", () => this.tip.classList.remove("on"));
    host.addEventListener("dblclick", () => this.release());
  }

  local(event) {
    const panel = this.player.panels.find((item) => item.element.contains(event.target)) || this.player.panels[0];
    const box = panel.canvas.getBoundingClientRect();
    const ratio = panel.view.ratio;
    return [panel, (event.clientX - box.left) * ratio, (event.clientY - box.top) * ratio];
  }

  wheel(event) {
    event.preventDefault();
    const [panel, sx, sy] = this.local(event);
    const delta = event.deltaY * (event.deltaMode ? LINE_PIXELS : 1);
    const factor = Math.exp(-delta * (event.ctrlKey ? PINCH_RATE : WHEEL_RATE));
    this.player.camera.zoomAt(panel.view, sx, sy, factor);
    this.player.dirty = true;
  }

  grab(event) {
    if (event.button !== 0 || event.target === this.reset) return;
    this.drag = { x: event.clientX, y: event.clientY, moved: false };
    this.player.host.setPointerCapture(event.pointerId);
  }

  move(event) {
    if (!this.drag) return this.hover(event);
    const [dx, dy] = [event.clientX - this.drag.x, event.clientY - this.drag.y];
    if (!this.drag.moved && Math.hypot(dx, dy) < DRAG_FROM) return;
    const [panel] = this.local(event);
    this.drag = { x: event.clientX, y: event.clientY, moved: true };
    this.player.host.classList.add("dragging");
    this.tip.classList.remove("on");
    this.player.camera.panBy(panel.view, dx * panel.view.ratio, dy * panel.view.ratio);
    this.player.dirty = true;
  }

  drop(event) {
    this.drag = null;
    this.player.host.classList.remove("dragging");
    if (this.player.host.hasPointerCapture(event.pointerId)) this.player.host.releasePointerCapture(event.pointerId);
  }

  release() {
    this.player.camera.release();
    this.player.dirty = true;
  }

  update() {
    this.reset.classList.toggle("on", this.player.camera.user);
  }

  hover(event) {
    const t = this.player.clock.t;
    const panel = this.player.panels.find((item) => item.element.contains(event.target));
    const node = panel ? panel.nearest(event.clientX, event.clientY, t) : -1;
    if (node < 0) return this.tip.classList.remove("on");
    const nodes = this.player.scene.nodes;
    const copies = Math.round(panel.run.grow.valueAt(node, t));
    this.tip.textContent = `${nodes.tips[nodes.tip[node]]}, ${counted(copies, "copy", "copies")} passed on`;
    const box = this.player.root.getBoundingClientRect();
    const left = Math.min(event.clientX - box.left + TIP_OFFSET, box.width - this.tip.offsetWidth - 8);
    this.tip.style.left = `${left}px`;
    this.tip.style.top = `${event.clientY - box.top + TIP_OFFSET}px`;
    this.tip.classList.add("on");
  }
}
