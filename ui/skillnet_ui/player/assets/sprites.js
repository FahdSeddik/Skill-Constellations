const SPRITE = 128;
const CORE = 0.12;
const RING_AT = 0.68;
const RING_SOFTNESS = 0.13;
const RING_STEPS = 32;

function spriteCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  return canvas;
}

function radialSprite(stops) {
  const canvas = spriteCanvas();
  const context = canvas.getContext("2d");
  const half = SPRITE / 2;
  const gradient = context.createRadialGradient(half, half, 0, half, half, half);
  for (const [place, color] of stops) gradient.addColorStop(place, color);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(half, half, half, 0, 2 * Math.PI);
  context.fill();
  return canvas;
}

function starSprite(core, glow, look) {
  return radialSprite([
    [0, rgba(core, 1)],
    [look.core * 0.5, rgba(core, 0.95)],
    [look.core, rgba(core, 0.72)],
    [look.core * 1.6, rgba(glow, 0.5 * look.glow)],
    [look.core * 1.6 + 0.24, rgba(glow, 0.1 * look.glow)],
    [1, rgba(glow, 0)],
  ]);
}

function ringLevel(place) {
  return Math.exp(-Math.pow((place - RING_AT) / RING_SOFTNESS, 2));
}

function ringSprite(color) {
  const stops = [];
  const edge = ringLevel(1);
  for (let step = 0; step <= RING_STEPS; step += 1) {
    const place = step / RING_STEPS;
    stops.push([place, rgba(color, Math.max(0, ringLevel(place) - edge) / (1 - edge))]);
  }
  return radialSprite(stops);
}

function spikeSprite(color) {
  const canvas = spriteCanvas();
  const context = canvas.getContext("2d");
  const half = SPRITE / 2;
  for (const upright of [false, true]) {
    const gradient = upright
      ? context.createLinearGradient(half, 0, half, SPRITE)
      : context.createLinearGradient(0, half, SPRITE, half);
    gradient.addColorStop(0, rgba(color, 0));
    gradient.addColorStop(0.5, rgba(color, 0.85));
    gradient.addColorStop(1, rgba(color, 0));
    context.fillStyle = gradient;
    if (upright) context.fillRect(half - 2, 0, 4, SPRITE);
    else context.fillRect(0, half - 2, SPRITE, 4);
  }
  return canvas;
}

function buildSprites(palette, typeCount, look) {
  const tones = [palette.glow, palette.risk];
  const bright = { ...look, glow: 1 };
  return {
    look,
    stars: tintColors(palette, typeCount).map((tint) => starSprite(palette.star, tint, look)),
    flashes: tones.map((tone) => starSprite(palette.star, tone, bright)),
    rings: tones.map((tone) => ringSprite(tone)),
    spike: spikeSprite(palette.star),
  };
}

const spriteSets = new Map();

function warmSprites(palette, typeCount) {
  for (let crowd = CROWD_FLOOR; crowd <= 1 + 1e-9; crowd += CROWD_STEP) {
    spritesFor(palette, typeCount, lookFor(Math.round(crowd / CROWD_STEP) * CROWD_STEP));
  }
}

function spritesFor(palette, typeCount, look) {
  const key = look.crowd.toFixed(2);
  if (!spriteSets.has(key)) spriteSets.set(key, buildSprites(palette, typeCount, look));
  return spriteSets.get(key);
}

function drawSprite(context, sprite, x, y, size) {
  context.drawImage(sprite, x - size / 2, y - size / 2, size, size);
}

function drawRing(context, sprite, x, y, radius) {
  drawSprite(context, sprite, x, y, (2 * radius) / RING_AT);
}
