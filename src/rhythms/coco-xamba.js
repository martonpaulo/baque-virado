// Coco da Xambá (Nação Xambá, Portão do Gelo, Olinda): everything the engine plays and shows that
// belongs to this rhythm. Positions are sixteenths of a 2/4 bar (0–7): one bar per turn of the wheel.
// Sources: Castro, «Nação Xambá: identidade negra, tradição religiosa e estratégias de difusão da sua
// cultura», ANPPOM 2018 (the alfaia sits on a chair and is played on both heads; the coco is made of
// rhythmic phrases that join and end in a «rufo»); Revista Continente, «O coco ancestral do Bongar».
// Neither source writes the parts out: the patterns below are this project's reading, kept simple.
// Choices and reasons: docs/rhythms/coco.md. Its background painter is the section below the imports.
import { label, marksAt, notation, row, stat, stats } from '../readout-markup.js';
import { alphaOf, COLORS, REDUCED_MOTION_QUERY } from '../theme.js';
import { hash } from '../util.js';
import { lilt, recordedChoices, studioFiles, studioSounds, takes } from './studio-kit.js';

// ---------- the background ----------
// The coco background: the beaten-earth floor of the terreiro at night, in candlelight, seen from
// above the wheel (docs/research/expansion-decisions.md). Everything comes out of the wheel and
// stays circular: the candles' copper light pooled on the floor and the burgundy of the earth
// further out; candles standing on the floor around the roda, one more lit as the roda fills, each
// with its own flicker; the dust the pisada raises on the low head's strokes; and, on each
// golpe, the stroke a rufada lands on, the candlelight flaring once. The floor is never still while
// the roda plays (#63): the dust of the beaten earth drifts outward from the wheel and the flames
// waver, both on the energy clock, so they quicken as the roda fills, and the light pooled on the
// floor swells on each beat, further the busier the music is. Nothing turns and nothing
// sparkles: trance is repetition, with tones close together. A ring of wedges turning around the
// numbered wheel read as a roulette (the owner, 2026-11-28, #27), so no shape here circles the wheel.
// No orixá imagery (docs/research/pernambuco-rhythms-feeling.md, Coco da Xambá, Avoid).
// Safety (docs/research/colour-and-visuals.md, rule 6; WCAG 2.3.1): the golpe flares are the only
// changes of the whole picture, never closer than MIN_FLASH_GAP, so at most three in any second;
// the swell on the beat changes the size of the pool of light, not its brightness; reduced motion
// drops the flares, the swell, the haze and the dust and holds every flame and every speck still. Nothing is
// drawn under the wheel, so its dots keep their contrast. Palette and reasons: docs/rhythms/coco.md.

/** Coco da Xambá, trance and devotion: ground, earth, burgundy, copper and cloth, from section 5. */
export const COCO_PALETTE = {
  ground: '#140b08', // the beaten-earth floor at night
  earth: '#5a3523',
  burgundy: '#9e2b25', // the wine red of the house
  copper: '#c7793a', // the alfaia's leather and the candlelight
  cloth: '#efe6d6', // the initiates' white cloth, and the white heart of each flame
};

const TAU = Math.PI * 2;

export const CLEAR = 1.12; // wheel radii: nothing is drawn inside, where the wheel and its numbers sit
const TRAIL_ALPHA = 0.32; // how much of the last frame each frame paints over
const GLOW = { outer: 3.2, alpha: 0.42, rise: 0.15, waver: 0.3 }; // the burgundy of the earth, in wheel radii: full strength `rise` of the way out; it wavers as firelight does
const LIGHT = { outer: 2.2, alpha: 0.1, rise: 0.1, waver: 0.4, rates: [0.6, 1.7] }; // the candles' copper light pooled on the floor; it wavers in two slow waves (turns a second of the energy clock)
// The pisada: on each beat the pool of light and the earth's glow reach this much further (at full
// energy), then settle before the next beat (`settle`: the easing's power).
const SWELL = { reach: 0.2, settle: 2 };
// Specks of the beaten earth: where each lies, its size in CSS px and how much it shows. With
// motion they are dust in the candlelight: each drifts outward from the wheel, crossing `reach` in
// 1 / `drift` seconds of the energy clock (some up to `drifts` faster), fading in over the first
// `rise` of its way and out over the last `fall`, so none appears or vanishes at once.
const GRAIN = { count: 220, from: 1.16, reach: 2, size: 0.7, sizes: 1.1, alpha: 0.2, alphas: 0.35, draws: 4, drift: 0.11, drifts: 0.8, rise: 0.08, fall: 0.3 }; // `draws`: the random values a speck takes
// The candles on the floor. Each spot: where it stands, in wheel radii right of and below the wheel's
// centre, and how tall its flame burns, in the order they are lit as the roda fills. They are set
// down by hand in three groups at different distances, and one side of the wheel stays dark: lights
// on one circle round a numbered wheel read as a game's. Every halo stays clear of the wheel, of the
// title above, of the readout below and of the stage's sides, which are 1.43 wheel radii away on a
// desktop (`tests/coco.test.js` keeps the three rules). Then, in wheel radii for a flame of size 1:
// the halo it throws on the floor, the flame and its white heart; how far the heart sways, the
// light wavers and the halo draws in (`breath`, only inward: a halo never grows past its place), a
// share of each more as the music fills (`lively`), and how fast (two waves, in turns a second of
// the energy clock).
export const CANDLES = {
  spots: [
    [1.16, 0.72, 1.1],
    [-1.12, -0.8, 1],
    [0.86, 1.06, 1],
    [1.21, -0.9, 0.9],
    [-0.88, -1.03, 0.8],
    [1.22, 1.1, 0.85],
  ],
  halo: 0.21,
  haloAlpha: 0.6,
  haloMid: 0.33,
  flame: 0.06,
  flameAlpha: 0.9,
  core: 0.011,
  coreAlpha: 0.85,
  sway: 0.012,
  flicker: 0.16,
  breath: 0.16,
  lively: 0.6,
  rates: [1.3, 2.7], // both under three a second, so a flame's light never changes faster than that
};
// The haze: wide, soft clouds of the same dust, lit from the wheel's side. Each keeps its direction
// and drifts outward like the specks, in wheel radii; its edge never comes inside CLEAR.
const HAZE = { count: 18, reach: 1.1, size: 0.14, sizes: 0.2, alpha: 0.16, alphas: 0.14, draws: 4, drift: 0.13, drifts: 0.7, rise: 0.15, fall: 0.4, calm: 0.6 };
const DRIFT_DRAW = 3; // which of its random values sets a speck's or a cloud's own speed
const TREMBLE = { window: 0.2, full: 4, gain: 1.2 }; // a rufada makes the flames tremble: strokes in the window for full strength
const DUST = { life: 1.1, from: CLEAR + 0.02, travel: 0.8, width: 0.45, alpha: 0.4 }; // raised by the pisada, in wheel radii
export const BLOOM = { life: 0.45, from: CLEAR, to: 2.3, alpha: 0.34, peak: 0.14, halo: 0.25 }; // a golpe's flare: where the earth's burgundy peaks, and how much the halos gain
export const MIN_FLASH_GAP = 0.34; // seconds between golpe flares: under three a second
const DUSTING = { low: 'earth', rum: 'burgundy' }; // the drums whose strokes raise dust, and its colour
const ROLLING = new Set(['low', 'high']);
const SEEDS = { phase: 37, grain: 101, haze: 211 }; // one stream of `hash` per random choice
const VIGNETTE_STOPS = [
  [0, 0.85],
  [0.12, 0.45],
  [0.26, 0],
  [0.52, 0],
  [0.66, 0.82],
  [1, 0.95],
];

