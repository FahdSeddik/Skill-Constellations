const SPEEDS = [0.5, 1, 2, 4];
const ICONS = {
  play: "M4 2v12l10-6z",
  pause: "M3.5 2h3v12h-3zM9.5 2h3v12h-3z",
  replay: "M8 2.5V0L4.5 3 8 6V3.9a4.1 4.1 0 1 1-4.1 4.1H2.5A5.5 5.5 0 1 0 8 2.5z",
};
const SVG_SPACE = "http://www.w3.org/2000/svg";

function element(tag, name, host) {
  const made = document.createElement(tag);
  made.className = name;
  host.appendChild(made);
  return made;
}

function iconButton(host) {
  const button = element("button", "play", host);
  const svg = document.createElementNS(SVG_SPACE, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  const path = document.createElementNS(SVG_SPACE, "path");
  svg.appendChild(path);
  button.appendChild(svg);
  return [button, path];
}

class Controls {
  constructor(host, clock, player) {
    this.element = element("div", "controls", host);
    [this.button, this.icon] = iconButton(this.element);
    this.button.addEventListener("click", () => player.toggle());
    this.speeds = this.speedButtons(player);
    this.range = this.slider(clock, player.scrub);
    this.state = {};
  }

  speedButtons(player) {
    const group = element("div", "speeds", this.element);
    return SPEEDS.map((speed) => {
      const button = element("button", "", group);
      button.textContent = `${speed}×`;
      button.addEventListener("click", () => player.changeSpeed(speed));
      return button;
    });
  }

  slider(clock, scrub) {
    const range = element("input", "scrub", this.element);
    Object.assign(range, { type: "range", min: clock.start, max: clock.end, step: "any" });
    range.setAttribute("aria-label", "Timeline");
    range.addEventListener("pointerdown", () => scrub.begin(Number(range.value)));
    range.addEventListener("input", () => scrub.move(Number(range.value)));
    range.addEventListener("change", () => scrub.end());
    return range;
  }

  update(clock) {
    const icon = clock.playing ? "pause" : clock.finished ? "replay" : "play";
    if (this.state.icon !== icon) {
      this.icon.setAttribute("d", ICONS[icon]);
      this.button.setAttribute("aria-label", icon);
    }
    if (this.state.speed !== clock.speed) {
      SPEEDS.forEach((speed, index) => this.speeds[index].classList.toggle("on", speed === clock.speed));
    }
    this.range.value = clock.t;
    this.range.style.setProperty("--done", `${(clock.share() * 100).toFixed(2)}%`);
    this.state = { icon, speed: clock.speed };
  }
}
