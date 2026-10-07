const PLACE_COLUMNS = 1024;
const QUAD = [0, -1, 1, -1, 0, 1, 0, 1, 1, -1, 1, 1];
const TRAIL_VERTEX = `#version 300 es
precision highp float;
uniform highp sampler2D places;
uniform vec2 canvas;
uniform float width;
in vec2 ends;
in float tone;
in vec2 corner;
out float shade;
out float across;
vec2 place(float index) {
  int at = int(index);
  return texelFetch(places, ivec2(at % ${PLACE_COLUMNS}, at / ${PLACE_COLUMNS}), 0).xy;
}
void main() {
  vec2 from = place(ends.x);
  vec2 to = place(ends.y);
  vec2 along = to - from;
  vec2 normal = vec2(-along.y, along.x) / max(length(along), 0.0001);
  float half_width = width * 0.5 + 1.0;
  vec2 point = mix(from, to, corner.x) + normal * corner.y * half_width;
  gl_Position = vec4(point.x / canvas.x * 2.0 - 1.0, 1.0 - point.y / canvas.y * 2.0, 0.0, 1.0);
  shade = tone;
  across = corner.y * half_width;
}`;
const TRAIL_FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 colors[2];
uniform float alphas[2];
uniform float width;
in float shade;
in float across;
out vec4 color;
void main() {
  int tone = int(shade + 0.5);
  float alpha = alphas[tone] * clamp(width * 0.5 + 0.5 - abs(across), 0.0, 1.0);
  color = vec4(colors[tone] * alpha, alpha);
}`;

function compileShader(gl, kind, source) {
  const shader = gl.createShader(kind);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function linkProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, TRAIL_VERTEX));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, TRAIL_FRAGMENT));
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

function bindAttribute(gl, program, name, values, size, divisor) {
  const location = gl.getAttribLocation(program, name);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(location, divisor);
}

function settledInstances(run) {
  const ends = new Float32Array(run.settledOrder.length * 2);
  const tones = new Float32Array(run.settledOrder.length);
  run.settledOrder.forEach((index, rank) => {
    ends.set([run.source[index], run.copier[index]], rank * 2);
    tones[rank] = run.risk[index];
  });
  return [ends, tones];
}

class GlTrails {
  constructor(gl, program, run, palette) {
    this.gl = gl;
    this.program = program;
    this.run = run;
    this.colors = new Float32Array(trailColors(palette).flatMap((hex) => hexToRgb(hex).map((value) => value / 255)));
    this.rows = Math.ceil(run.lit.length / PLACE_COLUMNS);
    this.uniforms = Object.fromEntries(
      ["canvas", "width", "colors", "alphas"].map((name) => [name, gl.getUniformLocation(program, name)])
    );
    this.alphas = new Float32Array(TONES);
    this.places = new Float32Array(PLACE_COLUMNS * this.rows * 2);
    this.vertices = gl.createVertexArray();
    gl.bindVertexArray(this.vertices);
    const [ends, tones] = settledInstances(run);
    bindAttribute(gl, program, "corner", new Float32Array(QUAD), 2, 0);
    bindAttribute(gl, program, "ends", ends, 2, 1);
    bindAttribute(gl, program, "tone", tones, 1, 1);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, PLACE_COLUMNS, this.rows, 0, gl.RG, gl.FLOAT, this.places);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  upload(view) {
    for (let node = 0; node < view.px.length; node += 1) {
      this.places[node * 2] = view.px[node];
      this.places[node * 2 + 1] = view.py[node];
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PLACE_COLUMNS, this.rows, gl.RG, gl.FLOAT, this.places);
  }

  draw(context, view, t) {
    const gl = this.gl;
    this.upload(view);
    gl.viewport(0, 0, view.width, view.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const uniforms = this.uniforms;
    gl.useProgram(this.program);
    gl.uniform2f(uniforms.canvas, view.width, view.height);
    gl.uniform1f(uniforms.width, TRAIL_WIDTH * view.unit * view.look.width);
    gl.uniform3fv(uniforms.colors, this.colors);
    for (let risk = 0; risk < TONES; risk += 1) this.alphas[risk] = trailAlpha(risk, view.look);
    gl.uniform1fv(uniforms.alphas, this.alphas);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.vertices);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, upperBound(this.run.settledTimes, t));
  }
}

function makeTrails(canvas, run, palette) {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
  const program = gl && linkProgram(gl);
  return program ? new GlTrails(gl, program, run, palette) : new TrailPainter(run, palette);
}
