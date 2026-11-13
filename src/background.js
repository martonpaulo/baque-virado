// The moving background: a GPU kaleidoscope underneath, and a 2D video-feedback tunnel on top
// that the rhythm's shapes and the hits keep feeding.

import { isAlfaia, STEPS_PER_BAR, VOICES } from './music.js';
import { angleOf, SCOPE_RADIUS } from './scope.js';
import { blendAt, sceneAt } from './show.js';
import { boneAlpha, COLORS, fgAlpha, TINTS, voidAlpha } from './theme.js';

const CROSSFADE_BARS = 1.5; // ≈3 s, centred on each scene boundary
const FEEDBACK_KEYS = ['zoom', 'rot', 'hue', 'keep', 'speed'];

// Hit energy fed to the shader (ages in seconds).
const BOOM_ATTACK = 0.035; // alfaia/stick boom rise time constant
const BOOM_DECAY = 0.25; // alfaia/stick boom fall time constant
const BOOM_GAIN = 1.6; // boom peak scale
const ANSWER_BOOM_SCALE = 0.7; // the answer hand booms softer
const CRACK_DECAY = 0.05; // caixa accent flash time constant

// Feedback tunnel.
const INITIAL_SHADER_SCALE = 0.5; // shader resolution before main.js sets it
const FEEDBACK_FPS = 30; // frame rate the `keep` factor was tuned at
const KEEP_EXPONENT = 0.32; // softens `keep`: alpha = keep ^ (frames × this)
const FEEDBACK_SATURATE = 1.06; // saturation boost per feedback pass
const FEEDBACK_MAX_STEP = 0.25; // seconds; a longer gap skips the feedback (seek, first frame)
const FULL_CIRCLE = 7; // radians; any end angle past 2π closes an arc

// Emissions, sizes relative to the wheel's radius on the canvas.
const SHAPE_SCALE = 1.2; // the rhythm's shape, drawn a bit outside the wheel
const PULSE_DECAY = 0.15; // seconds, alfaia pulse time constant
const SHAPE_ALPHA = 0.35,
  SHAPE_PULSE_ALPHA = 0.5; // alpha = base + pulse part
const SHAPE_WIDTH = 2.5,
  SHAPE_PULSE_WIDTH = 3; // width = base + pulse part (CSS px)
const COMB_ALPHA = 0.16;
const COMB_WIDTH = 1.2; // CSS px
const COMB_COUNT = 48; // radial strokes around the wheel
const COMB_SPIN = 0.2; // radians per visual second
const COMB_INNER = 1.12,
  COMB_OUTER = 1.2; // comb extent; sparks sit on COMB_INNER too
const HIT_LIFE = 0.09; // seconds a fresh hit's ring and spark last
const BIG_RING_ALPHA = 0.7,
  SMALL_RING_ALPHA = 0.18; // alfaia/stick vs other voices
const BIG_RING_WIDTH = 3.2,
  SMALL_RING_WIDTH = 1.2; // CSS px
const BIG_RING_RADIUS = 1.06,
  SMALL_RING_RADIUS = 1.02;
const SPARK_ALPHA = 0.8;
const BIG_SPARK_SIZE = 6,
  SMALL_SPARK_SIZE = 3.5; // CSS px

// Moiré in the swing scene.
const MOIRE_RINGS = 46; // ring count across the diagonal
const MOIRE_SPACING = 0.55; // fraction of diagonal / count between rings
const MOIRE_ALPHA = 0.1; // straight-grid rings
const SWING_SPACING = 1.031; // the swung set is spaced a touch wider
const SWING_WOBBLE_X = 6,
  SWING_OFFSET_Y = 4; // CSS px; the swung set's centre offset
const SWING_WOBBLE_RATE = 1.2; // radians per visual second

// Stick strobe and vignette.
const STROBE_LIFE = 0.07; // seconds
const STROBE_ALPHA = 0.09; // peak flash
const VIGNETTE_STOPS = [
  [0, 0.6],
  [0.2, 0],
  [0.6, 0],
  [0.72, 0.82],
  [1, 0.95],
]; // [stop, background alpha], top to bottom

