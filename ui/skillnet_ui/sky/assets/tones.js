const TONE_CORE = 0;
const TONE_FAINT = 1;
const TONE_NEUTRAL = 2;
const TONE_CLUMPS = 3;
const NEUTRAL_DIM = 0.3;
const CLUMP_CHROMA = 1.7;
const LABEL_WHITENING = 0.55;

function vividRgb(hex) {
  const rgb = unitRgb(hex);
  const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
  const spread = rgb.map((value) => Math.max(0, mean + (value - mean) * CLUMP_CHROMA));
  const top = Math.max(...spread);
  return spread.map((value) => value / top);
}

function starColours(palette) {
  const faint = unitRgb(mixHex(palette.star, palette.muted, 0.5));
  const clumps = palette.tints.map(vividRgb);
  return [unitRgb(palette.star), faint, faint.map((value) => value * NEUTRAL_DIM), ...clumps];
}

function labelColour(hex, palette) {
  const star = unitRgb(palette.star);
  const mixed = vividRgb(hex).map((value, index) => value + (star[index] - value) * LABEL_WHITENING);
  return `rgb(${mixed.map((value) => Math.round(255 * value)).join(",")})`;
}

function starTones(data, clumps) {
  const tones = new Uint8Array(data.nx.length);
  for (let node = 0; node < tones.length; node += 1) {
    const clump = data.nclump[node];
    if (!clumps.coloured) tones[node] = data.nfield[node] === 1 ? TONE_FAINT : TONE_CORE;
    else tones[node] = clump > 0 ? TONE_CLUMPS + clumps.items[clump - 1].colour : TONE_NEUTRAL;
  }
  return tones;
}
