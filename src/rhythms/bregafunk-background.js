// The bregafunk background: a night party around the wheel. Everything comes out of the wheel and
// stays circular: a dark purple bloom on the bumbo (the sub-bass felt, not flashed), lime rays thrown
// from the lata like the LEDs of a paredão, rings that sway like hips on alternate beats, and gold only on
// the drop's horns. The party is never still (#63): the rings lean further the busier the music is
// and turn slowly on the energy clock, and the paredão's small LEDs run outward from the wheel all
// the time, more rows of them and faster as the beat fills. Bright emissions are limited to 3 per
// second (WCAG 2.3.1); an LED is a dot a few pixels wide that travels, never a change of the picture.
// Reduced motion drops the LEDs and the turn, and keeps the lean at half, whatever the energy.
// Palette and reasons: docs/rhythms/bregafunk.md.
import { alphaOf, REDUCED_MOTION_QUERY } from '../theme.js';
import { hash, lerp } from '../util.js';

export const PALETTE = {
  ground: '#0d0612', // the night
  purple: '#b81fd6', // the parties' neon purple: the bumbo and the swaying rings
  violet: '#7d4dff', // the grave, under the bumbo
  lime: '#c6f432', // the paredão LEDs: the lata
  tin: '#d4dbe0', // the metal of the chimbais
  aqua: '#3fe0d0', // the palma: the turquoise of the LED strips
  ivory: '#f1e6cf', // the keys
  orange: '#ff7a3d', // the flute hook: a phone screen lit in the dark
  gold: '#ffd23f', // the drop: the horns
  leather: '#c4875a', // the atabaque of the Rio tamborzão
};

const BEATS_PER_BAR = 4;
export const BEATS_PER_LEAN = 2; // the hips lean on alternate beats at 170, the wheel and the rings alike
const TAU = Math.PI * 2;
const MIN_FLASH_GAP = 0.34; // seconds between bright emissions: under 3 per second
const TRAIL_SECONDS = 0.14; // how fast the frame before fades into the night
// reach in wheel radii; under the wheel the bloom keeps only `under` of its strength, so the bumbo's
// purple keeps 3:1 against it (WCAG 1.4.11)
const BLOOM = { decay: 0.4, reach: 3.4, alpha: 0.5, under: 0.3, inner: '#4a0a5c' };
const RAYS = { count: 4, life: 0.45, from: 1.15, length: 0.9, travel: 2.6, width: 3 }; // in wheel radii and CSS px
// The rings lean `sway` of their radius with reduced motion; with motion, from `calm` of it in
// silence to `full` of it at full energy, and each turns `turn` turns in a second of the energy
// clock, the outer ones slower (`lag` less for each ring out). `more`: the rings between them that
// join one by one as the energy rises, so a full beat fills the floor; with motion every ring is
// drawn from `thin` of its width and strength in silence to `bold` of them at full energy.
const RINGS = {
  radii: [1.3, 1.65, 2.05],
  more: [1.48, 1.85, 2.3, 2.55],
  thin: 0.6,
  bold: 1.8,
  sway: 0.12,
  calm: 0.5,
  full: 1.5,
  turn: 0.05,
  lag: 0.3,
  width: 1.2,
  alpha: 0.28,
};
// The paredão's LEDs: `rows` lines of `perRow` dots running outward from the wheel's edge over
// `reach` wheel radii in 1 / `rate` seconds of the energy clock; `few` of the rows are lit in
// silence and all at full energy. Sizes in CSS px.
const LEDS = { rows: 10, perRow: 5, few: 0.4, from: 1.16, reach: 1.7, rate: 0.22, size: 3, alpha: 0.7, seed: 947 };
const LED_COLOURS = [PALETTE.purple, PALETTE.aqua, PALETTE.violet];
const GOLD_RING = { life: 0.6, from: RAYS.from, travel: 2.2, width: 3 }; // born just outside the wheel, like the rays
const SPARK = { life: 0.3, radius: 1.25, size: 2 };
const MOTION_SCALE_REDUCED = 0.5;
let motionQuery; // read at the first frame it exists, not when the module loads
function reducedMotion() {
  motionQuery ??= globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
  return Boolean(motionQuery?.matches);
}
const angleAt = bar => (bar % 1) * TAU - Math.PI / 2; // where a hit sits on the wheel

