// The manguebeat background: the mangrove mud around the wheel and the concrete city on top of it.
// Everything comes out of the wheel and stays circular: iron rings thrown from it on each stroke of
// the main hand (rust on the bar's first beat), cables that hang from it and shake on the guitar,
// a grain of mud and concrete that changes on each beat, an antenna on top that pulses with the
// sampler, and, in the dub, the echoes as rings that step outward. The palette is the manguebeat
// row of docs/research/colour-and-visuals.md: dark field, mud, rust, mangrove green, pale signal.
// Safety (WCAG 2.3.1): the one bright emission, a pale bloom on the guitar's first chord of a bar,
// comes at most once a bar (2.4 s); it starts outside the wheel, so the wheel keeps its contrast.
// Reduced motion drops the bloom, the jitter and the grain's change, and halves the travel.
import { hash, lerp } from '../util.js';

export const MANGUE_PALETTE = {
  ground: '#0b0a07', // the dark of the mud at night
  mud: '#3b2f22',
  rust: '#b3261e', // R/(R+G+B) 0.72
  mangrove: '#4f6b3a',
  signal: '#d9d2b8', // the antenna's pale signal
  iron: '#8a8780', // concrete and iron
  cable: '#5c5a52',
  crab: '#e0703a', // the crab's orange, only on accents
};
const HEX = /^#(..)(..)(..)$/;
/** `rgba()` of a palette colour. */
const alphaOf = (hex, alpha) =>
  `rgba(${HEX.exec(hex)
    .slice(1)
    .map(pair => parseInt(pair, 16))
    .join(',')},${alpha})`;

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;
const ALPHA_DIGITS = 3;
const TRAIL_ALPHA = 0.35; // how much of the last frame each frame paints over
const SEED_STEP = 97; // spreads the seeds of neighbouring hits
const REDUCED_TRAVEL = 0.5;
const ACCENT = 0.95; // a stroke at or above this velocity is an accent
// The mud field: dark under the wheel, mud and mangrove from just outside it (wheel radii).
const FIELD = { clear: 1.06, mud: 1.7, mangrove: 2.7, reach: 3.6, mudAlpha: 0.55, mangroveAlpha: 0.4 };
// The grain: small squares of mud, mangrove, concrete and rust, reseeded on each beat.
const GRAIN = { count: 220, from: 1.12, reach: 3.4, size: [2, 5], alpha: 0.5, rust: 0.06 };
const GRAIN_COLOURS = [MANGUE_PALETTE.mud, MANGUE_PALETTE.mangrove, MANGUE_PALETTE.iron, MANGUE_PALETTE.cable];
// Iron rings: born at the wheel's edge, they step outward on each beat, jagged by the fury.
const RING = { life: 1.6, from: 1.1, travel: 1.7, width: 2.4, rustWidth: 4.5, alpha: 0.7, points: 48, jag: 0.05, stepsPerTravel: 4 };
// Cables hang from the wheel to the edge of the screen and shake on each guitar chord.
const CABLE = { from: 1.1, reach: 4, sag: 0.35, width: 1.6, alpha: 0.7, shake: 0.18, decay: 0.35 };
// The antenna on top of the wheel; it grows with each sampler hit.
const ANTENNA = { from: 1.12, length: 0.32, grow: 0.12, dish: 0.07, width: 2, decay: 0.6 };
// The dub's echoes: thin rings, one step further out per repeat.
const ECHO = { life: 0.5, from: 1.2, step: 0.22, width: 1.4, alpha: 0.6 };
// The pale bloom on the guitar's first chord of a bar: a ring of light from outside the wheel.
const BLOOM = { life: 0.3, inner: 1.1, peak: 1.5, reach: 3.2, alpha: 0.45 };
const VIGNETTE_STOPS = [
  [0, 0.85],
  [0.12, 0.45],
  [0.26, 0],
  [0.52, 0],
  [0.66, 0.82],
  [1, 0.95],
];

