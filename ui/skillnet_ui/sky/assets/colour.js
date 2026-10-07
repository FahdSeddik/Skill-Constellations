const SkyColour = {
  setColoured(on) {
    this.scene.clumps.coloured = on;
    if (!this.data) return;
    for (const surface of this.surfaces) surface.stars.recolour(this.scene.clumps);
    this.labels.recolour(on, this.scene.palette);
    this.rebuild();
  },
};

Object.assign(Sky.prototype, SkyColour);
