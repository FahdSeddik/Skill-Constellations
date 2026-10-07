const TONE_STEPS = 4096;
const TONE_SCALE = 512;
const TONE_LAST = TONE_STEPS - 1;
const OPAQUE = 255 << 24;
const SKY_GLOW_CENTRE = 0.46;
const SKY_GLOW_REACH = 0.62;

function toneTable() {
  return Uint8Array.from({ length: TONE_STEPS }, (_, step) => Math.round(255 * (1 - Math.exp(-step / TONE_SCALE))));
}

function linearRgb(hex) {
  return unitRgb(hex).map((value) => -Math.log(1 - Math.min(value, 0.999)));
}

function skyBackground(width, height, palette) {
  const [inner, outer] = [linearRgb(palette.haze), linearRgb(palette.sky)];
  const reach = Math.hypot(width, height) * SKY_GLOW_REACH;
  const background = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const share = Math.min(1, Math.hypot(x - width / 2, y - height * SKY_GLOW_CENTRE) / reach);
      const at = (y * width + x) * 3;
      const offset = ditherOffset(y * width + x) / 255;
      for (let channel = 0; channel < 3; channel += 1) {
        const level = inner[channel] + (outer[channel] - inner[channel]) * share;
        background[at + channel] = level + offset * Math.exp(level);
      }
    }
  }
  return background;
}

function compose(pixels, base, light, gain, table) {
  for (let pixel = 0, at = 0; pixel < pixels.length; pixel += 1, at += 3) {
    const red = ((base[at] + light[at] * gain) * TONE_SCALE) | 0;
    const green = ((base[at + 1] + light[at + 1] * gain) * TONE_SCALE) | 0;
    const blue = ((base[at + 2] + light[at + 2] * gain) * TONE_SCALE) | 0;
    pixels[pixel] =
      OPAQUE |
      (table[blue < TONE_LAST ? blue : TONE_LAST] << 16) |
      (table[green < TONE_LAST ? green : TONE_LAST] << 8) |
      table[red < TONE_LAST ? red : TONE_LAST];
  }
}