/**
 * The background of the coco show. `barSeconds`: one bar; `beatsPerBar`: its beats; `rufada` and
 * `golpe`: the tones of the alfaia's rolls and of their landing.
 */
export function createCocoPainter({ barSeconds, beatsPerBar, rufada, golpe }) {
  const reduced = globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
  const calm = () => Boolean(reduced?.matches);
  const flashes = new Set(); // the start (seconds of the show) of every flare drawn, for the flash limit's test
  const secondsOf = h => h.at * barSeconds;
  const candles = CANDLES.spots.map(([right, down, size], i) => ({ right, down, size, phase: hash(SEEDS.phase + i) * TAU }));
  const grain = [...Array(GRAIN.count).keys()].map(i => ({
    angle: hash(SEEDS.grain + i * GRAIN.draws) * TAU,
    way: hash(SEEDS.grain + i * GRAIN.draws + 1), // how far out it starts, 0 at the wheel to 1
    size: GRAIN.size + hash(SEEDS.grain + i * GRAIN.draws + 2) * GRAIN.sizes,
    alpha: GRAIN.alpha + hash(SEEDS.grain + i * GRAIN.draws + 2) * GRAIN.alphas,
    drift: GRAIN.drift * (1 + GRAIN.drifts * hash(SEEDS.grain + i * GRAIN.draws + DRIFT_DRAW)),
  }));

  const haze = [...Array(HAZE.count).keys()].map(i => ({
    angle: ((i + hash(SEEDS.haze + i * HAZE.draws)) / HAZE.count) * TAU, // spread round the wheel, unevenly
    way: hash(SEEDS.haze + i * HAZE.draws + 1),
    size: HAZE.size + hash(SEEDS.haze + i * HAZE.draws + 2) * HAZE.sizes,
    alpha: HAZE.alpha + hash(SEEDS.haze + i * HAZE.draws + 2) * HAZE.alphas,
    drift: HAZE.drift * (1 + HAZE.drifts * hash(SEEDS.haze + i * HAZE.draws + DRIFT_DRAW)),
  }));

  /** The golpes that flare: one per moment, none within MIN_FLASH_GAP after the one before. */
  function blooms(recent) {
    const golpes = [...new Set(recent.filter(h => h.hit.tone === golpe).map(secondsOf))].sort((a, b) => a - b);
    const kept = [];
    for (const at of golpes) if (!kept.length || at - kept.at(-1) >= MIN_FLASH_GAP) kept.push(at);
    return kept;
  }

  /** A soft ring round the wheel, from `inner` to `outer` wheel radii, strongest at `peak` of the way. */
  function softRing(ctx, g, inner, outer, peak, colour, alpha, edge = colour) {
    const { centreX: x, centreY: y, scopeRadius: r } = g;
    const ring = ctx.createRadialGradient(x, y, inner * r, x, y, outer * r);
    ring.addColorStop(0, alphaOf(colour, 0));
    ring.addColorStop(peak, alphaOf(colour, alpha));
    ring.addColorStop(1, alphaOf(edge, 0));
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, g.width, g.height);
  }

  function disc(ctx, x, y, radius, colour, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }

  /** `frame`: the canvas geometry plus { position, params, recent, fresh } (src/background.js). */
  function draw(ctx, frame) {
    const g = frame,
      { position, params, recent } = frame,
      { centreX: x, centreY: y, scopeRadius: r } = g;
    const look = key => params.from[key] + (params.to[key] - params.from[key]) * params.mix;
    const now = position * barSeconds,
      still = calm(),
      energy = frame.energy ?? 0,
      flow = frame.flow ?? 0;
    // the pisada: the floor's light reaches further on each beat and settles before the next
    const beat = position * beatsPerBar,
      swell = still ? 1 : 1 + SWELL.reach * energy * (1 - (beat - Math.floor(beat))) ** SWELL.settle,
      lively = 1 - CANDLES.lively + CANDLES.lively * energy;
    ctx.save();
    ctx.globalAlpha = frame.fresh ? 1 : TRAIL_ALPHA;
    ctx.fillStyle = COCO_PALETTE.ground;
    ctx.fillRect(0, 0, g.width, g.height);
    ctx.globalAlpha = 1;

    // a golpe: the candlelight flares once, then settles
    let flare = 0;
    if (!still)
      for (const at of blooms(recent)) {
        const age = now - at;
        if (age < 0 || age >= BLOOM.life) continue;
        flashes.add(at);
        flare = Math.max(flare, 1 - age / BLOOM.life);
      }

    // the floor: the burgundy of the earth, the candles' copper light near the wheel, and its grain
    const pool = still ? 0 : ((Math.sin(flow * TAU * LIGHT.rates[0]) + Math.sin(flow * TAU * LIGHT.rates[1])) / 2) * lively;
    softRing(ctx, g, CLEAR, GLOW.outer * swell, GLOW.rise, COCO_PALETTE.burgundy, GLOW.alpha * look('glow') * (1 + GLOW.waver * pool), COCO_PALETTE.ground);
    softRing(ctx, g, CLEAR, LIGHT.outer * swell, LIGHT.rise, COCO_PALETTE.copper, LIGHT.alpha * look('glow') * (1 + LIGHT.waver * pool), COCO_PALETTE.burgundy);
    for (const cloud of still ? [] : haze) {
      const way = (cloud.way + flow * cloud.drift) % 1,
        ring = (CLEAR + cloud.size + way * HAZE.reach) * r,
        shown = Math.min(1, way / HAZE.rise, (1 - way) / HAZE.fall) * (HAZE.calm + (1 - HAZE.calm) * energy),
        hx = x + Math.cos(cloud.angle) * ring,
        hy = y + Math.sin(cloud.angle) * ring,
        reach = cloud.size * r;
      const dust = ctx.createRadialGradient(hx, hy, 0, hx, hy, reach);
      dust.addColorStop(0, alphaOf(COCO_PALETTE.copper, cloud.alpha * shown));
      dust.addColorStop(1, alphaOf(COCO_PALETTE.copper, 0));
      ctx.fillStyle = dust;
      ctx.fillRect(hx - reach, hy - reach, 2 * reach, 2 * reach);
    }
    for (const speck of grain) {
      // denser near the wheel, where the light is; with motion, on its way outward
      const way = still ? speck.way : (speck.way + flow * speck.drift) % 1,
        ring = GRAIN.from + way * way * GRAIN.reach,
        shown = Math.min(1, way / GRAIN.rise, (1 - way) / GRAIN.fall);
      disc(ctx, x + Math.cos(speck.angle) * ring * r, y + Math.sin(speck.angle) * ring * r, speck.size * g.dpr, COCO_PALETTE.earth, speck.alpha * shown);
    }
    ctx.globalAlpha = 1;

    if (!still) {
      // the pisada: each stroke of the low head, and of the rum, raises dust that drifts outward
      for (const h of recent) {
        const colour = DUSTING[h.voice];
        if (!colour || h.hit.tone === rufada || h.age >= DUST.life) continue;
        const life = 1 - h.age / DUST.life,
          inner = DUST.from + DUST.travel * (1 - life * life);
        softRing(ctx, g, inner, inner + DUST.width, 1 / 2, COCO_PALETTE[colour], DUST.alpha * life * Math.min(1, h.hit.velocity));
      }
      if (flare) softRing(ctx, g, BLOOM.from, BLOOM.to, BLOOM.peak, COCO_PALETTE.burgundy, BLOOM.alpha * flare, COCO_PALETTE.ground);
    }

    // the candles: `candles` of them lit, the newest fading in; a rufada makes the flames tremble
    const rolling = recent.filter(h => h.hit.tone === rufada && ROLLING.has(h.voice) && h.age < TREMBLE.window).length,
      tremble = 1 + TREMBLE.gain * Math.min(1, rolling / TREMBLE.full),
      lit = look('candles');
    for (let i = 0; i < Math.min(candles.length, Math.ceil(lit)); i++) {
      const candle = candles[i],
        strength = Math.min(1, lit - i),
        waver = still
          ? 0
          : ((Math.sin(flow * TAU * CANDLES.rates[0] + candle.phase) + Math.sin(flow * TAU * CANDLES.rates[1] + candle.phase * 2)) / 2) * tremble * lively,
        cx = x + candle.right * r,
        cy = y + candle.down * r,
        reach = CANDLES.halo * candle.size * r * (1 - CANDLES.breath * Math.min(1, Math.abs(waver))),
        light = CANDLES.haloAlpha * strength * (1 + CANDLES.flicker * waver + BLOOM.halo * flare);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
      halo.addColorStop(0, alphaOf(COCO_PALETTE.copper, Math.min(1, light)));
      halo.addColorStop(1 / 2, alphaOf(COCO_PALETTE.copper, Math.min(1, light) * CANDLES.haloMid));
      halo.addColorStop(1, alphaOf(COCO_PALETTE.copper, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = halo;
      ctx.fillRect(cx - reach, cy - reach, 2 * reach, 2 * reach);
      // the flame, soft at its edge, and its white heart
      const flame = ctx.createRadialGradient(cx, cy, 0, cx, cy, CANDLES.flame * candle.size * r);
      flame.addColorStop(0, alphaOf(COCO_PALETTE.copper, CANDLES.flameAlpha * strength));
      flame.addColorStop(1, alphaOf(COCO_PALETTE.copper, 0));
      disc(ctx, cx, cy, CANDLES.flame * candle.size * r, flame, 1);
      disc(ctx, cx + waver * CANDLES.sway * r, cy, CANDLES.core * candle.size * r, COCO_PALETTE.cloth, CANDLES.coreAlpha * strength);
    }
    ctx.restore();
  }

  /** Darken top and bottom, where the title and the lanes sit, in the coco's own ground colour. */
  function vignette(ctx, g) {
    const gradient = ctx.createLinearGradient(0, 0, 0, g.height);
    for (const [stop, alpha] of VIGNETTE_STOPS) gradient.addColorStop(stop, alphaOf(COCO_PALETTE.ground, alpha));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, g.width, g.height);
  }
  return {
    draw,
    vignette,
    /** The start (seconds of the show) of every golpe flare drawn so far, in order. */
    flashTimes: () => [...flashes].sort((a, b) => a - b),
  };
}

