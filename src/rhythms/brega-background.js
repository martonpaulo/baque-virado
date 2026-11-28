// The brega background: a bar at night under one cold light. Everything comes out of the wheel and
// stays circular: a desaturated blue halo that breathes once every two bars, thin rings that contract
// slowly towards the wheel on each beat (heartbreak pulls inward), rose petals that leave the wheel on
// each new chord and fall away, and, on a phrase accent only, one soft rose bloom outward. The bar
// is never still (#63): motes of dust fall slowly through the cold light on the energy clock, more
// of them as the band fills, the halo breathes deeper with the music's energy, and the rings never
// vanish, only fade in the quiet scenes.
// Palette (docs/research/colour-and-visuals.md, § 5, brega): desaturated blue and muted rose on a
// dark ground; the slow, sad pole of Palmer et al. 2013. Motion is smooth and long-trailed.
// Safety (WCAG 2.3.1): the only bright change is the bloom, at most once per four bars; nothing is
// drawn under the wheel but the ground, so the wheel's dots keep their contrast. Everything but the
// trail is a function of the show position. Reduced motion also drops the motes and keeps the
// halo's and the rings' strength as each scene sets it.
import { REDUCED_MOTION_QUERY } from '../theme.js';
import { hash, lerp } from '../util.js';

export const BREGA_PALETTE = {
  ground: '#0a0b18', // the bar at night
  blue: '#2b3566', // the cold light
  wine: '#8c3b5a', // the rose's dark petals
  rose: '#c98ba0', // muted rose
  light: '#d8d4e8', // the pale light of the spot
};
const HEX = /^#(..)(..)(..)$/;
const ALPHA_DIGITS = 3;
/** `rgba()` of a palette colour. */
const alphaOf = (hex, alpha) =>
  `rgba(${HEX.exec(hex)
    .slice(1)
    .map(pair => parseInt(pair, 16))
    .join(',')},${Math.max(0, alpha).toFixed(ALPHA_DIGITS)})`;
const TAU = Math.PI * 2;

const TRAIL_SECONDS = 0.9; // long trails: the frame before fades slowly into the night
// The halo, in wheel radii: dark under the wheel, brightest just outside it, gone by `reach`.
// It breathes `breath` of its reach in silence and `deep` times that at full energy.
const HALO = { inside: 1, peak: 1.35, reach: 3.2, alpha: 0.42, breathBars: 2, breath: 0.07, deep: 2.4 };
// Rings born far out that contract towards the wheel over `beats`, one each beat.
// With motion a scene never shows less than `least` of them, and they show `calm` of their strength in silence.
const RINGS = { from: 2.7, to: 1.12, beats: 2, alpha: 0.3, width: 1.5, least: 0.45, calm: 0.6, still: { alpha: 0.16, width: 1 } }; // `still`: as drawn with reduced motion
// Motes of dust in the cold light: each appears beside the wheel and, in 1 / `rate` seconds of the
// energy clock, falls `fall` wheel radii while it drifts `out`, further out than down, so none falls
// back across the wheel; `few` of them hang in silence and all at full energy. Sizes in wheel radii.
const MOTES = {
  count: 36,
  few: 0.45,
  from: 1.16,
  spread: 1.1,
  out: 0.7,
  fall: 0.55,
  rate: 0.11,
  rates: 0.8,
  size: 0.008,
  sizes: 0.012,
  alpha: 0.5,
  draws: 4,
  seed: 877,
};
// Petals: born on the wheel's edge on a new chord, drifting out and falling, fading over `bars`. They
// drift out faster than they fall, so none falls back across the wheel.
const PETALS = { from: 1.18, out: 0.22, fall: 0.14, bars: 3, size: [0.045, 0.085], alpha: 0.42, spin: 0.6, fadeIn: 0.25 };
// The bloom: one soft rose ring outward on a phrase accent.
const BLOOM = { from: 1.15, reach: 2.4, seconds: 1.3, alpha: 0.32, width: 2.5 };
const SEED = { angle: 131, size: 137, colour: 139, spin: 149 };
const VIGNETTE_STOPS = [
  [0, 0.85],
  [0.12, 0.45],
  [0.26, 0],
  [0.52, 0],
  [0.66, 0.82],
  [1, 0.95],
];

