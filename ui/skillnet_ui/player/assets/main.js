const FADE_MS = 420;
const CAPTION_MS = 7000;

function showCaption(root, text) {
  const caption = element("div", "caption", root);
  caption.textContent = text;
  window.setTimeout(() => caption.classList.add("faded"), CAPTION_MS);
}

function pixelRatio() {
  return Math.min(2, window.devicePixelRatio || 1);
}

class Player {
  constructor(root, scene) {
    this.root = root;
    this.scene = scene;
    applyPalette(root, scene.palette, scene.font);
    root.classList.toggle("record", isRecording());
    root.classList.toggle("curved", recordOption("curve") !== null);
    this.uiScale = overlayScale(root);
    this.clock = new Clock(scene.clock, scene.timing.unitSeconds, scene.key);
    this.motion = new Motion(scene.keys, scene.nodes.spike.length);
    this.host = element("div", "panels", root);
    element("div", "brand", root).textContent = scene.brand;
    showCaption(root, scene.caption);
    this.panels = scene.panels.map((panel) => new SkyPanel(this.host, scene, panel, this.motion));
    this.camera = new Camera(this.panels[0].view);
    warmSprites(scene.palette, scene.types.length);
    const sprites = spritesFor(scene.palette, scene.types.length, lookFor(1));
    this.dock = element("div", "dock", root);
    buildLegend(this.dock, scene.legend, sprites, scene.palette, pixelRatio());
    this.scrub = this.scrubber();
    this.controls = new Controls(this.dock, this.clock, this);
    this.curve = new GrowthCurve(this.dock, scene, this.scrub);
    this.pointer = new Pointer(this);
    document.addEventListener("keydown", (event) => this.key(event));
    new ResizeObserver(() => this.resize()).observe(root);
  }

  scrubber() {
    return {
      begin: (t) => {
        this.resume = this.resume || this.clock.playing;
        this.clock.playing = false;
        this.seek(t);
      },
      move: (t) => this.seek(t),
      end: () => {
        this.clock.playing = Boolean(this.resume) && !this.clock.finished;
        this.resume = false;
        this.dirty = true;
      },
    };
  }

  seek(t) {
    this.clock.seek(t);
    this.dirty = true;
  }

  toggle() {
    if (this.clock.finished) return this.restart();
    this.clock.playing = !this.clock.playing;
    this.dirty = true;
  }

  changeSpeed(speed) {
    this.clock.speed = speed;
    this.dirty = true;
  }

  restart() {
    this.root.classList.add("fading");
    window.setTimeout(() => {
      this.seek(this.clock.start);
      this.clock.playing = true;
      this.root.classList.remove("fading");
    }, FADE_MS);
  }

  key(event) {
    const steps = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.target.closest("button, input")) return;
    if (event.code === "Space") this.toggle();
    else if (event.code in steps) this.seek(this.clock.t + steps[event.code]);
    else return;
    event.preventDefault();
  }

  resize() {
    const ratio = pixelRatio();
    const bottom = this.dock.offsetHeight;
    this.root.style.setProperty("--dock", `${bottom}px`);
    const room = Math.max(bottom, Number(recordOption("room")) || 0);
    this.root.style.setProperty("--room", `${room}px`);
    for (const panel of this.panels) panel.resize(ratio, room);
    this.curve.resize(ratio, this.uiScale);
    this.dirty = true;
    if (!this.started) this.start();
  }

  start() {
    this.started = true;
    this.camera.now = this.camera.fit(this.locate());
    this.render();
    this.root.classList.add("ready");
    if (!isRecording()) requestAnimationFrame((now) => this.frame(now));
  }

  locate() {
    const t = this.clock.t;
    this.motion.place(t);
    let box = null;
    for (const panel of this.panels) {
      panel.place(t, this.motion);
      box = panel.extendBox(box, t);
    }
    return box;
  }

  frame(now) {
    const seconds = this.last === undefined ? 0 : Math.min((now - this.last) / 1000, LONGEST_STEP);
    this.last = now;
    const advanced = this.clock.advance(seconds);
    const moving = this.camera.step(seconds, this.locate());
    if (advanced || moving || this.dirty) {
      this.render();
      this.clock.save(now);
    }
    requestAnimationFrame((time) => this.frame(time));
  }

  render() {
    const t = this.clock.t;
    const stamp = clockLabel(this.scene.clock, t);
    for (const panel of this.panels) panel.draw(t, this.camera.now, stamp, this.scene.hud);
    this.curve.draw(t);
    this.controls.update(this.clock);
    this.pointer.update();
    this.dirty = false;
  }
}

window.player = new Player(document.getElementById("player"), JSON.parse(document.getElementById("scene").textContent));