/** Background parameters at a position: both scenes' looks plus the mix between them. */
export function backgroundAt(position) {
  const { from, to, amount, scene } = blendAt(position, CROSSFADE_BARS);
  const params = { from: from.fx, to: to.fx, mix: amount, strobe: scene.fx.strobe || 0, sceneId: scene.id };
  for (const key of FEEDBACK_KEYS) params[key] = from.fx[key] + (to.fx[key] - from.fx[key]) * amount;
  return params;
}

const VERTEX_SHADER = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FRAGMENT_SHADER = `precision highp float;
  uniform vec2 uRes, uC; uniform float uT, uBoom, uCrack, uSegA, uWarpA, uPalA, uSegB, uWarpB, uPalB, uMix;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) { v += a * n(p); p = m * p; a *= .5; } return v; }
  vec3 pal(float t){ return .5 + .5 * cos(6.2831 * (t + vec3(0., .33, .67))); }
  vec3 look(vec2 p, float seg, float warp, float palo){
    float r = length(p), a = atan(p.y, p.x);
    float s = 6.2831 / seg; a = mod(a + uT * .04, s); a = abs(a - s * .5);
    vec2 q = vec2(cos(a), sin(a)) * r;
    vec2 w = q * (2.6 + uBoom * .35) + vec2(uT * .11, -uT * .07);
    vec2 o = vec2(fbm(w + uT * .1), fbm(w + vec2(5.2, 1.3) - uT * .1));
    vec2 o2 = vec2(fbm(w + warp * 3. * o + vec2(1.7, 9.2) + uT * .15), fbm(w + warp * 3. * o + vec2(8.3, 2.8)));
    float v = fbm(w + warp * 3. * o2);
    float rings = sin(log(r + .02) * 14. - uT * 3. + v * 9.) * .5 + .5;
    vec3 col = pal(v * 1.5 + r * .7 - uT * .08 + palo);
    col = mix(col * .18, col, smoothstep(.15, .95, rings));
    col += pal(v + palo + .5) * uBoom * .4 * smoothstep(0., .6, r);
    return col;
  }
  void main(){
    vec2 p = (gl_FragCoord.xy - uC) / uRes.y;
    vec3 col;
    if (uMix < .002) col = look(p, uSegA, uWarpA, uPalA);
    else if (uMix > .998) col = look(p, uSegB, uWarpB, uPalB);
    else col = mix(look(p, uSegA, uWarpA, uPalA), look(p, uSegB, uWarpB, uPalB), uMix);
    col += vec3(uCrack * .05);
    col *= smoothstep(0., .2, length(p)) * .85 + .15;
    gl_FragColor = vec4(pow(col, vec3(1.2)) * .85, 1.);
  }`;
const UNIFORMS = ['uRes', 'uC', 'uT', 'uBoom', 'uCrack', 'uSegA', 'uWarpA', 'uPalA', 'uSegB', 'uWarpB', 'uPalB', 'uMix'];