const BPM = 132;
const BEATS_PER_BAR = 2;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const BAR_SECONDS = (60 / BPM) * BEATS_PER_BAR;
const STEPS = [...Array(STEPS_PER_BAR).keys()];
const MS_PER_SECOND = 1000;

// One tempo and the straight grid for the whole show: no swing was measured for this rhythm (the
// studio adds the ganzá's lilt and the human feel, src/studio.js).
const SWING = {};

// The alfaia has two voices, one per head: the low head on the beats, the second head on the
// off-beats. The roles are the ones src/rhythms/maracatu.js documents. The atabaques are the
// terreiro's trio, low to high: rum, rumpi and lé. Each takes its material's colour inside the coco
// palette (COCO_PALETTE above), lifted until it reads at 3:1 on the wheel.
const COLOR = {
  low: COCO_PALETTE.copper, // raw leather
  high: '#e3a86a', // the second head: a lighter, tighter leather
  caixa: '#b8c2cc', // steel
  abe: '#d9b46a', // gourd
  ganza: '#a9b89c', // tin
  pandeiro: '#c9956a', // wood
  palmas: COCO_PALETTE.cloth, // the white cloth of the roda
  agogo: '#9aa3ad', // iron
  rum: '#d0523f', // the burgundy of the trio, deepest for the low drum
  rumpi: '#e07a5f',
  le: '#eda58f',
};
const VOICES = {
  low: { instrument: 'alfaia', ring: 98, size: 5.4, swing: null, color: COLOR.low, hand: true, boom: 1 },
  high: { instrument: 'alfaia', ring: 91, size: 4.6, swing: null, color: COLOR.high, hand: true, boom: 0.6 },
  caixa: { instrument: 'caixa', ring: 63, size: 2.8, swing: null, color: COLOR.caixa, crack: true },
  abe: { instrument: 'abe', ring: 57, size: 2.8, swing: null, color: COLOR.abe },
  ganza: { instrument: 'ganza', ring: 51, size: 2.4, swing: null, color: COLOR.ganza },
  pandeiro: { instrument: 'pandeiro', ring: 45, size: 3.2, swing: null, color: COLOR.pandeiro, toneScale: { jingle: 0.6 } },
  palmas: { instrument: 'palmas', ring: 39, size: 3.2, swing: null, color: COLOR.palmas },
  agogo: { instrument: 'agogo', ring: 34, size: 3.4, swing: null, color: COLOR.agogo, spark: true, toneScale: { high: 0.7 } },
  rum: { instrument: 'atabaque', ring: 84, size: 4.6, swing: null, color: COLOR.rum, boom: 0.5 },
  rumpi: { instrument: 'atabaque', ring: 77, size: 3.8, swing: null, color: COLOR.rumpi },
  le: { instrument: 'atabaque', ring: 70, size: 3.2, swing: null, color: COLOR.le },
};
// The order also seeds the per-hit variation of the sound: keep it stable, and add a voice at the end.
const VOICE_ORDER = Object.keys(VOICES);
const ALFAIA = ['low', 'high'];
export const ATABAQUES = ['rum', 'rumpi', 'le'];

