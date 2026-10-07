const SKY_ARRAYS = { u8: Uint8Array, u16: Uint16Array, u32: Uint32Array };
const SKY_ALIGN = 8;
const WEEK_HOURS = 168;

function unpackSky(buffer) {
  const length = new DataView(buffer).getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, length)));
  const body = Math.ceil((4 + length) / SKY_ALIGN) * SKY_ALIGN;
  const arrays = {};
  for (const [name, [kind, offset, count]] of Object.entries(header.arrays)) {
    arrays[name] = new SKY_ARRAYS[kind](buffer, body + offset, count);
  }
  return arrays;
}

async function loadSky(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The data request returned status ${response.status}.`);
  return unpackSky(await response.arrayBuffer());
}
