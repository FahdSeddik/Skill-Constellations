const DAY_MS = 86400000;
const WEEK_DAYS = 7;
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const COUNT_FORMAT = new Intl.NumberFormat("en-US");

function dayAt(days, t) {
  const index = Math.max(0, Math.min(days.length - 1, Math.floor(t)));
  const share = Math.max(0, t - index);
  const next = index + 1 < days.length ? days[index + 1] : days[index] + WEEK_DAYS;
  return Math.max(0, days[index] + (next - days[index]) * share);
}

function clockLabel(clock, t) {
  if (clock.kind === "day") return `Day ${Math.floor(dayAt(clock.days, t))}`;
  const origin = Date.parse(clock.origin);
  const moment = Math.min(origin + t * WEEK_DAYS * DAY_MS, Date.parse(clock.last));
  return DATE_FORMAT.format(new Date(Math.max(origin, moment)));
}

function counted(count, one, many) {
  return `${COUNT_FORMAT.format(count)} ${count === 1 ? one : many}`;
}

function noteLabel(run, mode, t) {
  if (mode === "holders") return t < run.litTimes[0] ? "" : counted(run.litCount(t), "adopter", "adopters");
  const week = Math.floor(t);
  const copies = run.weeks.copies[week] || 0;
  if (copies === 0) return "";
  const off = run.weeks.off[week] || 0;
  const note = `${counted(copies, "copy", "copies")} this week`;
  return off ? `${note}, ${COUNT_FORMAT.format(off)} of them involving a repository outside this view` : note;
}

class Hud {
  constructor(host, title) {
    this.element = document.createElement("div");
    this.element.className = "hud";
    this.title = this.line("title", title);
    this.stamp = this.line("stamp", "");
    this.note = this.line("note", "");
    host.appendChild(this.element);
    if (!title) this.title.remove();
  }

  line(name, text) {
    const element = document.createElement("div");
    element.className = name;
    element.textContent = text;
    this.element.appendChild(element);
    return element;
  }

  update(stamp, note) {
    if (this.stamp.textContent !== stamp) this.stamp.textContent = stamp;
    if (this.note.textContent !== note) this.note.textContent = note;
  }
}