const isOffbeat = step => step % STEPS_PER_BEAT !== 0;
const BEAT_STEPS = STEPS.filter(step => !isOffbeat(step));
const countFromOne = steps => steps.map(step => step + 1).join(' ');

// Alfaia phrases, one bar each: `low` the low head, `high` the second head.
const PHRASES = {
  base: { low: [0, 4], high: [2, 6] },
  dobrada: { low: [0, 3, 4], high: [2, 6] },
  resposta: { low: [0, 4], high: [2, 5, 6] },
  corrida: { low: [0, 3, 4, 7], high: [2, 6] },
  toque: { low: [0, 3, 4, 7], high: [1, 2, 5, 6] },
};
const PHRASE_ORDER = ['base', 'dobrada', 'resposta', 'corrida']; // the Frases scene, four bars each
const PHRASE_BARS = 4;

const AGOGO = { low: [0, 3, 6], high: [2, 7] };

// The atabaques: the lé keeps a steady figure, the rumpi answers on the off-beats, and the rum, the
// lead, changes its phrase every two bars and plays a fill in the last bar of each four.
const ATABAQUE = {
  le: { steps: [0, 2, 3, 4, 6, 7], velocities: [0.7, 0.95, 0.5, 0.7, 0.95, 0.5] },
  rumpi: { steps: [2, 4, 6], velocities: [0.95, 0.6, 0.95] },
};
const RUM_PHRASES = [
  { steps: [0, 3, 6], velocities: [1, 0.7, 0.85] },
  { steps: [0, 3, 4, 6, 7], velocities: [1, 0.7, 0.6, 0.85, 0.55] },
];
const RUM_FILL = { steps: [0, 2, 3, 5, 6, 7], velocities: [1, 0.6, 0.75, 0.6, 0.8, 0.95] };
const RUM_PHRASE_BARS = 2;
const RUM_FILL_EVERY = 4;
const rumPart = bar => (bar % RUM_FILL_EVERY === RUM_FILL_EVERY - 1 ? RUM_FILL : RUM_PHRASES[Math.floor(bar / RUM_PHRASE_BARS) % RUM_PHRASES.length]);

// Rufadas: the alfaia rolls in 32nds, the two heads in turn, swelling into a «golpe», a stroke of
// both heads together. They open the show, close every scene into the next and make the Rufo.
export const RUFADA = 'rufada';
export const GOLPE = 'golpe';
const RUFADA_FROM = 0.3; // the velocity a rufada starts at; it swells to 1
const RUFADA_CURVE = 1.4;
const SCENE_RUFADA_FROM = STEPS_PER_BAR / 2; // a scene's last bar rolls from its second beat
// The opening, 32 sixteenths over four bars: two rufadas, each landing on a golpe, then a short one
// into the first scene. [first step, last step] of each rufada, and the golpes.
const OPENING = {
  rufadas: [
    [0, 11],
    [16, 27],
    [29, 31],
  ],
  golpes: [12, 28],
};

const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
const cycle = velocities => STEPS.map(step => hit(step, velocities[step % velocities.length]));
const figure = ({ steps, velocities }) => steps.map((step, i) => hit(step, velocities[i]));
/** A swell from RUFADA_FROM to 1 over `count` strokes, at stroke `i`. */
const swellAt = (i, count) => RUFADA_FROM + (1 - RUFADA_FROM) * (i / Math.max(1, count - 1)) ** RUFADA_CURVE;

