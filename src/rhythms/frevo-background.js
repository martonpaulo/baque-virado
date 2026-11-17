// The frevo background: an Olinda street at night seen from above the wheel. Sombrinhas in the
// four colours of Pernambuco's flag circle the wheel, confetti bursts out of it on the surdo's
// open beat, and the brass throws gold spikes. Everything is drawn from the show position and the
// recent hits, so it is deterministic; only a light trail keeps the frames before it.
// Safety (docs/research/colour-and-visuals.md, rule 6): no full-screen flash; the beat is carried by
// motion (the sombrinhas snap forward on each beat), never by a change of brightness.
import { REDUCED_MOTION_QUERY } from '../theme.js';
import { hash, lerp } from '../util.js';

export const FREVO_PALETTE = {
  ground: '#0a1230', // night blue
  yellow: '#ffd400', // brass gold and the sombrinha's yellow
  red: '#e8312a',
  green: '#1fa463',
  blue: '#2a6fdb',
  white: '#ffffff',
};
const GROUND_RGB = '10,18,48';
const BLUE_RGB = '42,111,219';
const GROUND_ALPHA = alpha => `rgba(${GROUND_RGB},${alpha})`;
const BLUE_ALPHA = alpha => `rgba(${BLUE_RGB},${alpha})`;
const GOLD = FREVO_PALETTE.yellow;
const BOOM_DECAY = 0.25; // seconds
const SPIKE_GROW = 4; // a long note's spikes reach full length in a quarter of a second
const WEDGES = [FREVO_PALETTE.yellow, FREVO_PALETTE.red, FREVO_PALETTE.green, FREVO_PALETTE.blue];
const CONFETTI = [...WEDGES, FREVO_PALETTE.white];
const TAU = Math.PI * 2;

const TRAIL_ALPHA = 0.42; // how much of the last frame each frame paints over
const HALO_RADIUS = 2.6; // wheel radii
const HALO_ALPHA = 0.22;
const HALO_BOOM = 0.08; // the tuba and surdo widen the halo (size, not brightness)
const ALPHA_DIGITS = 3;
const SNAP_POWER = 3; // easing of each beat's step: fast out of the beat, settling before the next
// the inner ring clears the wheel's numbers; the outer one stays faint, as it crosses the text
const INNER = { radius: 1.32, size: 0.16, beatsPerTurn: 16, spinPerBeat: 1 / 8, alpha: 0.9 };
const OUTER = { radius: 2.05, size: 0.14, beatsPerTurn: -32, spinPerBeat: -1 / 8, alpha: 0.45 };
const JITTER = 0.05; // wheel radii, at full fury
const CONFETTI_COUNT = 18;
const CONFETTI_LIFE = 1.1; // seconds
const CONFETTI_START = 1.08; // wheel radii
const CONFETTI_REACH = 1.9; // wheel radii travelled in a life
const CONFETTI_SIZE = [3, 6]; // CSS px
const SPIKES = 14;
const SPIKE_LIFE = 1.2; // seconds, a long brass note
const SPIKE_START = 1.12;
const SPIKE_REACH = 1.1; // wheel radii
const SPIKE_WIDTH = 0.05; // radians
const SPIKE_ALPHA = 0.32;
const STAB_LIFE = 0.25;
const STAB_LENGTH = 0.4;
const STAB_WIDTH = 0.08;
const STAB_ALPHA = 0.7;
const WIND_LIFE = 0.35;
const WIND_RADIUS = 1.22;
const WIND_ARC = 0.5; // radians
const WIND_WIDTH = 2; // CSS px
const WIND_ALPHA = 0.55;
const VIGNETTE_STOPS = [
  [0, 0.85],
  [0.12, 0.45],
  [0.26, 0],
  [0.52, 0],
  [0.66, 0.82],
  [1, 0.95],
];
const SEED_STEP = 97; // spreads the seeds of neighbouring hits

