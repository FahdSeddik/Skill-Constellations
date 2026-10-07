const SKY_WHEEL_RATE = 0.0016;
const SKY_PINCH_RATE = 0.012;
const SKY_LINE_PIXELS = 16;
const SKY_DRAG_FROM = 3;
const SKY_TIP_OFFSET = 14;
const SKY_HOVER_PIXELS = 9;

class SkyPointer {
  constructor(sky) {
    this.sky = sky;
    const stage = sky.stage;
    this.tip = element("div", "tip", sky.root);
    this.reset = element("button", "reset", sky.root);
    this.reset.textContent = "Reset view";
    this.reset.addEventListener("click", () => this.home());
    stage.addEventListener("wheel", (event) => this.wheel(event), { passive: false });
    stage.addEventListener("pointerdown", (event) => this.grab(event));
    stage.addEventListener("pointermove", (event) => this.move(event));
    stage.addEventListener("pointerup", (event) => this.drop(event));
    stage.addEventListener("pointerleave", () => this.tip.classList.remove("on"));
    stage.addEventListener("dblclick", () => this.home());
  }

  wheel(event) {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode ? SKY_LINE_PIXELS : 1);
    const factor = Math.exp(-delta * (event.ctrlKey ? SKY_PINCH_RATE : SKY_WHEEL_RATE));
    this.sky.camera.zoomAt(event.offsetX, event.offsetY, factor);
    this.update();
  }

  grab(event) {
    if (event.button !== 0) return;
    this.drag = { x: event.clientX, y: event.clientY, moved: false };
    this.sky.stage.setPointerCapture(event.pointerId);
  }

  move(event) {
    if (!this.drag) return this.hover(event);
    const [dx, dy] = [event.clientX - this.drag.x, event.clientY - this.drag.y];
    if (!this.drag.moved && Math.hypot(dx, dy) < SKY_DRAG_FROM) return;
    this.drag = { x: event.clientX, y: event.clientY, moved: true };
    this.sky.root.classList.add("dragging");
    this.tip.classList.remove("on");
    this.sky.camera.panBy(dx, dy);
    this.update();
  }

  drop(event) {
    this.drag = null;
    this.sky.root.classList.remove("dragging");
    if (this.sky.stage.hasPointerCapture(event.pointerId)) this.sky.stage.releasePointerCapture(event.pointerId);
  }

  home() {
    this.sky.camera.reset();
    this.update();
  }

  update() {
    this.reset.classList.toggle("on", this.sky.camera.user);
  }

  hover(event) {
    const { camera, map, ledger } = this.sky;
    const [x, y] = camera.toWorld(event.offsetX, event.offsetY);
    const node = map.nearest(x, y, SKY_HOVER_PIXELS / camera.transform()[0], ledger.held);
    if (node < 0) return this.tip.classList.remove("on");
    this.tip.textContent = this.sky.describe(node);
    const box = this.sky.root.getBoundingClientRect();
    const left = Math.min(event.clientX - box.left + SKY_TIP_OFFSET, box.width - this.tip.offsetWidth - 8);
    this.tip.style.left = `${left}px`;
    this.tip.style.top = `${event.clientY - box.top + SKY_TIP_OFFSET}px`;
    this.tip.classList.add("on");
  }
}
