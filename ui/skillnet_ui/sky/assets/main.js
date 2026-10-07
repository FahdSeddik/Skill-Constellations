const SKY_SETTLE_MS = 220;
const SKY_TOP_ROOM = 44;

function sameTransform(a, b) {
  return Boolean(a && b) && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

class Sky {
  constructor(root, scene) {
    this.root = root;
    this.scene = scene;
    applyPalette(root, scene.palette, scene.font, scene.labelFont);
    root.classList.toggle("record", isRecording());
    this.uiScale = overlayScale(root);
    root.classList.toggle("still", recordOption("still") !== null);
    this.stage = element("div", "stage", root);
    element("div", "brand", root).textContent = scene.brand;
    this.hud = new SkyHud(root, scene);
    this.loading = element("div", "loading", root);
    this.loading.textContent = scene.loading;
    this.clock = new Clock(scene.clock, 1, scene.key);
    this.dock = element("div", "dock", root);
    this.namesKey = `skillnet-names-${scene.key}`;
    this.namesOn = readStore(this.namesKey) !== false;
    const handlers = { risk: { on: false, set: (on) => this.setRisk(on) } };
    if (scene.clumps && scene.clumps.items.length) handlers.names = { on: this.namesOn, set: (on) => this.setNames(on) };
    this.legend = new SkyLegend(this.dock, scene.legend, handlers);
    this.scrub = this.scrubber();
    this.controls = new Controls(this.dock, this.clock, this);
    this.table = toneTable();
    loadSky(scene.data).then((data) => this.start(data), (error) => this.fail(error));
  }

  fail(error) {
    this.loading.textContent = `${this.scene.failed} ${error.message}`;
  }

  start(data) {
    this.data = data;
    this.map = new StarMap(data);
    this.ledger = new Ledger(data, this.map.count);
    this.camera = new SkyCamera(this.map.size, `skillnet-view-${this.scene.key}`);
    this.labels = new ClumpLabels(this.root, this.scene.clumps, this.scene.palette, this.uiScale, isRecording() ? [this.hud.element] : []);
    this.labels.show(this.namesOn);
    this.levels = { core: new Float32Array(this.map.count), glow: new Float32Array(this.map.count) };
    this.surfaces = [1, MOTION_RATIO].map((ratio) => new Surface(this.stage, ratio, this));
    this.painter = new EventPainter(data, this.map, this.ledger, this.scene.palette);
    this.pointer = new SkyPointer(this);
    this.pointer.update();
    document.addEventListener("keydown", (event) => this.key(event));
    new ResizeObserver(() => this.resize()).observe(this.root);
  }

  resize() {
    const { width, height } = this.root.getBoundingClientRect();
    for (const surface of this.surfaces) surface.resize(width, height, this.scene.palette);
    this.root.style.setProperty("--dock", `${this.dock.offsetHeight}px`);
    this.camera.fit(Math.round(width), Math.round(height), { top: SKY_TOP_ROOM, bottom: this.dock.offsetHeight });
    this.transform = this.camera.transform();
    this.use(this.surfaces[0]);
    this.rebuild();
    if (!this.running) this.run();
  }

  run() {
    this.running = true;
    this.loading.classList.add("done");
    this.root.classList.add("ready");
    if (!isRecording()) requestAnimationFrame((now) => this.frame(now));
  }

  rebuild() {
    const hour = this.clock.t * WEEK_HOURS;
    this.ledger.seek(hour);
    const view = this.active.frame(this.transform);
    this.active.stars.paint(view, this.ledger.held, true);
    this.painter.setView(view);
    this.relight();
  }

  frame(now) {
    const seconds = this.last === undefined ? 0 : Math.min((now - this.last) / 1000, LONGEST_STEP);
    this.last = now;
    this.tick(seconds, now);
    requestAnimationFrame((time) => this.frame(time));
  }

  tick(seconds, now) {
    const advanced = this.clock.advance(seconds);
    this.camera.step(seconds);
    const transform = this.camera.transform();
    if (!sameTransform(transform, this.transform)) this.turn(transform, now);
    else if (this.active !== this.surfaces[0] && now - this.turnedAt > SKY_SETTLE_MS) this.settle();
    this.travel(this.clock.t * WEEK_HOURS);
    this.work();
    if (advanced || this.dirty) this.present();
    this.labels.update(this, now);
    this.clock.save(now);
    this.camera.save(now);
  }

  travel(hour) {
    if (hour === this.ledger.hour) return;
    if (hour < this.ledger.hour || hour - this.ledger.hour > LIGHT_WINDOW_HOURS) {
      this.ledger.seek(hour);
      this.active.stars.paint(this.active.frame(this.transform), this.ledger.held, true);
      this.active.light.clear(this.clock.t);
      this.dirty = true;
      return this.relightLater();
    }
    this.active.light.renew(this.clock.t);
    this.ledger.forward(hour, this.painter);
    this.dirty = true;
  }

  present() {
    this.active.present(this.active.light.gain(this.clock.t), this.table);
    this.hud.update(this.clock.t);
    this.controls.update(this.clock);
    this.pointer.update();
    this.dirty = false;
  }

  setNames(on) {
    this.namesOn = on;
    writeStore(this.namesKey, on);
    if (this.labels) this.labels.show(on);
  }

  setRisk(on) {
    this.root.classList.toggle("risky", on);
    this.painter.risk = on;
    if (this.active) this.relightLater();
  }

  describe(node) {
    const { types, roles, field } = this.scene;
    const kind = `${types[this.data.ntype[node]]}, ${this.data.nfield[node] ? field : roles[this.data.nrole[node]]}`;
    const held = counted(this.ledger.held[node], "skill", "skills");
    const passed = counted(this.ledger.passed[node], "copy", "copies");
    return `${kind} · ${held} adopted · ${passed} copied onward${this.labels.describe(this.data.nclump[node])}`;
  }
}
