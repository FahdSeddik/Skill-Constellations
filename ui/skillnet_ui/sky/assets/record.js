const SkyRecord = {
  renderAt(t, view) {
    this.virtual = (this.virtual || 0) + RECORD_STEP * 1000;
    this.clock.playing = false;
    this.clock.seek(t);
    if (view) this.camera.hold(view);
    this.dirty = true;
    this.tick(RECORD_STEP, this.virtual);
  },

  reframe(transform) {
    this.transform = transform;
    this.rebuild();
  },
};

Object.assign(Sky.prototype, SkyRecord);