/** The manguebeat background. `angleOf(step)`: a step's angle on the wheel. */
export function createManguebeatPainter({ beatsPerBar, beatSeconds, stepsPerBar, angleOf }) {
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const calm = () => Boolean(reduced?.matches);
  const flashes = new Set(); // when each bright bloom started (seconds of the show), for the flash limit's test

  function field(ctx, g, mud) {
    const r = g.scopeRadius,
      gradient = ctx.createRadialGradient(g.centreX, g.centreY, 0, g.centreX, g.centreY, r * FIELD.reach);
    gradient.addColorStop(0, alphaOf(MANGUE_PALETTE.ground, 0));
    gradient.addColorStop(FIELD.clear / FIELD.reach, alphaOf(MANGUE_PALETTE.ground, 0));
    gradient.addColorStop(FIELD.mud / FIELD.reach, alphaOf(MANGUE_PALETTE.mud, FIELD.mudAlpha * mud));
    gradient.addColorStop(FIELD.mangrove / FIELD.reach, alphaOf(MANGUE_PALETTE.mangrove, FIELD.mangroveAlpha * mud));
    gradient.addColorStop(1, alphaOf(MANGUE_PALETTE.ground, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, g.width, g.height);
  }

  function grain(ctx, g, amount, beat) {
    const r = g.scopeRadius,
      count = Math.round(GRAIN.count * amount),
      seed = (calm() ? 0 : beat) * SEED_STEP;
    for (let k = 0; k < count; k++) {
      const a = hash(seed + k) * TAU,
        reach = r * lerp(GRAIN.from, GRAIN.reach, Math.sqrt(hash(seed + k + SEED_STEP)));
      const size = lerp(GRAIN.size[0], GRAIN.size[1], hash(seed - k)) * g.dpr,
        pick = hash(seed + k * 2 + 1);
      ctx.fillStyle = pick < GRAIN.rust ? MANGUE_PALETTE.rust : GRAIN_COLOURS[Math.floor(pick * GRAIN_COLOURS.length)];
      ctx.globalAlpha = GRAIN.alpha;
      ctx.fillRect(g.centreX + Math.cos(a) * reach - size / 2, g.centreY + Math.sin(a) * reach - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /** An iron ring thrown by one stroke: it steps outward, a jagged circle, heavier on an accent. */
  function ironRing(ctx, g, h, fury) {
    const progress = h.age / RING.life,
      travel = calm() ? RING.travel * REDUCED_TRAVEL : RING.travel;
    const steps = Math.floor(h.age / beatSeconds) + 1 - (1 - (h.age / beatSeconds - Math.floor(h.age / beatSeconds))) ** 2;
    const radius = g.scopeRadius * (RING.from + (travel * steps) / RING.stepsPerTravel),
      rust = h.hit.step === 0 && h.hit.velocity >= ACCENT;
    const seed = Math.round(h.at * stepsPerBar) * SEED_STEP,
      jag = calm() ? 0 : RING.jag * (1 + fury);
    ctx.strokeStyle = rust ? MANGUE_PALETTE.rust : MANGUE_PALETTE.iron;
    ctx.globalAlpha = RING.alpha * (1 - progress) * Math.min(1, h.hit.velocity);
    ctx.lineWidth = (rust ? RING.rustWidth : RING.width) * g.dpr;
    ctx.beginPath();
    for (let k = 0; k <= RING.points; k++) {
      const a = (k / RING.points) * TAU,
        rr = radius * (1 + (hash(seed + (k % RING.points)) - 1 / 2) * jag);
      const x = g.centreX + Math.cos(a) * rr,
        y = g.centreY + Math.sin(a) * rr;
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function cables(ctx, g, count, shake) {
    const r = g.scopeRadius,
      whole = Math.ceil(count);
    ctx.strokeStyle = MANGUE_PALETTE.cable;
    ctx.lineWidth = CABLE.width * g.dpr;
    for (let i = 0; i < whole; i++) {
      const a = TOP + ((i + 1 / 2) / whole) * TAU,
        wobble = calm() ? 0 : shake * CABLE.shake * Math.sin(i * SEED_STEP);
      const x0 = g.centreX + Math.cos(a) * r * CABLE.from,
        y0 = g.centreY + Math.sin(a) * r * CABLE.from;
      const x1 = g.centreX + Math.cos(a) * r * CABLE.reach,
        y1 = g.centreY + Math.sin(a) * r * CABLE.reach;
      // the cable sags downward under its weight
      const mx = (x0 + x1) / 2 + Math.cos(a + Math.PI / 2) * r * wobble,
        my = (y0 + y1) / 2 + r * CABLE.sag;
      ctx.globalAlpha = CABLE.alpha * Math.min(1, count - i);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(mx, my, x1, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function antenna(ctx, g, pulse) {
    const r = g.scopeRadius,
      top = g.centreY - r * (ANTENNA.from + ANTENNA.length + ANTENNA.grow * pulse);
    ctx.strokeStyle = MANGUE_PALETTE.signal;
    ctx.lineWidth = ANTENNA.width * g.dpr;
    ctx.beginPath();
    ctx.moveTo(g.centreX, g.centreY - r * ANTENNA.from);
    ctx.lineTo(g.centreX, top);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(g.centreX, top, r * ANTENNA.dish, Math.PI, TAU);
    ctx.stroke();
  }

  function echoRing(ctx, g, h) {
    const repeat = Math.max(1, Math.round(Math.log(h.hit.velocity) / Math.log(1 / 2))); // softer: further out
    ctx.strokeStyle = MANGUE_PALETTE.mangrove;
    ctx.globalAlpha = ECHO.alpha * (1 - h.age / ECHO.life);
    ctx.lineWidth = ECHO.width * g.dpr;
    ctx.beginPath();
    ctx.arc(g.centreX, g.centreY, g.scopeRadius * (ECHO.from + ECHO.step * repeat), 0, TAU);
    ctx.stroke();
  }

  function bloom(ctx, g, h) {
    const life = 1 - h.age / BLOOM.life,
      r = g.scopeRadius;
    flashes.add(h.at * beatsPerBar * beatSeconds);
    const gradient = ctx.createRadialGradient(g.centreX, g.centreY, 0, g.centreX, g.centreY, r * BLOOM.reach);
    gradient.addColorStop(0, alphaOf(MANGUE_PALETTE.signal, 0));
    gradient.addColorStop(BLOOM.inner / BLOOM.reach, alphaOf(MANGUE_PALETTE.signal, 0));
    gradient.addColorStop(BLOOM.peak / BLOOM.reach, alphaOf(MANGUE_PALETTE.signal, (BLOOM.alpha * life).toFixed(ALPHA_DIGITS)));
    gradient.addColorStop(1, alphaOf(MANGUE_PALETTE.signal, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, g.width, g.height);
  }

  /** `frame`: the canvas geometry plus { position, params, recent, fresh } (src/background.js). */
  function draw(ctx, frame) {
    const g = frame,
      { position, params, recent } = frame;
    const look = key => lerp(params.from[key], params.to[key], params.mix);
    ctx.fillStyle = alphaOf(MANGUE_PALETTE.ground, frame.fresh ? 1 : TRAIL_ALPHA);
    ctx.fillRect(0, 0, g.width, g.height);
    field(ctx, g, look('mud'));
    grain(ctx, g, look('grain'), Math.floor(position * beatsPerBar));
    let shake = 0,
      pulse = 0;
    for (const h of recent) {
      if (h.voice === 'guitarra') shake = Math.max(shake, h.hit.velocity * Math.exp(-h.age / CABLE.decay));
      if (h.voice === 'sampler') pulse = Math.max(pulse, Math.exp(-h.age / ANTENNA.decay));
    }
    cables(ctx, g, look('cables'), shake);
    antenna(ctx, g, pulse);
    const fury = look('fury');
    for (const h of recent) {
      const echo = typeof h.hit.tone === 'string' && h.hit.tone.endsWith('eco');
      if (echo && h.age < ECHO.life) echoRing(ctx, g, h);
      else if (!echo && h.voice === 'main' && h.age < RING.life) ironRing(ctx, g, h, fury);
      else if (!echo && h.voice === 'guitarra' && h.hit.step === 0 && h.hit.velocity >= ACCENT && h.age < BLOOM.life && look('flash') > 0 && !calm())
        bloom(ctx, g, h);
    }
    ctx.globalAlpha = 1;
    // the crab's orange: a spark at the hit's angle for each accent of the main hand
    ctx.fillStyle = MANGUE_PALETTE.crab;
    for (const h of recent)
      if (h.voice === 'main' && h.hit.velocity >= ACCENT && h.age < ECHO.life) {
        const a = angleOf((h.at % 1) * stepsPerBar);
        ctx.globalAlpha = 1 - h.age / ECHO.life;
        ctx.beginPath();
        ctx.arc(g.centreX + Math.cos(a) * g.scopeRadius * RING.from, g.centreY + Math.sin(a) * g.scopeRadius * RING.from, RING.rustWidth * g.dpr, 0, TAU);
        ctx.fill();
      }
    ctx.globalAlpha = 1;
  }

  /** Darken top and bottom, where the title and the lanes sit, in the mud's own dark. */
  function vignette(ctx, g) {
    const gradient = ctx.createLinearGradient(0, 0, 0, g.height);
    for (const [stop, alpha] of VIGNETTE_STOPS) gradient.addColorStop(stop, alphaOf(MANGUE_PALETTE.ground, alpha));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, g.width, g.height);
  }
  return {
    draw,
    vignette,
    /** The start times of the bright blooms drawn so far (seconds of the show). */
    flashTimes: () => [...flashes].sort((a, b) => a - b),
  };
}