/**
 * The alfaia's strokes from `first` to `last` (sixteenths counted from `origin`), kept to the
 * steps of one bar: the low head on the even sixteenths, the second head on the odd ones.
 */
function rufada(first, last, origin, bothHeads = true) {
  const out = { low: [], high: [] };
  for (let at = first; at <= last; at++) {
    const step = at - origin;
    if (step < 0 || step >= STEPS_PER_BAR) continue;
    out[at % 2 && bothHeads ? 'high' : 'low'].push(hit(step, swellAt(at - first, last - first + 1), RUFADA));
  }
  return out;
}

/** The band's parts under one alfaia phrase, in `bar` of the show (the rum's phrase follows it). */
function phraseHits(phraseKey, bar) {
  const phrase = PHRASES[phraseKey];
  return {
    low: phrase.low.map(step => hit(step, 1)),
    high: phrase.high.map(step => hit(step, 0.85)),
    caixa: cycle([0.55, 0.32, 1, 0.4]),
    abe: STEPS.filter(step => step % 4 !== 1).map(step => hit(step, step % 4 === 2 ? 1 : 0.6)),
    ganza: cycle([0.8, 0.45, 1, 0.45]),
    pandeiro: STEPS.map(step => (isOffbeat(step) ? hit(step, step % 4 === 2 ? 0.95 : 0.55, 'jingle') : hit(step, 1, 'pele'))),
    palmas: STEPS.filter(step => step % 4 === 2).map(step => hit(step, 1)),
    agogo: [...AGOGO.low.map(step => hit(step, 1, 'low')), ...AGOGO.high.map(step => hit(step, 0.85, 'high'))].sort((a, b) => a.step - b.step),
    rum: figure(rumPart(bar)),
    rumpi: figure(ATABAQUE.rumpi),
    le: figure(ATABAQUE.le),
  };
}

// Special bars (the bar modes the engine knows):
//   roll – the alfaia alone in rufadas (the opening, then the Rufo)
//   cut  – everyone on 1, then silence
// A scene entered by a rufada declares it (`leadIn: 'fill'`, src/show.js): the scene before rolls into
// it in its last bar (`leadsInto`), and the entered scene lands on a golpe.
function barHits(scene, barInScene, { leadsInto } = {}) {
  const mode = scene.mode(barInScene),
    bar = scene.start + barInScene;
  if (mode === 'roll' && scene.id === 'intro') {
    const origin = barInScene * STEPS_PER_BAR,
      bars = OPENING.rufadas.map(([first, last]) => rufada(first, last, origin));
    const golpes = OPENING.golpes.map(at => at - origin).filter(step => step >= 0 && step < STEPS_PER_BAR);
    const heads = voice => [...bars.flatMap(part => part[voice]), ...golpes.map(step => hit(step, 1, GOLPE))].sort((a, b) => a.step - b.step);
    return { ...silentBar(), low: heads('low'), high: heads('high') };
  }
  if (mode === 'roll') return { ...silentBar(), ...rufada(0, scene.bars * STEPS_PER_BAR - 1, barInScene * STEPS_PER_BAR) };
  const hits = phraseHits(mode === 'cut' ? 'base' : scene.phrase(barInScene), bar);
  if (barInScene === 0 && scene.leadIn === 'fill') hits.low = hits.low.map(h => (h.step === 0 ? hit(0, 1, GOLPE) : h));
  if (mode === 'cut')
    return Object.fromEntries(
      VOICE_ORDER.map(voice => [voice, hits[voice].filter(h => h.step === 0).map(h => (ALFAIA.includes(voice) ? hit(0, 1, GOLPE) : h))]),
    );
  if (leadsInto === 'fill') {
    // before the second head enters, the low head rolls alone
    const roll = rufada(SCENE_RUFADA_FROM, STEPS_PER_BAR - 1, 0, scene.voices(barInScene).includes('high'));
    for (const voice of ALFAIA) hits[voice] = [...hits[voice].filter(h => h.step < SCENE_RUFADA_FROM), ...roll[voice]];
  }
  return hits;
}

// ---------- the show script ----------
const always = value => () => value;
/** An instrument scene: the band so far plus the instruments it adds; the lanes show the new ones beside the low head. */
const entering = [];
const adds = (id, voices, lanes = ['low', ...voices]) => {
  entering.push(...voices);
  return { id, bars: 8, voices: always([...entering]), lanes, leadIn: 'fill' };
};

const SCENE_LIST = [
  { id: 'intro', bars: 4, mode: always('roll'), lanes: ALFAIA },
  adds('alfaia', ['low'], ['low']),
  adds('heads', ['high'], ALFAIA),
  adds('ganza', ['ganza']),
  adds('pandeiro', ['pandeiro']),
  adds('palmas', ['palmas']),
  adds('agogoAbe', ['agogo', 'abe'], ['agogo', 'abe']),
  adds('caixa', ['caixa'], ['caixa', ...ALFAIA]),
  adds('atabaques', ATABAQUES, ['low', ...ATABAQUES]),
  {
    id: 'phrases',
    bars: PHRASE_BARS * PHRASE_ORDER.length,
    phrase: bar => PHRASE_ORDER[Math.floor(bar / PHRASE_BARS)],
    lanes: ALFAIA,
    leadIn: 'fill',
  },
  { id: 'toque', bars: 16, phrase: always('toque'), pattern: 'toque', lanes: ALFAIA, named: true, leadIn: 'fill' },
  // the Rufo is entered cold: the band stops on the bar line and the alfaia rolls alone (pinned in tests/rhythms.test.js)
  { id: 'rufo', bars: 4, mode: always('roll'), lanes: ALFAIA },
  { id: 'finale', bars: 8, mode: bar => (bar === 7 ? 'cut' : 'normal'), lanes: ALFAIA, isEnd: true, leadIn: 'fill' },
];