/** The background of the frevo show. `angleOf(step)`: a step's angle on the wheel. */
export function createFrevoPainter({ beatsPerBar, stepsPerBar, angleOf }) {
  const reduced = globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
  const calm = () => Boolean(reduced?.matches);

  /** Beats elapsed, each beat's step eased so the motion has an impact point on the beat. */
  function snappedBeats(position, frozenAt) {
    const beats = (frozenAt ?? position) * beatsPerBar,
      whole = Math.floor(beats);
    return whole + 1 - (1 - (beats - whole)) ** SNAP_POWER;
  }

  function umbrella(ctx, x, y, radius, spin) {
    for (let k = 0; k < WEDGES.length * 2; k++) {
      ctx.fillStyle = WEDGES[k % WEDGES.length];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, spin + (k / (WEDGES.length * 2)) * TAU, spin + ((k + 1) / (WEDGES.length * 2)) * TAU);
      ctx.fill();
    }
  }

  function ring(ctx, g, ringSpec, count, beats, fury, jitterSeed) {
    const whole = Math.floor(count),
      last = count - whole,
      r = g.scopeRadius;
    const turn = (beats / ringSpec.beatsPerTurn) * TAU * (calm() ? 1 / 2 : 1);
    for (let i = 0; i < Math.ceil(count); i++) {
      const a = turn + (i / Math.max(1, Math.ceil(count))) * TAU,
        shake = calm() ? 0 : fury * JITTER * r;
      const x = g.centreX + Math.cos(a) * ringSpec.radius * r + (hash(jitterSeed + i) - 1 / 2) * shake,
        y = g.centreY + Math.sin(a) * ringSpec.radius * r + (hash(jitterSeed + i + SEED_STEP) - 1 / 2) * shake;
      ctx.globalAlpha = ringSpec.alpha * (i < whole ? 1 : last);
      umbrella(ctx, x, y, ringSpec.size * r, beats * ringSpec.spinPerBeat * TAU);
    }
    ctx.globalAlpha = 1;
  }

  function confetti(ctx, g, hit) {
    const r = g.scopeRadius,
      seed = Math.round(hit.at * stepsPerBar) * SEED_STEP,
      progress = hit.age / CONFETTI_LIFE;
    ctx.globalAlpha = 1 - progress;
    for (let k = 0; k < CONFETTI_COUNT; k++) {
      const a = hash(seed + k) * TAU,
        reach = CONFETTI_START + CONFETTI_REACH * (1 - (1 - progress) ** 2) * (1 / 2 + hash(seed + k + SEED_STEP) / 2);
      const size = lerp(CONFETTI_SIZE[0], CONFETTI_SIZE[1], hash(seed - k)) * g.dpr;
      ctx.fillStyle = CONFETTI[k % CONFETTI.length];
      ctx.save();
      ctx.translate(g.centreX + Math.cos(a) * reach * r, g.centreY + Math.sin(a) * reach * r);
      ctx.rotate(a + progress * TAU);
      ctx.fillRect(-size / 2, -size, size, size * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function spike(ctx, g, angle, from, to, width) {
    const r = g.scopeRadius;
    ctx.beginPath();
    ctx.moveTo(g.centreX + Math.cos(angle - width) * from * r, g.centreY + Math.sin(angle - width) * from * r);
    ctx.lineTo(g.centreX + Math.cos(angle) * to * r, g.centreY + Math.sin(angle) * to * r);
    ctx.lineTo(g.centreX + Math.cos(angle + width) * from * r, g.centreY + Math.sin(angle + width) * from * r);
    ctx.fill();
  }

  /** `frame`: the canvas geometry plus { position, params, recent, mode, barStart } (src/background.js). */
  function draw(ctx, frame) {
    const g = frame,
      { position, params, recent } = frame;
    const look = key => lerp(params.from[key], params.to[key], params.mix);
    ctx.fillStyle = GROUND_ALPHA(TRAIL_ALPHA);
    ctx.fillRect(0, 0, g.width, g.height);
    let boom = 0;
    for (const h of recent) if (h.voice === 'surdo' || h.voice === 'tuba') boom = Math.max(boom, Math.exp(-h.age / BOOM_DECAY));
    const halo = ctx.createRadialGradient(g.centreX, g.centreY, 0, g.centreX, g.centreY, g.scopeRadius * HALO_RADIUS * (1 + HALO_BOOM * boom));
    halo.addColorStop(0, BLUE_ALPHA((HALO_ALPHA * look('glow')).toFixed(ALPHA_DIGITS)));
    halo.addColorStop(1, BLUE_ALPHA(0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, g.width, g.height);
    // a cut freezes the sombrinhas where the bar began: the dancers hold their pose
    const beats = snappedBeats(position, frame.mode === 'cut' ? frame.barStart : null),
      fury = look('fury'),
      jitterSeed = Math.floor(position * stepsPerBar) * SEED_STEP;
    ring(ctx, g, OUTER, look('outer'), beats, fury, jitterSeed);
    ring(ctx, g, INNER, look('inner'), beats, fury, jitterSeed + SEED_STEP);
    if (!calm()) {
      ctx.fillStyle = GOLD;
      for (const h of recent) {
        if (h.voice === 'surdo' && h.hit.tone === 'aberto' && h.age < CONFETTI_LIFE) confetti(ctx, g, h);
        if (h.voice !== 'trompete') continue;
        if (h.hit.tone.endsWith('~') && h.age < SPIKE_LIFE) {
          ctx.globalAlpha = SPIKE_ALPHA * (1 - h.age / SPIKE_LIFE);
          ctx.fillStyle = GOLD;
          const reach = SPIKE_START + SPIKE_REACH * Math.min(1, h.age * SPIKE_GROW);
          for (let k = 0; k < SPIKES; k++) spike(ctx, g, (k / SPIKES) * TAU + h.at, SPIKE_START, reach, SPIKE_WIDTH);
        } else if (h.age < STAB_LIFE) {
          ctx.globalAlpha = STAB_ALPHA * (1 - h.age / STAB_LIFE) * h.hit.velocity;
          ctx.fillStyle = GOLD;
          const a = angleOf((h.at % 1) * stepsPerBar);
          spike(ctx, g, a, SPIKE_START, SPIKE_START + STAB_LENGTH, STAB_WIDTH);
        }
      }
      ctx.strokeStyle = FREVO_PALETTE.green;
      ctx.lineWidth = WIND_WIDTH * g.dpr;
      for (const h of recent) {
        if (h.voice !== 'sax' || h.age > WIND_LIFE) continue;
        const a = angleOf((h.at % 1) * stepsPerBar),
          radius = g.scopeRadius * (WIND_RADIUS + h.age);
        ctx.globalAlpha = WIND_ALPHA * (1 - h.age / WIND_LIFE);
        ctx.beginPath();
        ctx.arc(g.centreX, g.centreY, radius, a - WIND_ARC, a);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Darken top and bottom, where the title and the lanes sit, in the frevo's own ground colour. */
  function vignette(ctx, g) {
    const vignette = ctx.createLinearGradient(0, 0, 0, g.height);
    for (const [stop, alpha] of VIGNETTE_STOPS) vignette.addColorStop(stop, GROUND_ALPHA(alpha));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, g.width, g.height);
  }
  return { draw, vignette };
}
