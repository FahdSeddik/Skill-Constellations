const SKY_DAY_MS = 86400000;
const CAPTION_MS = 7000;
const SKY_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const SKY_COUNT = new Intl.NumberFormat("en-US");

function counted(count, one, many) {
  return `${SKY_COUNT.format(count)} ${count === 1 ? one : many}`;
}

function weekCounts(weeks, t) {
  const week = Math.max(0, Math.min(weeks.births.length - 1, Math.floor(t)));
  const parts = [
    [weeks.births[week], "new skill", "new skills"],
    [weeks.arrivals[week], "adoption", "adoptions"],
    [weeks.copies[week], "identified copy", "identified copies"],
  ];
  return `${parts.map((part) => counted(...part)).join(" · ")} this week`;
}

class SkyHud {
  constructor(host, scene) {
    this.element = element("div", "hud", host);
    this.stamp = element("div", "stamp", this.element);
    this.counts = element("div", "note", this.element);
    this.caption = element("div", "caption", host);
    this.caption.textContent = scene.caption;
    window.setTimeout(() => this.caption.classList.add("faded"), CAPTION_MS);
    this.origin = Date.parse(scene.origin);
    this.last = this.origin + (scene.weeks.births.length * 7 - 1) * SKY_DAY_MS;
    this.weeks = scene.weeks;
  }

  update(t) {
    const moment = Math.min(this.last, this.origin + Math.max(0, t) * 7 * SKY_DAY_MS);
    const stamp = SKY_DATE.format(new Date(moment));
    const counts = weekCounts(this.weeks, t);
    if (this.stamp.textContent !== stamp) this.stamp.textContent = stamp;
    if (this.counts.textContent !== counts) this.counts.textContent = counts;
  }
}

function legendToggle(host, text, kind, handler) {
  const button = element("button", `toggle ${kind}`, host);
  button.textContent = text;
  button.setAttribute("aria-pressed", String(handler.on));
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    handler.set(on);
  });
  return button;
}

class SkyLegend {
  constructor(host, legend, handlers) {
    this.element = element("div", "legend", host);
    for (const item of legend.items) {
      const entry = element("span", `item ${item.kind}`, this.element);
      element("i", `swatch ${item.kind}`, entry);
      element("span", "", entry).textContent = item.label;
    }
    const toggles = element("span", "toggles", this.element);
    if (handlers.names) this.names = legendToggle(toggles, legend.names, "names", handlers.names);
    this.toggle = legendToggle(toggles, legend.risk, "risk", handlers.risk);
  }
}
