const PlayerRecord = {
  renderAt(t, zoom) {
    this.clock.seek(t);
    const box = this.locate();
    if (recordOption("final") === null) this.camera.step(RECORD_STEP, box);
    else this.camera.now = this.finalFrame(zoom || 1);
    this.render();
  },

  finalFrame(zoom) {
    let box = null;
    for (const panel of this.panels) box = panel.extendBox(box, this.clock.end);
    const [fit, x, y] = this.camera.fit(box);
    return [fit * zoom, x, y];
  },
};

Object.assign(Player.prototype, PlayerRecord);
