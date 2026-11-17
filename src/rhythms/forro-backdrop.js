// The forró background, drawn in place of the maracatu kaleidoscope (src/background.js calls it).
// Circular, coming out of the wheel: a dusk sky whose warm light shrinks toward the wheel as the show
// goes on (saudade is light leaving), a sanfona bellows that opens and closes once per bar around the
// wheel, and bandeirinhas thrown outward by the zabumba's low head.
// It depends only on the show position and the hits, never on earlier frames. Flash safety (WCAG
// 2.3.1): nothing changes brightness in a beat; the pulse is motion (the bellows and the flags), and
// each flag covers far less than a quarter of a 10° field.

import { FORRO } from '../theme.js';
import { hash } from '../util.js';

const TAU = Math.PI * 2;
// The sky: [stop, colour] from the wheel's rim outward. `dusk` (0 → 1 over the show) pulls the warm
// stops in toward the wheel, so the night widens.
const SKY = {
  start: [
    [0, FORRO.flame],
    [0.12, FORRO.ember],
    [0.42, FORRO.dusk],
    [0.7, FORRO.night],
  ],
  shrink: 0.3, // at the end, the warm stops sit at this fraction of where they began
  reach: 3.2, // the gradient's outer edge, in wheel radii from the rim
  dim: 0.82, // the sky's opacity over the night colour: it never reaches full brightness
};
const BELLOWS = { radius: 1.18, depth: 0.07, folds: 28, pleat: 0.08, width: 2, alpha: 0.75, innerAlpha: 0.35 };
const FLAGS = {
  voices: ['grave'], // the low end throws them
  from: 1.32, // wheel radii
  speed: 1.6, // wheel radii per second
  size: 7, // CSS px, half the base of the triangle
  colours: [FORRO.red, FORRO.flame, FORRO.teal, FORRO.paper],
  alpha: 0.85,
  life: 1.2, // seconds: the window of hits the background receives
  perHit: 3,
  seedScale: 1000,
};

function sky(ctx, { width, height, centreX, centreY, scopeRadius }, dusk) {
  ctx.fillStyle = FORRO.night;
  ctx.fillRect(0, 0, width, height);
  const outer = scopeRadius * (1 + SKY.reach),
    gradient = ctx.createRadialGradient(centreX, centreY, scopeRadius, centreX, centreY, outer);
  const shrink = 1 - (1 - SKY.shrink) * dusk;
  for (const [stop, colour] of SKY.start) gradient.addColorStop(stop * shrink, colour);
  gradient.addColorStop(1, FORRO.night);
  ctx.globalAlpha = SKY.dim;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

/** A pleated ring: the bellows, open on the bar's first half and closing on its second. */
function bellows(ctx, { centreX, centreY, scopeRadius, dpr }, inBar) {
  const open = 1 + BELLOWS.depth * Math.sin(inBar * TAU),
    ring = (scale, alpha, colour) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colour;
      ctx.beginPath();
      for (let k = 0; k <= BELLOWS.folds * 2; k++) {
        const a = (k / (BELLOWS.folds * 2)) * TAU,
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

/** One frame of the forró background at `position` (bars), with the show's length and recent hits. */
export function drawForroBackdrop(ctx, geometry, { position, totalBars, recent }) {
  sky(ctx, geometry, Math.min(1, position / totalBars));
  bellows(ctx, geometry, position % 1);
  flags(ctx, geometry, recent);
}