// How the background behaves in each scene (createCocoPainter above): how many candles burn around the
// wheel (a fraction fades one in), one more as the roda fills, and the glow of the earth. The engine
// reads `speed` for the visual clock and blends zoom, rot, hue and keep, which this painter does not use.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, speed: 1 };
const SCENE_LOOKS = {
  intro: { ...LOOK, candles: 1, glow: 0.35 },
  alfaia: { ...LOOK, candles: 1, glow: 0.4 },
  heads: { ...LOOK, candles: 2, glow: 0.45 },
  ganza: { ...LOOK, candles: 2, glow: 0.5 },
  pandeiro: { ...LOOK, candles: 3, glow: 0.55 },
  palmas: { ...LOOK, candles: 3, glow: 0.6 },
  agogoAbe: { ...LOOK, candles: 4, glow: 0.65 },
  caixa: { ...LOOK, candles: 4, glow: 0.7 },
  atabaques: { ...LOOK, candles: 5, glow: 0.8 },
  phrases: { ...LOOK, candles: 6, glow: 0.85 },
  toque: { ...LOOK, candles: 6, glow: 1 },
  rufo: { ...LOOK, candles: 6, glow: 1 },
  finale: { ...LOOK, candles: 6, glow: 0.8 },
};

// ---------- sound: recorded instruments in the studio (src/studio.js) ----------
// Real recordings (CC0) with several takes per stroke; sources in CREDITS.md, choices in
// docs/rhythms/coco.md and docs/rhythms/studio.md. The low head leads; the ganzá swings its
// off-beat sixteenths about 56 %.
const STEP_SECONDS = 60 / BPM / STEPS_PER_BEAT;
const STEP_MS = STEP_SECONDS * MS_PER_SECOND;
const GANZA_LILT = 0.12;
const HIGH_HEAD_LILT = 0.06;
// The second head is the alfaia's answer recordings tuned up: a tighter, higher skin.
const SECOND_HEAD_RATE = 1.26;
const AGOGO_HIGH_RATE = 1.19; // the high bell: the same bell recording tuned up
const RUFADA_GAIN = 0.8; // a rufada stroke sits under the phrase strokes
const ROLL_STROKES = 2; // each rufada sixteenth is two 32nd strokes of its head

// The coco's own recordings, by their place in their group of tools/prepare-takes.mjs: one take
// each, so its round robin is three tunings of it (docs/research/human-feel.md, rule 3), never one
// identical repeat.
const take = (group, index) => takes(group)[index];
const ROBIN_RATES = [1, 0.985, 1.015]; // about ±26 cents
const tuned = one => ROBIN_RATES.map(rate => ({ ...one, rate: (one.rate ?? 1) * rate }));
const PANDEIRO = {
  couro: take('pandeiro-grave', 1),
  platinela: take('pandeiro-platinela', 0),
  seco: take('pandeiro-grave', 2),
  grave: take('pandeiro-grave', 0),
};
const PALMAS = { uma: take('palmas', 0), roda: take('palmas', 1), abafada: take('palmas', 2), pulseira: take('palmas', 3) };
const PALMAS_HANDS = [4, 5]; // the other clap recordings: more hands in the roda
const RUM = take('atabaque-grave', 6);
const RUMPI = take('atabaque-agudo', 6);
const LE = take('atabaque-agudo', 7);
const CONGA = takes('atabaque-grave').slice(0, 6); // a little higher than the rum: the rumpi's other takes
const QUINTO = takes('atabaque-agudo').slice(0, 6); // higher again: the lé's other takes
export const DEFAULT_PANDEIRO = 'couro';
export const DEFAULT_PALMAS = 'roda';
/** The palmas of one pick: the roda is many hands, so it takes every group clap in turn. */
const palmasTakes = (option = DEFAULT_PALMAS) =>
  option === DEFAULT_PALMAS ? [PALMAS.roda, ...PALMAS_HANDS.map(i => take('palmas', i))] : tuned(PALMAS[option]);
/** The alfaia's strokes: a rufada sixteenth is two strokes a 32nd apart; a golpe is a full stroke. */
const alfaiaShape = tone =>
  tone === RUFADA ? { stroke: 'hit', notes: Array(ROLL_STROKES).fill(null), strum: STEP_SECONDS / ROLL_STROKES, gain: RUFADA_GAIN } : { stroke: 'hit' };

const STUDIO = {
  room: 'sala-pequena',
  roomLevel: 0.8,
  lead: 'low',
  voices: {
    low: {
      seed: 21,
      role: 'lead',
      gain: 1.1,
      send: 0.12,
      bright: [900, 10000],
      shape: alfaiaShape,
      strokes: () => ({
        hit: [
          { file: 'alfaia-deep-main', layer: 0.9 },
          { file: 'alfaia-deep-click-main', layer: 0.9 },
          { file: 'alfaia-deep-short-main', layer: 0.5 },
          ...takes(['zabumba-aberto', { gain: 0.8 }]).filter(t => t.layer >= 0.8),
        ],
      }),
    },
    high: {
      seed: 22,
      role: 'follower',
      gain: 0.9,
      pan: -0.1,
      send: 0.14,
      template: lilt(STEPS_PER_BAR, STEP_MS, HIGH_HEAD_LILT),
      ghosts: [{ step: 7, velocity: 0.28, probability: 0.6 }], // a soft pick-up into the next bar, most bars
      shape: alfaiaShape,
      strokes: () => ({
        hit: ['alfaia-deep-answer', 'alfaia-deep-click-answer', 'alfaia-deep-short-answer', 'alfaia-dry-body-answer'].map(file => ({
          file,
          rate: SECOND_HEAD_RATE,
        })),
      }),
    },
    caixa: {
      seed: 23,
      role: 'follower',
      gain: 0.65,
      pan: 0.2,
      send: 0.16,
      bright: [2500, 16000],
      strokes: () => ({ hit: [...takes('caixa'), { file: 'caixa-aro', layer: 0.9 }] }),
    },
    abe: {
      seed: 24,
      role: 'follower',
      gain: 1.2,
      pan: -0.4,
      send: 0.2,
      strokes: () => ({ hit: ['agbe-maracatu', 'agbe-played-shekere', 'agbe-soft-shekere', 'agbe-cabasa'].map(file => ({ file })) }),
    },
    ganza: {
      seed: 25,
      role: 'follower',
      gain: 1.3,
      pan: 0.4,
      send: 0.2,
      template: lilt(STEPS_PER_BAR, STEP_MS, GANZA_LILT),
      strokes: () => ({ hit: ['ganza-rice', 'ganza-dry', 'ganza-caxixi'].map(file => ({ file })) }),
    },
    pandeiro: {
      seed: 26,
      role: 'follower',
      gain: 0.6,
      pan: -0.25,
      send: 0.18,
      // the pick plays the strokes on the beats; the platinelas between them are always the jingles
      strokes: choice => ({ pele: tuned(PANDEIRO[choice.pandeiro ?? DEFAULT_PANDEIRO]), jingle: takes('pandeiro-platinela') }),
      shape: tone => ({ stroke: tone === 'jingle' ? 'jingle' : 'pele' }),
    },
    palmas: { seed: 27, role: 'follower', gain: 0.9, pan: 0.15, send: 0.35, strokes: choice => ({ hit: palmasTakes(choice.palmas) }) },
    agogo: {
      seed: 28,
      role: 'follower',
      gain: 0.7,
      pan: 0.3,
      send: 0.22,
      strokes: () => ({ low: [{ file: 'agogo-short-bell' }], high: [{ file: 'agogo-short-bell', rate: AGOGO_HIGH_RATE }] }),
      shape: tone => ({ stroke: tone === 'low' ? 'low' : 'high' }),
    },
    // the trio sits around the low head: rum left, lé right
    rum: { seed: 29, role: 'follower', gain: 0.85, pan: -0.3, send: 0.16, bright: [1200, 12000], strokes: () => ({ hit: tuned(RUM) }) },
    rumpi: { seed: 30, role: 'follower', gain: 0.7, pan: 0.05, send: 0.16, strokes: () => ({ hit: [RUMPI, ...CONGA] }) },
    le: { seed: 31, role: 'follower', gain: 0.6, pan: 0.35, send: 0.18, strokes: () => ({ hit: [LE, ...QUINTO] }) },
  },
};

