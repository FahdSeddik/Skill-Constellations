const SKY_STEPS = { ArrowLeft: -1, ArrowRight: 1 };

const SkyPlayback = {
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
  },

  seek(t) {
    this.clock.seek(t);
    this.dirty = true;
  },

  toggle() {
    if (this.clock.finished) {
      this.clock.seek(this.clock.start);
      this.clock.playing = true;
    } else {
      this.clock.playing = !this.clock.playing;
    }
    this.dirty = true;
  },

  changeSpeed(speed) {
    this.clock.speed = speed;
    this.dirty = true;
  },

  key(event) {
    if (event.target.closest("button, input")) return;
    if (event.code === "Space") this.toggle();
    else if (event.code in SKY_STEPS) this.seek(this.clock.t + SKY_STEPS[event.code]);
    else return;
    event.preventDefault();
  },
};

Object.assign(Sky.prototype, SkyPlayback, SkyMotion, SkyRelight);
