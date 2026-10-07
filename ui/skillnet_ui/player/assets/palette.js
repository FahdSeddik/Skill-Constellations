const TINT_WHITENING = 0.3;

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba(hex, alpha) {
  const [red, green, blue] = hexToRgb(hex);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function mixHex(base, other, share) {
  const from = hexToRgb(base);
  const to = hexToRgb(other);
  const mixed = from.map((value, index) => Math.round(value + (to[index] - value) * share));
  return "#" + mixed.map((value) => value.toString(16).padStart(2, "0")).join("");
}

function isDark(hex) {
  const [red, green, blue] = hexToRgb(hex);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue < 128;
}

function glowBlend(palette) {
  return isDark(palette.sky) ? "lighter" : "multiply";
}

function applyPalette(element, palette, font, labelFont = font) {
  for (const [name, value] of Object.entries(palette)) {
    if (typeof value === "string") element.style.setProperty(`--${name}`, value);
  }
  element.style.setProperty("--font", font);
  element.style.setProperty("--label-font", labelFont);
}

function tintColors(palette, count) {
  const tints = [palette.glow];
  for (let index = 1; index < count; index += 1) {
    const base = palette.tints[(index - 1) % palette.tints.length];
    tints.push(mixHex(base, palette.star, TINT_WHITENING));
  }
  return tints;
}

function ditherOffset(index) {
  let hash = Math.imul(index ^ 0x9e3779b9, 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296 - 0.5;
}

function paintHaze(canvas, palette) {
  const { width, height } = canvas;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);
  const [inner, outer] = [hexToRgb(palette.haze), hexToRgb(palette.sky)];
  const [x, y, reach] = [width / 2, height * 0.46, Math.hypot(width, height) * 0.62];
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const share = Math.min(1, Math.hypot((pixel % width) - x, Math.floor(pixel / width) - y) / reach);
    const offset = ditherOffset(pixel);
    for (let channel = 0; channel < 3; channel += 1) {
      image.data[4 * pixel + channel] = inner[channel] + (outer[channel] - inner[channel]) * share + offset;
    }
    image.data[4 * pixel + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}
