// The forró background, drawn in place of the maracatu kaleidoscope (src/background.js calls it).
// Circular, coming out of the wheel: a dusk sky whose warm light shrinks toward the wheel as the show
// goes on (saudade is light leaving), a sanfona bellows that opens and closes once per bar around the
// wheel, and bandeirinhas thrown outward by the zabumba's low head. The night is never still (#63):
// the bellows open wider the busier the music is and their pleats travel round on the energy clock,
// the warm light leans out and back with them, and sparks of the fogueira rise from the wheel all
// the time, more of them and faster as the trio fills.
// It depends only on the show position and the hits, never on earlier frames. Flash safety (WCAG
// 2.3.1): nothing changes brightness in a beat; the pulse is motion (the bellows, the flags and the
// sparks), and each flag or spark covers far less than a quarter of a 10° field. Reduced motion
// keeps the picture as it was before the energy moved it: no spark, and the bellows as deep in every bar.

import { FORRO, REDUCED_MOTION_QUERY } from '../theme.js';
import { hash } from '../util.js';

const TAU = Math.PI * 2;
// The wheel's outer edge in wheel radii: its step numbers end there (src/scope.js: VIEWBOX_RADIUS /
// OUTER, 135 / 112). Inside it the sky stays night, so the numbers and the dots keep 3:1 contrast;
// the light starts just outside.
const WHEEL_EDGE = 1.21;
// The sky: [stop, colour] from the wheel's edge outward. `dusk` (0 → 1 over the show) pulls the warm
// stops in toward the wheel, so the night widens.
const SKY = {
  start: [
    [0.04, FORRO.flame],
    [0.12, FORRO.ember],
    [0.42, FORRO.dusk],
    [0.7, FORRO.night],
  ],
  shrink: 0.3, // at the end, the warm stops sit at this fraction of where they began
  reach: 3.2, // the gradient's outer edge, in wheel radii from the rim
  dim: 0.82, // the sky's opacity over the night colour: it never reaches full brightness
  lean: 0.12, // with the bellows, the warm stops lean this much further out and back at full energy
};
// `depth`: how far the bellows open in a bar with reduced motion; with motion, from `calm` of it in
// silence to `full` of it at full energy. `travel`: turns the pleats go round in a second of the energy clock.
const BELLOWS = { radius: 1.45, depth: 0.07, calm: 0.5, full: 1.8, travel: 0.012, folds: 28, pleat: 0.08, width: 2, alpha: 0.75, innerAlpha: 0.35 };
// Sparks of the fogueira: each leaves the wheel's edge, drifts `reach` wheel radii outward and `rise`
// upward in 1 / `rate` seconds of the energy clock, swaying a little; `few` of them fly in silence
// and all at full energy. Sizes in CSS px.
const SPARKS = {
  count: 34,
  few: 0.35,
  from: 1.24,
  reach: 1.1,
  rise: 0.7,
  rate: 0.3,
  rates: 0.9,
  sway: 0.05,
  sways: 3,
  size: 1.5,
  sizes: 2,
  alpha: 0.7,
  fadeIn: 0.1,
  draws: 4,
  seed: 613,
};
const SPARK_COLOURS = [FORRO.flame, FORRO.ember, FORRO.paper];
let motionQuery; // read at the first frame it exists, not when the module loads
function reducedMotion() {
  motionQuery ??= globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
  return Boolean(motionQuery?.matches);
}
const FLAGS = {
  voices: ['grave'], // the low end throws them
  from: 1.6, // wheel radii, outside the bellows
  speed: 1.6, // wheel radii per second
  size: 7, // CSS px, half the base of the triangle
  colours: [FORRO.red, FORRO.flame, FORRO.teal, FORRO.paper],
  alpha: 0.85,
  life: 1.2, // seconds: the window of hits the background receives
  perHit: 3,
  seedScale: 1000,
};

