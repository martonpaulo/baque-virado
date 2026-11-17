// The brega funk background: a night party around the wheel. Everything comes out of the wheel and
// stays circular: a dark purple bloom on the bumbo (the sub-bass felt, not flashed), lime rays thrown
// from the lata like the LEDs of a paredão, rings that sway like hips on each beat, and gold only on
// the drop's horns. Bright emissions are limited to 3 per second (WCAG 2.3.1).
// Palette and reasons: docs/rhythms/brega-funk.md.

export const PALETTE = {
  ground: '#0d0612', // the night
  purple: '#b81fd6', // the parties' neon purple: the bumbo and the swaying rings
  violet: '#7d4dff', // the grave, under the bumbo
  lime: '#c6f432', // the paredão LEDs: the lata
  tin: '#d4dbe0', // the metal of the chimbais
  ivory: '#f1e6cf', // the keys
  orange: '#ff7a3d', // the lead: a phone screen lit in the dark
  gold: '#ffd23f', // the drop: the horns
  leather: '#c4875a', // the atabaque of the Rio tamborzão
};

const BEATS_PER_BAR = 4;
const TAU = Math.PI * 2;
const MIN_FLASH_GAP = 0.34; // seconds between bright emissions: under 3 per second
const TRAIL_SECONDS = 0.14; // how fast the frame before fades into the night
const BLOOM = { decay: 0.4, reach: 3.4, alpha: 0.5, inner: '#4a0a5c' }; // reach in wheel radii
const RAYS = { count: 4, life: 0.45, from: 1.15, length: 0.9, travel: 2.6, width: 3 }; // in wheel radii and CSS px
const RINGS = { radii: [1.3, 1.65, 2.05], sway: 0.12, width: 1.2, alpha: 0.28 };
const GOLD_RING = { life: 0.6, travel: 2.2, width: 3 };
const SPARK = { life: 0.3, radius: 1.25, size: 2 };
const MOTION_SCALE_REDUCED = 0.5;
const REDUCED_MOTION = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
const HEX = /^#(..)(..)(..)$/;

/** `rgba()` of a palette colour. */
const alphaOf = (hex, alpha) =>
  `rgba(${HEX.exec(hex)
    .slice(1)
    .map(pair => parseInt(pair, 16))
    .join(',')},${alpha})`;
const angleAt = bar => (bar % 1) * TAU - Math.PI / 2; // where a hit sits on the wheel

export function createBregaFunkBackground() {
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

  function draw(ctx, frame) {
    const { width, height, centreX: cx, centreY: cy, scopeRadius: r, dpr, position, params, recent, time, step, fresh } = frame;
    const calm = REDUCED_MOTION?.matches ? MOTION_SCALE_REDUCED : 1;
    ctx.save();
    ctx.globalAlpha = fresh ? 1 : 1 - Math.exp(-step / TRAIL_SECONDS);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    collect(recent, time, params.sceneId);
    bloom *= Math.exp(-step / BLOOM.decay);

    // the bumbo and the grave: a large dark bloom, felt rather than flashed
    if (bloom > 0) {
      const glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * BLOOM.reach);
      glow.addColorStop(0, alphaOf(BLOOM.inner, BLOOM.alpha * bloom));
      glow.addColorStop(1, alphaOf(PALETTE.ground, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    // the hips: rings that lean wide on one beat and tall on the next
    const lean = Math.sin(Math.PI * position * BEATS_PER_BAR) * RINGS.sway * calm,
      drop = params.sceneId === 'drop';
    ctx.lineWidth = RINGS.width * dpr;
    RINGS.radii.forEach((radius, i) => {
      const last = i === RINGS.radii.length - 1;
      ctx.strokeStyle = alphaOf(drop && last ? PALETTE.gold : PALETTE.purple, RINGS.alpha);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * radius * (1 + lean), r * radius * (1 - lean), 0, 0, TAU);
      ctx.stroke();
    });

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
        ctx.arc(cx, cy, r * (1 + (1 - life) * GOLD_RING.travel * calm), 0, TAU);
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
