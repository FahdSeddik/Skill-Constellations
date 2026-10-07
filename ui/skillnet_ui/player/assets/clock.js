const LONGEST_STEP = 0.1;
const SAVE_EVERY_MS = 400;
const RECORD_STEP = 1 / 30;

function isRecording() {
  return new URLSearchParams(window.location.search).has("record");
}

function recordOption(name) {
  return isRecording() ? new URLSearchParams(window.location.search).get(name) : null;
}

function overlayScale(root) {
  const scale = Number(recordOption("ui")) || 1;
  root.style.setProperty("--ui", String(scale));
  return scale;
}

function readStore(key) {
  try {
    return JSON.parse(window.sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

class Clock {
  constructor(spec, unitSeconds, key) {
    this.start = spec.start;
    this.end = spec.end;
    this.unitSeconds = unitSeconds;
    this.key = `skillnet-player-${key}`;
    this.t = spec.start;
    this.speed = 1;
    this.playing = true;
    this.savedAt = 0;
    this.restore(readStore(this.key));
  }

  restore(saved) {
    if (!saved) return;
    this.t = Math.min(Math.max(saved.t, this.start), this.end);
    this.speed = saved.speed;
    this.playing = saved.playing && this.t < this.end;
  }

  save(now) {
    if (now - this.savedAt < SAVE_EVERY_MS) return;
    writeStore(this.key, { t: this.t, speed: this.speed, playing: this.playing });
    this.savedAt = now;
  }

  advance(seconds) {
    if (!this.playing) return false;
    const step = Math.min(seconds, LONGEST_STEP) * this.speed;
    this.t = Math.min(this.end, this.t + step / this.unitSeconds);
    if (this.t >= this.end) this.playing = false;
    return true;
  }

  seek(t) {
    this.t = Math.min(Math.max(t, this.start), this.end);
    this.savedAt = 0;
  }

  get finished() {
    return this.t >= this.end;
  }

  share() {
    return (this.t - this.start) / (this.end - this.start);
  }
}