/** A sound choice of the viewer's: four recordings, as the maracatu caixa offers. */
const pickedChoice = (id, label, defaultOption, options) => ({
  id,
  label,
  defaultOption,
  preview: [id],
  files: option => studioFiles(STUDIO, [id], { [id]: option }),
  options,
});
const SOUND_CHOICES = [
  ...recordedChoices(STUDIO, [
    ['alfaia', 'alfaia', ALFAIA, 'alfaia gravada'],
    ['caixa', 'caixa', ['caixa'], 'caixa gravada'],
    ['ganza', 'ganzá', ['ganza'], 'ganzá gravado'],
    ['abe', 'abê', ['abe'], 'abê gravado'],
    ['agogo', 'agogô', ['agogo'], 'agogô gravado'],
  ]),
  pickedChoice('pandeiro', 'pandeiro', DEFAULT_PANDEIRO, [
    ['couro', 'pandeiro de couro'],
    ['platinela', 'pandeiro de platinela'],
    ['seco', 'pandeiro seco'],
    ['grave', 'pandeiro grave'],
  ]),
  pickedChoice('palmas', 'palmas', DEFAULT_PALMAS, [
    ['roda', 'palmas da roda'],
    ['uma', 'uma palma'],
    ['abafada', 'palma abafada'],
    ['pulseira', 'palma com pulseira'],
  ]),
  ...recordedChoices(STUDIO, [['atabaque', 'atabaque', ATABAQUES, 'rum, rumpi e lé']]),
];