export function createBregafunkBackground() {
  let emissions = [], // { kind, born, angle }
    lastFlash = -Infinity,
    bloom = 0;
  const flashes = []; // when each bright emission started, for the flash limit's test
  const seen = new Set();

  /** New hits since the last frame become emissions, bright ones no closer than MIN_FLASH_GAP. */
  function collect(recent, time, sceneId) {
    for (const h of recent) {
      const key = `${h.voice}@${h.at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const born = time - h.age;
      if (h.voice === 'bumbo' || h.voice === 'grave') bloom = Math.max(bloom, h.hit.velocity);
      const bright = h.voice === 'lata' || h.voice === 'metais';
      if (bright && born - lastFlash < MIN_FLASH_GAP && born !== lastFlash) continue;
      if (bright) {
        lastFlash = born;
        flashes.push(born);
      }
      if (h.voice === 'lata') emissions.push({ kind: 'rays', born, angle: angleAt(h.at) });
      else if (h.voice === 'metais') emissions.push({ kind: 'gold', born });
      else if (h.voice === 'tamborzao') emissions.push({ kind: 'leather', born });
      else if (h.voice === 'chimbal' && sceneId === 'quebra') emissions.push({ kind: 'spark', born, angle: angleAt(h.at) });
    }
    if (seen.size > recent.length * 2) for (const key of [...seen].slice(0, seen.size - recent.length)) seen.delete(key);
  }

  /** The LEDs lit at `flow`: `amount` of the rows (0 to 1 of the whole set). */
  function leds(ctx, { centreX: cx, centreY: cy, scopeRadius: r, dpr }, flow, amount) {
    const lit = LEDS.rows * lerp(LEDS.few, 1, amount),
      size = LEDS.size * dpr;
    for (let row = 0; row < Math.ceil(lit); row++) {
      const a = ((row + hash(LEDS.seed + row)) / LEDS.rows) * TAU;
      ctx.fillStyle = LED_COLOURS[row % LED_COLOURS.length];
      for (let k = 0; k < LEDS.perRow; k++) {
        const way = (k / LEDS.perRow + hash(LEDS.seed - row) + flow * LEDS.rate) % 1,
          reach = r * (LEDS.from + LEDS.reach * way);
        ctx.globalAlpha = LEDS.alpha * Math.sin(Math.PI * way) * Math.min(1, lit - row);
        ctx.fillRect(cx + Math.cos(a) * reach - size / 2, cy + Math.sin(a) * reach - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** A ring's half-width on one axis for a lean: wider without limit, narrower by RINGS.sway at most, so no ring crosses the wheel's numbers. */
  const across = lean => Math.max(1 - RINGS.sway, 1 + lean);

  function draw(ctx, frame) {
    const { width, height, centreX: cx, centreY: cy, scopeRadius: r, dpr, position, params, recent, time, step, fresh } = frame;
    const reduced = reducedMotion(),
      calm = reduced ? MOTION_SCALE_REDUCED : 1,
      energy = frame.energy ?? 0,
      flow = frame.flow ?? 0;
    ctx.save();
    ctx.globalAlpha = fresh ? 1 : 1 - Math.exp(-step / TRAIL_SECONDS);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    collect(recent, time, params.sceneId);
    bloom *= Math.exp(-step / BLOOM.decay);

    // the bumbo and the grave: a large dark bloom, felt rather than flashed
    if (bloom > 0) {
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * BLOOM.reach);
      glow.addColorStop(0, alphaOf(BLOOM.inner, BLOOM.alpha * BLOOM.under * bloom));
      glow.addColorStop(1 / BLOOM.reach, alphaOf(BLOOM.inner, BLOOM.alpha * BLOOM.under * bloom));
      glow.addColorStop(RAYS.from / BLOOM.reach, alphaOf(BLOOM.inner, BLOOM.alpha * bloom));
      glow.addColorStop(1, alphaOf(PALETTE.ground, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    // the hips: rings that lean wide over beats 1 and 2 and tall over 3 and 4
    const lean = Math.sin((Math.PI * position * BEATS_PER_BAR) / BEATS_PER_LEAN) * RINGS.sway * (reduced ? calm : lerp(RINGS.calm, RINGS.full, energy)),
      drop = params.sceneId === 'drop';
    const weight = reduced ? 1 : lerp(RINGS.thin, RINGS.bold, energy);
    ctx.lineWidth = RINGS.width * weight * dpr;
    RINGS.radii.forEach((radius, i) => {
      const last = i === RINGS.radii.length - 1;
      ctx.strokeStyle = alphaOf(drop && last ? PALETTE.gold : PALETTE.purple, Math.min(1, RINGS.alpha * weight));
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * radius * across(lean), r * radius * across(-lean), reduced ? 0 : flow * RINGS.turn * (1 - RINGS.lag * i) * TAU, 0, TAU);
      ctx.stroke();
    });
    if (!reduced) {
      // the floor fills: one more ring for each step of the energy, the newest fading in
      ctx.strokeStyle = alphaOf(PALETTE.violet, Math.min(1, RINGS.alpha * weight));
      RINGS.more.forEach((radius, i) => {
        const shown = Math.min(1, energy * RINGS.more.length - i);
        if (shown <= 0) return;
        ctx.globalAlpha = shown;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * radius * across(-lean), r * radius * across(lean), -flow * RINGS.turn * TAU, 0, TAU);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      leds(ctx, frame, flow, energy);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const e of emissions) {
      const age = time - e.born;
      if (e.kind === 'rays') {
        const life = 1 - age / RAYS.life;
        if (life <= 0) continue;
        ctx.strokeStyle = alphaOf(PALETTE.lime, life);
        ctx.lineWidth = RAYS.width * dpr;
        const from = r * (RAYS.from + (1 - life) * RAYS.travel * calm);
        for (let k = 0; k < RAYS.count; k++) {
          const a = e.angle + (k / RAYS.count) * TAU;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * from, cy + Math.sin(a) * from);
          ctx.lineTo(cx + Math.cos(a) * (from + r * RAYS.length), cy + Math.sin(a) * (from + r * RAYS.length));
          ctx.stroke();
        }
      } else if (e.kind === 'gold' || e.kind === 'leather') {
        const life = 1 - age / GOLD_RING.life;
        if (life <= 0) continue;
        ctx.strokeStyle = alphaOf(e.kind === 'gold' ? PALETTE.gold : PALETTE.leather, life);
        ctx.lineWidth = GOLD_RING.width * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (GOLD_RING.from + (1 - life) * GOLD_RING.travel * calm), 0, TAU);
        ctx.stroke();
      } else {
        const life = 1 - age / SPARK.life;
        if (life <= 0) continue;
        ctx.fillStyle = alphaOf(PALETTE.tin, life);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(e.angle) * r * SPARK.radius, cy + Math.sin(e.angle) * r * SPARK.radius, SPARK.size * dpr, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    emissions = emissions.filter(e => time - e.born < Math.max(RAYS.life, GOLD_RING.life));
  }
  return {
    draw,
    /** The start times of the bright emissions drawn so far (seconds of the background's clock). */
    flashTimes: () => flashes,
  };
}