/**
 * The background of the brega show. `petalBars(bar)`: how many petals a bar's chord releases (0 for
 * none); `accentBars`: the bars whose downbeat blooms; `barSeconds`: one bar's length.
 */
export function createBregaPainter({ beatsPerBar, barSeconds, petalBars, accentBars }) {
  const reduced = globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
  const calm = () => Boolean(reduced?.matches);
  const accents = [...accentBars].sort((a, b) => a - b);

  function halo(ctx, g, position, glow, energy) {
    const r = g.scopeRadius,
      breath = calm() ? 0 : HALO.breath * lerp(1, HALO.deep, energy) * Math.sin((TAU * position) / HALO.breathBars),
      reach = r * HALO.reach * (1 + breath);
    const gradient = ctx.createRadialGradient(g.centreX, g.centreY, 0, g.centreX, g.centreY, reach);
    gradient.addColorStop(0, alphaOf(BREGA_PALETTE.blue, 0));
    gradient.addColorStop((r * HALO.inside) / reach, alphaOf(BREGA_PALETTE.blue, 0));
    gradient.addColorStop((r * HALO.peak) / reach, alphaOf(BREGA_PALETTE.blue, HALO.alpha * glow));
    gradient.addColorStop(1, alphaOf(BREGA_PALETTE.blue, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, g.width, g.height);
  }

  function rings(ctx, g, position, strength) {
    if (strength <= 0) return;
    const beats = position * beatsPerBar;
    const drawn = calm() ? RINGS.still : RINGS;
    ctx.lineWidth = drawn.width * g.dpr;
    for (let k = 0; k < RINGS.beats; k++) {
      // a reduced-motion viewer sees the rings resting, not moving
      const phase = calm() ? (k + 1) / (RINGS.beats + 1) : (beats - Math.floor(beats) + k) / RINGS.beats;
      const eased = 1 - (1 - phase) ** 2; // fast out of the beat, settling on the wheel
      ctx.strokeStyle = alphaOf(BREGA_PALETTE.light, drawn.alpha * strength * Math.sin(Math.PI * phase));
      ctx.beginPath();
      ctx.arc(g.centreX, g.centreY, g.scopeRadius * lerp(RINGS.from, RINGS.to, eased), 0, TAU);
      ctx.stroke();
    }
  }

  /** The motes in the light at `flow`: `amount` of them (0 to 1 of the whole set). */
  function motes(ctx, g, flow, amount) {
    const r = g.scopeRadius,
      hanging = MOTES.count * lerp(MOTES.few, 1, amount);
    ctx.fillStyle = BREGA_PALETTE.light;
    for (let i = 0; i < Math.ceil(hanging); i++) {
      const seed = MOTES.seed + i * MOTES.draws,
        turns = hash(seed) + flow * MOTES.rate * (1 + MOTES.rates * hash(seed + 1)),
        way = turns % 1,
        // each fall starts at a new place round the wheel
        place = seed + 2 + Math.floor(turns) * MOTES.seed,
        angle = hash(place) * TAU,
        from = MOTES.from + MOTES.spread * hash(place + 1),
        size = r * (MOTES.size + MOTES.sizes * hash(seed + MOTES.draws - 1));
      ctx.globalAlpha = MOTES.alpha * Math.sin(Math.PI * way) * Math.min(1, hanging - i);
      ctx.beginPath();
      ctx.ellipse(
        g.centreX + Math.cos(angle) * r * (from + MOTES.out * way),
        g.centreY + Math.sin(angle) * r * (from + MOTES.out * way) + r * MOTES.fall * way,
        size,
        size,
        0,
        0,
        TAU,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function petals(ctx, g, position) {
    const r = g.scopeRadius;
    for (let bar = Math.floor(position) - PETALS.bars; bar <= Math.floor(position); bar++) {
      const count = bar >= 0 ? petalBars(bar) : 0,
        age = (position - bar) * barSeconds,
        life = 1 - (position - bar) / PETALS.bars;
      if (!count || age < 0 || life <= 0) continue;
      const travel = calm() ? 0 : age;
      for (let i = 0; i < count; i++) {
        const seed = bar * count + i,
          angle = hash(seed * SEED.angle) * TAU,
          size = r * lerp(PETALS.size[0], PETALS.size[1], hash(seed * SEED.size));
        const x = g.centreX + Math.cos(angle) * r * (PETALS.from + PETALS.out * travel),
          y = g.centreY + Math.sin(angle) * r * (PETALS.from + PETALS.out * travel) + r * PETALS.fall * travel;
        ctx.fillStyle = alphaOf(
          hash(seed * SEED.colour) < 1 / 2 ? BREGA_PALETTE.rose : BREGA_PALETTE.wine,
          PETALS.alpha * life * Math.min(1, age / PETALS.fadeIn),
        );
        ctx.beginPath();
        ctx.ellipse(x, y, size, size / 2, angle + travel * PETALS.spin * (hash(seed * SEED.spin) - 1 / 2) * TAU, 0, TAU);
        ctx.fill();
      }
    }
  }

  /** The accent bars whose bloom is still visible at `position`, with its age in seconds. */
  const bloomsAt = position => accents.map(bar => ({ bar, age: (position - bar) * barSeconds })).filter(b => b.age >= 0 && b.age < BLOOM.seconds);

  function blooms(ctx, g, position) {
    if (calm()) return;
    ctx.lineWidth = BLOOM.width * g.dpr;
    for (const { age } of bloomsAt(position)) {
      const progress = age / BLOOM.seconds;
      ctx.strokeStyle = alphaOf(BREGA_PALETTE.rose, BLOOM.alpha * (1 - progress) ** 2);
      ctx.beginPath();
      ctx.arc(g.centreX, g.centreY, g.scopeRadius * lerp(BLOOM.from, BLOOM.reach, Math.sqrt(progress)), 0, TAU);
      ctx.stroke();
    }
  }

  /** `frame`: the canvas geometry plus { position, params, step, fresh } (src/background.js). */
  function draw(ctx, frame) {
    const { position, params } = frame;
    const look = key => lerp(params.from[key], params.to[key], params.mix);
    ctx.save();
    ctx.globalAlpha = frame.fresh ? 1 : 1 - Math.exp(-frame.step / TRAIL_SECONDS);
    ctx.fillStyle = BREGA_PALETTE.ground;
    ctx.fillRect(0, 0, frame.width, frame.height);
    ctx.globalAlpha = 1;
    const energy = frame.energy ?? 0;
    halo(ctx, frame, position, look('glow'), energy);
    rings(ctx, frame, position, calm() ? look('rings') : Math.max(RINGS.least, look('rings')) * lerp(RINGS.calm, 1, energy));
    if (!calm()) motes(ctx, frame, frame.flow ?? 0, energy);
    petals(ctx, frame, position);
    blooms(ctx, frame, position);
    ctx.restore();
  }

  /** Darken top and bottom, where the title and the lanes sit, in the brega's own ground colour. */
  function vignette(ctx, g) {
    const gradient = ctx.createLinearGradient(0, 0, 0, g.height);
    for (const [stop, alpha] of VIGNETTE_STOPS) gradient.addColorStop(stop, alphaOf(BREGA_PALETTE.ground, alpha));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, g.width, g.height);
  }

  return {
    draw,
    vignette,
    /** When each bright change (a bloom) starts, in seconds of the show: for the flash limit's test. */
    flashTimes: () => (calm() ? [] : accents.map(bar => bar * barSeconds)),
  };
}
