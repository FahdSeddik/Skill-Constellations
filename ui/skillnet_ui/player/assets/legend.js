const SWATCH = [24, 18];

function swatchCanvas(ratio) {
  const canvas = document.createElement("canvas");
  canvas.width = SWATCH[0] * ratio;
  canvas.height = SWATCH[1] * ratio;
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  return [canvas, context];
}

function paintStar(context, item, { sprites }) {
  const [x, y] = [SWATCH[0] / 2, SWATCH[1] / 2];
  drawSprite(context, sprites.stars[item.tint || 0], x, y, SWATCH[1]);
  drawSprite(context, sprites.stars[item.tint || 0], x, y, SWATCH[1] * 0.6);
  if (!item.spike) return;
  drawSprite(context, sprites.spike, x, y, SWATCH[0]);
  drawSprite(context, sprites.spike, x, y, SWATCH[1]);
}

function paintLink(context, item, { sprites, palette }) {
  const color = item.tone === "risk" ? palette.risk : palette.glow;
  context.strokeStyle = rgba(color, 0.9);
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(1, SWATCH[1] - 3);
  context.lineTo(SWATCH[0] - 1, 3);
  context.stroke();
  const sprite = sprites.flashes[item.tone === "risk" ? 1 : 0];
  drawSprite(context, sprite, SWATCH[0] * 0.68, SWATCH[1] * 0.37, 14);
}

function paintLine(context, item, { palette }) {
  context.strokeStyle = palette[item.tone];
  context.lineWidth = 2.1;
  context.setLineDash(item.dashed ? [5, 3] : []);
  context.beginPath();
  context.moveTo(2, SWATCH[1] / 2);
  context.lineTo(SWATCH[0] - 2, SWATCH[1] / 2);
  context.stroke();
}

function paintRing(context, item, { sprites, palette }) {
  paintStar(context, { tint: 0 }, { sprites });
  context.globalCompositeOperation = "source-over";
  context.strokeStyle = palette.ink;
  context.lineWidth = 1.6;
  context.beginPath();
  context.arc(SWATCH[0] / 2, SWATCH[1] / 2, 7, 0, 2 * Math.PI);
  context.stroke();
}

const SWATCH_PAINTERS = { link: paintLink, line: paintLine, ring: paintRing };

function legendItem(item, sprites, palette, ratio) {
  const element = document.createElement("span");
  element.className = "item";
  const [canvas, context] = swatchCanvas(ratio);
  context.globalCompositeOperation = glowBlend(palette);
  (SWATCH_PAINTERS[item.kind] || paintStar)(context, item, { sprites, palette });
  const label = document.createElement("span");
  label.textContent = item.label;
  element.append(canvas, label);
  return element;
}

function buildLegend(host, items, sprites, palette, ratio) {
  const element = document.createElement("div");
  element.className = "legend";
  for (const item of items) element.appendChild(legendItem(item, sprites, palette, ratio));
  host.appendChild(element);
  return element;
}