function createKaleidoscope(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER),
    fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one triangle covering the screen
  const location = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  const uniform = Object.fromEntries(UNIFORMS.map(name => [name, gl.getUniformLocation(program, name)]));
  return {
    resize(width, height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    },
    draw({ centreX, centreY, time, boom, crack, params }) {
      gl.uniform2f(uniform.uRes, canvas.width, canvas.height);
      gl.uniform2f(uniform.uC, centreX, canvas.height - centreY);
      gl.uniform1f(uniform.uT, time);
      gl.uniform1f(uniform.uBoom, boom);
      gl.uniform1f(uniform.uCrack, crack);
      gl.uniform1f(uniform.uSegA, params.from.seg);
      gl.uniform1f(uniform.uWarpA, params.from.warp);
      gl.uniform1f(uniform.uPalA, params.from.pal);
      gl.uniform1f(uniform.uSegB, params.to.seg);
      gl.uniform1f(uniform.uWarpB, params.to.warp);
      gl.uniform1f(uniform.uPalB, params.to.pal);
      gl.uniform1f(uniform.uMix, params.mix);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

/** How hard the alfaias (boom) and the caixa accents (crack) are hitting right now. */
function hitEnergy(recent) {
  let boom = 0,
    crack = 0;
  for (const h of recent) {
    if (isAlfaia(h.voice) || h.voice === 'stick')
      boom = Math.max(boom, (1 - Math.exp(-h.age / BOOM_ATTACK)) * Math.exp(-h.age / BOOM_DECAY) * BOOM_GAIN * (h.voice === 'answer' ? ANSWER_BOOM_SCALE : 1));
    if (h.voice === 'caixa' && h.hit.velocity === 1) crack = Math.max(crack, Math.exp(-h.age / CRACK_DECAY));
  }
  return { boom, crack };
}

export function createBackground(fxCanvas, feedbackCanvas) {
  const kaleidoscope = createKaleidoscope(fxCanvas);
  const ctx = feedbackCanvas.getContext('2d');
  const previous = document.createElement('canvas'),
    previousCtx = previous.getContext('2d');
  let geometry = null,
    shaderScale = INITIAL_SHADER_SCALE,
    hasFrame = false;

  function resize(next) {
    geometry = next;
    feedbackCanvas.width = previous.width = next.width;
    feedbackCanvas.height = previous.height = next.height;
    if (kaleidoscope) kaleidoscope.resize(Math.round(next.width * shaderScale), Math.round(next.height * shaderScale));
    hasFrame = false;
  }

  function drawFeedback(params, step) {
    const { centreX, centreY } = geometry;
    ctx.save();
    ctx.globalAlpha = params.keep ** (step * FEEDBACK_FPS * KEEP_EXPONENT);
    ctx.filter = `hue-rotate(${(params.hue * step).toFixed(2)}deg) saturate(${FEEDBACK_SATURATE})`;
    const zoom = 1 + params.zoom * step;
    ctx.translate(centreX, centreY);
    ctx.rotate(params.rot * step);
    ctx.scale(zoom, zoom);
    ctx.translate(-centreX, -centreY);
    ctx.drawImage(previous, 0, 0);
    ctx.restore();
  }

  function drawEmissions(recent, shapes, time) {
    const { centreX, centreY, scopeRadius, dpr } = geometry,
      toCanvas = (scopeRadius / SCOPE_RADIUS) * SHAPE_SCALE;
    let pulse = 0;
    for (const h of recent) if (isAlfaia(h.voice)) pulse = Math.max(pulse, Math.exp(-h.age / PULSE_DECAY));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const { voice, drawn } of shapes) {
      // the rhythm's shape, re-inked each frame; the feedback pulls it outward
      if (drawn.length < 2) continue;
      ctx.strokeStyle = VOICES[voice].color;
      ctx.globalAlpha = SHAPE_ALPHA + SHAPE_PULSE_ALPHA * pulse;
      ctx.lineWidth = (SHAPE_WIDTH + SHAPE_PULSE_WIDTH * pulse) * dpr;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      drawn.forEach(([x, y], i) => {
        (i ? ctx.lineTo : ctx.moveTo).call(ctx, centreX + x * toCanvas, centreY + y * toCanvas);
      });
      ctx.stroke();
    }
    ctx.globalAlpha = COMB_ALPHA;
    ctx.strokeStyle = COLORS.fg;
    ctx.lineWidth = COMB_WIDTH * dpr; // a radial comb the feedback bends into spirals
    for (let i = 0; i < COMB_COUNT; i++) {
      const a = (i / COMB_COUNT) * Math.PI * 2 + time * COMB_SPIN;
      ctx.beginPath();
      ctx.moveTo(centreX + Math.cos(a) * scopeRadius * COMB_INNER, centreY + Math.sin(a) * scopeRadius * COMB_INNER);
      ctx.lineTo(centreX + Math.cos(a) * scopeRadius * COMB_OUTER, centreY + Math.sin(a) * scopeRadius * COMB_OUTER);
      ctx.stroke();
    }
    for (const h of recent) {
      // a ring and a spark for each fresh hit
      if (h.age > HIT_LIFE) continue;
      const { color } = VOICES[h.voice],
        big = isAlfaia(h.voice) || h.voice === 'stick',
        fade = 1 - h.age / HIT_LIFE;
      ctx.strokeStyle = color;
      ctx.globalAlpha = (big ? BIG_RING_ALPHA : SMALL_RING_ALPHA) * fade * h.hit.velocity;
      ctx.lineWidth = (big ? BIG_RING_WIDTH : SMALL_RING_WIDTH) * dpr;
      ctx.beginPath();
      ctx.arc(centreX, centreY, scopeRadius * (big ? BIG_RING_RADIUS : SMALL_RING_RADIUS), 0, FULL_CIRCLE);
      ctx.stroke();
      if (big || h.voice === 'agogo') {
        const a = angleOf((h.at % 1) * STEPS_PER_BAR);
        ctx.globalAlpha = SPARK_ALPHA * fade;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          centreX + Math.cos(a) * scopeRadius * COMB_INNER,
          centreY + Math.sin(a) * scopeRadius * COMB_INNER,
          (big ? BIG_SPARK_SIZE : SMALL_SPARK_SIZE) * dpr,
          0,
          FULL_CIRCLE,
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawMoire(position, time) {
    // straight grid vs measured swing: two ring sets interfering
    const { width, height, centreX, centreY, scopeRadius, dpr } = geometry;
    const scene = sceneAt(Math.floor(position)),
      swingOn = scene.swing(Math.floor(position) - scene.start);
    const count = MOIRE_RINGS,
      spacing = (Math.hypot(width, height) / count) * MOIRE_SPACING;
    ctx.save();
    ctx.lineWidth = dpr;
    for (let i = 1; i < count; i++) {
      ctx.strokeStyle = fgAlpha(MOIRE_ALPHA);
      ctx.beginPath();
      ctx.arc(centreX, centreY, scopeRadius + i * spacing, 0, FULL_CIRCLE);
      ctx.stroke();
      if (swingOn) {
        ctx.strokeStyle = TINTS.swingRing;
        ctx.beginPath();
        ctx.arc(
          centreX + SWING_WOBBLE_X * dpr * Math.sin(time * SWING_WOBBLE_RATE),
          centreY + SWING_OFFSET_Y * dpr,
          scopeRadius + i * spacing * SWING_SPACING,
          0,
          FULL_CIRCLE,
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** One frame. `clock` = { time, step } (seconds); `shapes` are the wheel's partly drawn shapes. */
  function draw(position, params, recent, clock, shapes) {
    if (!geometry) return;
    const { width, height, centreX, centreY } = geometry;
    if (kaleidoscope) kaleidoscope.draw({ centreX: centreX * shaderScale, centreY: centreY * shaderScale, time: clock.time, params, ...hitEnergy(recent) });
    ctx.clearRect(0, 0, width, height);
    if (clock.step > 0 && clock.step < FEEDBACK_MAX_STEP && hasFrame) drawFeedback(params, clock.step);
    drawEmissions(recent, shapes, clock.time);
    if (params.sceneId === 'swing') drawMoire(position, clock.time);
    if (params.strobe)
      for (const h of recent)
        if (h.voice === 'stick' && h.age < STROBE_LIFE) {
          ctx.fillStyle = boneAlpha((STROBE_ALPHA * (1 - h.age / STROBE_LIFE)).toFixed(3));
          ctx.fillRect(0, 0, width, height);
        }
    // keep this frame for the feedback, then darken top and bottom for the viewer only
    previousCtx.globalCompositeOperation = 'copy';
    previousCtx.drawImage(feedbackCanvas, 0, 0);
    const vignette = ctx.createLinearGradient(0, 0, 0, height);
    for (const [stop, alpha] of VIGNETTE_STOPS) vignette.addColorStop(stop, voidAlpha(alpha));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    hasFrame = true;
  }

  return {
    resize,
    draw,
    /** Shader resolution relative to the canvas (lower on phones, full for video export). */
    setShaderScale(scale) {
      shaderScale = scale;
      if (geometry) resize(geometry);
    },
  };
}