function sky(ctx, { width, height, centreX, centreY, scopeRadius }, dusk, lean) {
  ctx.fillStyle = FORRO.night;
  ctx.fillRect(0, 0, width, height);
  const outer = scopeRadius * (1 + SKY.reach),
    gradient = ctx.createRadialGradient(centreX, centreY, scopeRadius * WHEEL_EDGE, centreX, centreY, outer);
  const shrink = (1 - (1 - SKY.shrink) * dusk) * (1 + lean);
  gradient.addColorStop(0, FORRO.night);
  for (const [stop, colour] of SKY.start) gradient.addColorStop(stop * shrink, colour);
  gradient.addColorStop(1, FORRO.night);
  ctx.globalAlpha = SKY.dim;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

/** A pleated ring: the bellows, open on the bar's first half and closing on its second. */
function bellows(ctx, { centreX, centreY, scopeRadius, dpr }, swing, turn) {
  const open = 1 + swing,
    ring = (scale, alpha, colour) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colour;
      ctx.beginPath();
      for (let k = 0; k <= BELLOWS.folds * 2; k++) {
        const a = (k / (BELLOWS.folds * 2) + turn) * TAU,
          r = scopeRadius * scale * open * (k % 2 ? 1 : 1 - BELLOWS.pleat);
        (k ? ctx.lineTo : ctx.moveTo).call(ctx, centreX + Math.cos(a) * r, centreY + Math.sin(a) * r);
      }
      ctx.stroke();
    };
  ctx.lineWidth = BELLOWS.width * dpr;
  ctx.lineJoin = 'round';
  ring(BELLOWS.radius, BELLOWS.alpha, FORRO.red);
  ring(BELLOWS.radius * (1 - BELLOWS.pleat), BELLOWS.innerAlpha, FORRO.pearl);
  ctx.globalAlpha = 1;
}

function flags(ctx, { centreX, centreY, scopeRadius, dpr }, recent) {
  const size = FLAGS.size * dpr;
  for (const h of recent) {
    if (!FLAGS.voices.includes(h.voice) || h.age > FLAGS.life) continue;
    const seed = Math.round(h.at * FLAGS.seedScale);
    for (let k = 0; k < FLAGS.perHit; k++) {
      const a = hash(seed + k) * TAU,
        r = scopeRadius * (FLAGS.from + FLAGS.speed * h.age),
        x = centreX + Math.cos(a) * r,
        y = centreY + Math.sin(a) * r;
      ctx.globalAlpha = FLAGS.alpha * (1 - h.age / FLAGS.life) * h.hit.velocity;
      ctx.fillStyle = FLAGS.colours[Math.floor(hash(seed - k - 1) * FLAGS.colours.length)];
      // a bandeirinha: a small triangle hanging point down, turned to face away from the wheel
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-size, -size / 2);
      ctx.lineTo(size, -size / 2);
      ctx.lineTo(0, size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

/** The sparks in the air at `flow`: `amount` of them (0 to 1 of the whole set). */
function sparks(ctx, { centreX, centreY, scopeRadius, dpr }, flow, amount) {
  const flying = SPARKS.count * (SPARKS.few + (1 - SPARKS.few) * amount);
  for (let i = 0; i < Math.ceil(flying); i++) {
    const seed = SPARKS.seed + i * SPARKS.draws,
      turns = hash(seed) + flow * SPARKS.rate * (1 + SPARKS.rates * hash(seed + 1)),
      way = turns % 1,
      // each spark leaves from a new place on the wheel's edge
      a = hash(seed + 2 + Math.floor(turns) * SPARKS.seed) * TAU,
      reach = scopeRadius * (SPARKS.from + SPARKS.reach * way),
      x = centreX + Math.cos(a) * reach + Math.sin((way * SPARKS.sways + hash(seed)) * TAU) * SPARKS.sway * scopeRadius,
      y = centreY + Math.sin(a) * reach - SPARKS.rise * way * way * scopeRadius;
    ctx.globalAlpha = SPARKS.alpha * Math.min(1, way / SPARKS.fadeIn, flying - i) * (1 - way) ** 2; // a spark dies as it rises
    ctx.fillStyle = SPARK_COLOURS[i % SPARK_COLOURS.length];
    ctx.beginPath();
    ctx.arc(x, y, (SPARKS.size + SPARKS.sizes * hash(seed + SPARKS.draws - 1)) * dpr, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** One frame of the forró background: `frame` is the canvas geometry plus `position` (bars), `totalBars`, the recent hits, and the music's `energy` and energy clock `flow`. */
export function drawForroBackdrop(ctx, frame) {
  const { position, totalBars, recent } = frame,
    still = reducedMotion(),
    energy = frame.energy ?? 0,
    flow = frame.flow ?? 0;
  // the bellows open on the bar's first half and close on its second, wider the busier the music is
  const depth = BELLOWS.depth * (still ? 1 : BELLOWS.calm + (BELLOWS.full - BELLOWS.calm) * energy),
    breath = Math.sin((position % 1) * TAU);
  sky(ctx, frame, Math.min(1, position / totalBars), still ? 0 : SKY.lean * energy * breath);
  bellows(ctx, frame, depth * breath, still ? 0 : flow * BELLOWS.travel);
  if (!still) sparks(ctx, frame, flow, energy);
  flags(ctx, frame, recent);
}