// ---------- copy ----------
const DRUMMING_INSTRUMENTS = new Set(VOICE_ORDER.map(voice => VOICES[voice].instrument)).size;
const phraseHitCount = key => PHRASES[key].low.length + PHRASES[key].high.length;
const READ = {
  cycle: '1 ciclo',
  cycleValue: seconds => `${STEPS_PER_BAR} semicolcheias = ${seconds} s`,
  sixteenth: '1 semicolcheia',
  milliseconds: ms => `${ms} ms`,
  meter: 'compasso',
  meterValue: `${BEATS_PER_BAR}/4`,
  instruments: 'instrumentos',
  enters: 'entra',
  entersMuted: 'sem som',
  lowHead: 'pele grave',
  highHead: 'segunda pele',
  beatHeads: `cabeças do tempo\n${countFromOne(BEAT_STEPS)}`,
  offbeats: 'semicolcheias de contratempo',
  hitsLow: 'batidas\npele grave',
  hitsHigh: 'batidas\nsegunda pele',
  onOffbeat: 'no contratempo',
  hits: n => `${n} batidas`,
  phrases: 'frases',
  sameTempo: 'andamento',
  sameTempoValue: `${BPM} bpm, o mesmo`,
  rufada: 'rufada',
  rufadaValue: 'as duas peles em fusas, até o golpe',
  bars: 'compassos',
  howItEnds: 'como termina',
  rufoAndCut: 'rufo e corte',
  rum: 'rum · grave',
  rumpi: 'rumpi · médio',
  le: 'lé · agudo',
  trio: 'atabaques',
  leadVaries: 'o rum varia a cada 2 compassos',
};
const COPY = {
  name: 'Coco da Xambá',
  selector: 'coco', // the rhythm selector's chip
  description: 'Coco da Xambá, de Olinda: alfaia, ganzá, pandeiro, palmas e atabaques, um de cada vez e depois juntos, com som de instrumentos reais.', // the page's search and preview description
  themeColor: COCO_PALETTE.ground, // the page's theme-color: the rhythm's own ground colour
  feminineInstruments: ['alfaia', 'caixa', 'palmas'],
  scenes: {
    intro: { chip: 'Introdução', eyebrow: 'rufadas de alfaia', title: 'Coco da Xambá' },
    alfaia: { chip: 'Alfaia', eyebrow: 'pele grave nas cabeças do tempo', title: 'Alfaia' },
    heads: { chip: 'Duas peles', eyebrow: 'segunda pele no contratempo', title: 'Duas peles' },
    ganza: { chip: 'Ganzá', eyebrow: 'entra', title: 'Ganzá' },
    pandeiro: { chip: 'Pandeiro', eyebrow: 'entra', title: 'Pandeiro' },
    palmas: { chip: 'Palmas', eyebrow: 'no contratempo', title: 'Palmas' },
    agogoAbe: { chip: 'Agogô e abê', eyebrow: 'entram', title: 'Agogô e abê' },
    caixa: { chip: 'Caixa', eyebrow: 'entra', title: 'Caixa' },
    atabaques: { chip: 'Atabaques', eyebrow: 'rum, rumpi e lé', title: 'Atabaques' },
    phrases: { chip: 'Frases', eyebrow: `${PHRASE_ORDER.length} frases da alfaia`, title: 'Frases' },
    toque: { chip: 'Toque', eyebrow: 'mais batidas, o mesmo andamento', title: 'Toque' },
    rufo: { chip: 'Rufo', eyebrow: 'rufo final', title: 'Rufo' },
    finale: { chip: 'Final', eyebrow: '', title: 'Fim' },
  },
  patterns: { base: 'Base', dobrada: 'Dobrada', resposta: 'Resposta', corrida: 'Corrida', toque: 'Toque' },
  voices: {
    low: 'pele grave',
    high: 'segunda pele',
    caixa: 'caixa',
    abe: 'abê',
    ganza: 'ganzá',
    pandeiro: 'pandeiro',
    palmas: 'palmas',
    agogo: 'agogô',
    rum: 'rum',
    rumpi: 'rumpi',
    le: 'lé',
  },
  instruments: { alfaia: 'alfaia' },
  hands: { low: READ.lowHead, high: READ.highHead },
  centre: { roll: 'RUFADA', cut: 'CORTE', end: 'FIM', offbeat: 'CONTRATEMPO' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
/** One bar of the alfaia as marks: each stroke in the colour of its head. */
const marks = (low, high) =>
  STEPS.map(step =>
    low.includes(step) ? { kind: 'strong', color: VOICES.low.color } : high.includes(step) ? { kind: 'strong', color: VOICES.high.color } : 'rest',
  );
const seqRow = (name, color, inst, bar, count) => ({ name, color, inst, marks: bar, count: T.hits(count) });
const phraseRow = key => seqRow(COPY.patterns[key], undefined, 'alfaia', marks(PHRASES[key].low, PHRASES[key].high), phraseHitCount(key));
const atabaqueRow = (voice, steps) => seqRow(T[voice], VOICES[voice].color, 'atabaque', marksAt(STEPS_PER_BAR, steps), steps.length);
const rows = (...list) => notation(STEPS_PER_BEAT, list);
const entry = () => `<div data-entry></div>`;
const allHits = phrase => [...phrase.low, ...phrase.high];

const LAYOUTS = {
  intro: () =>
    row(label(T.cycle), T.cycleValue(BAR_SECONDS.toFixed(2).replace('.', ','))) +
    row(label(T.sixteenth), T.milliseconds(Math.round((BAR_SECONDS / STEPS_PER_BAR) * MS_PER_SECOND))) +
    row(label(T.meter), T.meterValue) +
    row(label(T.rufada), T.rufadaValue, 'alfaia'),
  alfaia: entry,
  heads: () =>
    stats('two', stat(BEAT_STEPS.length, T.beatHeads, VOICES.low.color), stat(STEPS_PER_BAR - BEAT_STEPS.length, T.offbeats, VOICES.high.color)) +
    rows(phraseRow('base')),
  ganza: entry,
  pandeiro: entry,
  palmas: entry,
  agogoAbe: entry,
  caixa: entry,
  atabaques: () =>
    rows(atabaqueRow('rum', RUM_PHRASES[0].steps), atabaqueRow('rumpi', ATABAQUE.rumpi.steps), atabaqueRow('le', ATABAQUE.le.steps)) +
    row(label(T.trio), T.leadVaries, 'atabaque'),
  phrases: () => rows(...PHRASE_ORDER.map(phraseRow)) + row(label(T.sameTempo), T.sameTempoValue),
  toque: () => {
    const phrase = PHRASES.toque,
      all = allHits(phrase);
    return `${stats(
      'small',
      stat(phrase.low.length, T.hitsLow, VOICES.low.color),
      stat(phrase.high.length, T.hitsHigh, VOICES.high.color),
      stat(`${all.filter(isOffbeat).length}<small>/${all.length}</small>`, T.onOffbeat, COLORS.fg),
    )}${rows(phraseRow('base'), phraseRow('toque'))}`;
  },
  rufo: () => row(label(T.rufada), T.rufadaValue, 'alfaia') + row(label(T.sameTempo), T.sameTempoValue),
  finale: show =>
    stats('', stat(PHRASE_ORDER.length, T.phrases, COLOR.low), stat(DRUMMING_INSTRUMENTS, T.instruments, COLOR.rum), stat(show.totalBars, T.bars, COLORS.fg)) +
    row(label(T.howItEnds), T.rufoAndCut),
};
const FOCUS = { alfaia: 'alfaia', heads: 'alfaia', phrases: 'alfaia', toque: 'alfaia', rufo: 'alfaia', atabaques: 'atabaque' };

/** The readout for a scene: its markup, no score (the score renderer is written for 4/4), and its focus. */
const readout = (scene, show) => ({ markup: LAYOUTS[scene.id](show), score: null, focus: FOCUS[scene.id] || '' });

export const COCO_XAMBA = {
  id: 'coco',
  bpm: BPM,
  beatsPerBar: BEATS_PER_BAR,
  stepsPerBeat: STEPS_PER_BEAT,
  swing: SWING,
  voices: VOICES,
  shapeVoices: ['agogo', 'high', 'low'],
  barHits,
  sceneDefaults: { phrase: always('base') },
  sounds: studioSounds(STUDIO, SOUND_CHOICES, 'atabaques'), // every instrument plays its basic part there
  scenes: SCENE_LIST,
  looks: SCENE_LOOKS,
  background: {
    create: options => createCocoPainter({ ...options, barSeconds: BAR_SECONDS, beatsPerBar: BEATS_PER_BAR, rufada: RUFADA, golpe: GOLPE }),
  },
  readout,
  waves: null,
  copy: COPY,
};
