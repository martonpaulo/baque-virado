// The coco da Xambá package: its sound options, the atabaque trio, the rufadas, its seeded human feel
// and its background (docs/rhythms/coco.md).
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { meterOf } from '../src/music.js';
import { ATABAQUES, CLEAR, COCO_PALETTE, COCO_XAMBA, createCocoPainter, GOLPE, MIN_FLASH_GAP, RUFADA } from '../src/rhythms/coco-xamba.js';
import { createShow } from '../src/show.js';
import { planStudio } from '../src/studio.js';
import { COLORS, TINTS } from '../src/theme.js';

const show = createShow(COCO_XAMBA);
const { stepsPerBar, beatSeconds } = meterOf(COCO_XAMBA);
const CHOICES = Object.fromEntries(COCO_XAMBA.sounds.choices.map(choice => [choice.id, choice]));
const DEFAULTS = Object.fromEntries(COCO_XAMBA.sounds.choices.map(choice => [choice.id, choice.defaultOption]));
const soundPath = (name, extension) => fileURLToPath(new URL(`../sounds/${name}${extension}`, import.meta.url));
const filesOf = choices => [...COCO_XAMBA.sounds.choices.flatMap(c => c.files(choices[c.id])), ...COCO_XAMBA.sounds.fixedFiles];
const PHONE_BYTES = 400_000; // every default sample, before Play
const optionsOf = id => CHOICES[id].options.map(([option]) => option);
/** Every planned event of the show for one set of choices, with its step. */
const eventsOf = choices =>
  [...planStudio(COCO_XAMBA, show, choices).entries()].sort(([a], [b]) => a - b).flatMap(([step, list]) => list.map(event => ({ step, ...event })));
const studioVoice = voice => COCO_XAMBA.sounds.studio.voices[voice];
const strokeFiles = (voice, stroke, choices) =>
  new Set(
    studioVoice(voice)
      .strokes(choices)
      [stroke].map(take => take.file),
  );
const voiceHits = (bar, voice) => show.hitsInBar(bar).filter(h => h.voice === voice);

test('the pandeiro and the palmas offer four recordings each, couro and roda by default', () => {
  assert.deepEqual(optionsOf('pandeiro'), ['couro', 'platinela', 'seco', 'grave']);
  assert.deepEqual(optionsOf('palmas'), ['roda', 'uma', 'abafada', 'pulseira']);
  assert.equal(DEFAULTS.pandeiro, 'couro');
  assert.equal(DEFAULTS.palmas, 'roda');
  for (const id of ['pandeiro', 'palmas']) {
    for (const [option, label] of CHOICES[id].options) assert.match(label, /^[a-zà-ú ]+$/, `${id} ${option}: a Portuguese label`);
    const sounds = CHOICES[id].options.map(([option]) => CHOICES[id].files(option).join());
    assert.equal(new Set(sounds).size, sounds.length, `each ${id} option sounds different`);
  }
});

test('a pandeiro pick plays its stroke on the beats, the platinelas between; a palmas pick plays its claps', () => {
  for (const option of optionsOf('pandeiro')) {
    const choices = { ...DEFAULTS, pandeiro: option },
      pele = strokeFiles('pandeiro', 'pele', choices),
      jingles = strokeFiles('pandeiro', 'jingle', choices);
    assert.equal(pele.size, 1, `${option}: one recording on the beats`);
    for (const event of eventsOf(choices).filter(e => e.voice === 'pandeiro')) {
      const onBeat = (event.step % stepsPerBar) % COCO_XAMBA.stepsPerBeat === 0;
      for (const { file } of event.sources) assert.ok((onBeat ? pele : jingles).has(file), `${option} step ${event.step} plays ${file}`);
    }
  }
  const roda = strokeFiles('palmas', 'hit', DEFAULTS);
  assert.ok(roda.size >= 3, 'the roda claps with several hands');
  for (const option of optionsOf('palmas').slice(1)) {
    const files = new Set(
      eventsOf({ ...DEFAULTS, palmas: option })
        .filter(e => e.voice === 'palmas')
        .flatMap(e => e.sources.map(s => s.file)),
    );
    assert.equal(files.size, 1, `${option} plays its one clap`);
    assert.ok(!roda.has([...files][0]), `${option} is not one of the roda's claps`);
  }
});

test('one recording never repeats unchanged: a single take is played round robin at three tunings', () => {
  for (const option of optionsOf('pandeiro')) {
    const rates = eventsOf({ ...DEFAULTS, pandeiro: option })
      .filter(e => e.voice === 'pandeiro' && e.stroke === 'pele')
      .map(e => e.sources[0].rate);
    assert.equal(new Set(rates).size, 3, `${option}: ${new Set(rates).size} tunings`);
    const repeats = rates.filter((rate, i) => i > 0 && rate === rates[i - 1]).length;
    assert.ok(repeats / rates.length < 0.5, `${option}: ${repeats} of ${rates.length} strokes repeat the tuning before`);
  }
});

test('every option has its recordings beside their WAV masters; the phone set stays under 400 KB', () => {
  for (const choice of COCO_XAMBA.sounds.choices)
    for (const [option] of choice.options)
      for (const name of filesOf({ ...DEFAULTS, [choice.id]: option })) {
        assert.ok(existsSync(soundPath(name, '.m4a')), `${name}.m4a`);
        assert.ok(existsSync(soundPath(name, '.wav')), `${name}.wav`);
      }
  const bytes = filesOf(DEFAULTS).reduce((sum, name) => sum + statSync(soundPath(name, '.m4a')).size, 0);
  assert.ok(bytes < PHONE_BYTES, `the default samples weigh ${bytes} bytes`);
  assert.ok(!existsSync(fileURLToPath(new URL('../sounds/incoming-coco', import.meta.url))), 'no incoming folder is left');
});

/** Zero crossings per second over the first 150 ms of a 16-bit mono WAV: a rough pitch. */
function crossingsPerSecond(name) {
  const bytes = readFileSync(soundPath(name, '.wav'));
  const data = bytes.indexOf('data') + 8,
    rate = bytes.readUInt32LE(24),
    count = Math.min((bytes.length - data) / 2, rate * 0.15);
  let crossings = 0;
  for (let i = 1; i < count; i++) if (bytes.readInt16LE(data + (i - 1) * 2) < 0 !== bytes.readInt16LE(data + i * 2) < 0) crossings++;
  return crossings / (count / rate);
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test('the atabaques are a trio, rum, rumpi and lé, low to high, entering together in their scene', () => {
  assert.deepEqual(ATABAQUES, ['rum', 'rumpi', 'le']);
  for (const voice of ATABAQUES) assert.equal(COCO_XAMBA.voices[voice].instrument, 'atabaque');
  const pitch = ATABAQUES.map(voice => median([...strokeFiles(voice, 'hit', DEFAULTS)].map(crossingsPerSecond)));
  assert.deepEqual(
    [...pitch].sort((a, b) => a - b),
    pitch,
    `pitch rises from rum to lé: ${pitch.map(Math.round)}`,
  );
  const scene = show.sceneById('atabaques'),
    firstBar = voice => [...Array(show.TOTAL_BARS).keys()].find(bar => voiceHits(bar, voice).length);
  for (const voice of ATABAQUES) assert.equal(firstBar(voice), scene.start, voice);
  const steps = (voice, bar) =>
    voiceHits(bar, voice)
      .map(h => h.hit.step)
      .join();
  const bars = [...Array(scene.bars).keys()].map(i => scene.start + i);
  assert.ok(new Set(bars.map(bar => steps('rum', bar))).size > 1, 'the rum, the lead, varies');
  for (const voice of ['rumpi', 'le']) assert.equal(new Set(bars.map(bar => steps(voice, bar))).size, 1, `${voice} keeps its figure`);
});

test('rufadas open the show: the alfaia alone rolls into golpes, then into the first scene', () => {
  const intro = show.sceneById('intro');
  for (let bar = intro.start; bar < intro.start + intro.bars; bar++)
    for (const h of show.hitsInBar(bar)) assert.ok(['low', 'high'].includes(h.voice), `only the alfaia opens, not ${h.voice}`);
  const opening = [...Array(intro.bars).keys()].flatMap(bar => show.hitsInBar(bar));
  assert.ok(opening.filter(h => h.hit.tone === RUFADA).length >= intro.bars * stepsPerBar * 0.75, 'the opening is mostly rufada');
  assert.ok(
    opening.some(h => h.hit.tone === GOLPE),
    'a rufada lands on a golpe',
  );
  assert.equal(voiceHits(intro.bars - 1, 'high').at(-1).hit.tone, RUFADA, 'the opening rolls into the first scene');
  assert.equal(voiceHits(intro.bars, 'low')[0].hit.tone, GOLPE, 'the first scene lands on a golpe');
  // a rufada sixteenth sounds as two strokes of its head, a 32nd apart
  const roll = eventsOf(DEFAULTS).filter(e => e.step < stepsPerBar && e.voice === 'low');
  for (const event of roll) {
    assert.equal(event.sources.length, 2);
    assert.ok(Math.abs(event.sources[1].delay - beatSeconds / COCO_XAMBA.stepsPerBeat / 2) < 1e-9);
    assert.notEqual(event.sources[0].file, event.sources[1].file, 'the two strokes are two takes');
  }
});

test('every scene change from the alfaia to the final is a rufada into a golpe', () => {
  const changes = show.SCENES.slice(1, -1).filter(scene => !['toque', 'rufo'].includes(scene.id));
  assert.ok(changes.length >= 9);
  for (const scene of changes) {
    const last = scene.start + scene.bars - 1,
      next = scene.start + scene.bars;
    const tail = ['low', 'high'].flatMap(voice => voiceHits(last, voice)).filter(h => h.hit.step >= stepsPerBar / 2);
    assert.ok(tail.length >= stepsPerBar / 2 && tail.every(h => h.hit.tone === RUFADA), `${scene.id} rolls into the next scene`);
    assert.equal(voiceHits(next, 'low')[0].hit.tone, GOLPE, `${show.sceneAt(next).id} lands on a golpe`);
    if (show.barTimeline(last).playing.includes('ganza'))
      assert.ok(voiceHits(last, 'ganza').length > 0, `the band keeps playing under the rufada of ${scene.id}`);
  }
  const rufo = show.sceneById('rufo');
  for (let bar = rufo.start; bar < rufo.start + rufo.bars; bar++)
    assert.ok(
      show.hitsInBar(bar).every(h => h.hit.tone === RUFADA),
      'the Rufo is one long rufada',
    );
});

test('the human feel is seeded and correlated: the same plan every time, no Math.random, drift that wanders slowly', () => {
  assert.deepEqual(eventsOf(DEFAULTS), eventsOf(DEFAULTS));
  for (const file of ['../src/rhythms/coco-xamba.js', '../src/studio.js'])
    assert.ok(!readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8').includes('Math.random'), file);
  // the low head's beat offsets: correlated from beat to beat (pink drift), not white jitter
  const offsets = eventsOf(DEFAULTS)
    .filter(e => e.voice === 'low' && e.step % COCO_XAMBA.stepsPerBeat === 0 && e.stroke === 'hit')
    .map(e => e.offset);
  const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
  const lagged = offsets.slice(1).reduce((sum, value, i) => sum + (value - mean) * (offsets[i] - mean), 0),
    variance = offsets.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  assert.ok(lagged / variance > 0.3, `beat-to-beat correlation ${(lagged / variance).toFixed(2)}`);
  const spread = Math.sqrt(variance / offsets.length) * 1000;
  assert.ok(spread > 3 && spread < 12, `the low head spreads ${spread.toFixed(1)} ms`); // Räsänen 2015: about 8.7 ms
});

// ---------- the background ----------
const FPS = 30;
const RADIUS = 120; // the wheel's radius on the test canvas
const GEOMETRY = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: RADIUS, dpr: 1, shapes: [] };
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const channel = c => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const FACE_ALPHA = Number(/[\d.]+\)$/.exec(TINTS.scopeFace)[0].slice(0, -1)); // the wheel's dark disc
/** Draw every frame of `bars` (all the show by default) at 30 fps on a recording context. */
function paint(record = {}, bars = [0, show.TOTAL_BARS]) {
  const painter = createCocoPainter({
    stepsPerBar,
    angleOf: step => (step / stepsPerBar) * Math.PI * 2 - Math.PI / 2,
    barSeconds: meterOf(COCO_XAMBA).barSeconds,
    beatsPerBar: COCO_XAMBA.beatsPerBar,
    rufada: RUFADA,
    golpe: GOLPE,
  });
  const noop = () => {};
  const ctx = new Proxy({}, { get: (_target, key) => record[key] || (key.startsWith('create') ? () => ({ addColorStop: noop }) : noop), set: () => true });
  const { barSeconds } = meterOf(COCO_XAMBA);
  for (let frame = Math.round(bars[0] * barSeconds * FPS); frame < bars[1] * barSeconds * FPS; frame++) {
    const position = frame / FPS / barSeconds,
      blend = show.blendAt(position, 1.5);
    const params = { from: COCO_XAMBA.looks[blend.from.id], to: COCO_XAMBA.looks[blend.to.id], mix: blend.amount, sceneId: blend.scene.id };
    painter.draw(ctx, { ...GEOMETRY, position, params, recent: show.recentHits(position, 1.2), fresh: frame === 0 });
  }
  return painter;
}

test('the background flashes at most 3 times in any second (WCAG 2.3.1), on the golpes only', () => {
  const flashes = paint().flashTimes();
  assert.ok(flashes.length >= show.SCENES.length, `${flashes.length} golpe blooms`);
  for (const start of flashes) assert.ok(flashes.filter(t => t >= start && t < start + 1).length <= 3, `flashes from ${start.toFixed(2)} s`);
  for (let i = 1; i < flashes.length; i++) assert.ok(flashes[i] - flashes[i - 1] >= MIN_FLASH_GAP - 1e-9, `blooms ${flashes[i - 1]} and ${flashes[i]}`);
});

test('nothing is drawn under the wheel, so every wheel colour keeps 3:1 there; no red passes R/(R+G+B) 0.8', () => {
  let innermost = Infinity;
  const under = [];
  const record = {
    arc: (x, y, radius) => {
      // a ring round the centre lies at its radius; a spark elsewhere comes as near as its edge
      const away = Math.hypot(x - GEOMETRY.centreX, y - GEOMETRY.centreY);
      innermost = Math.min(innermost, away < 1e-9 ? radius : away - radius);
    },
    createRadialGradient: (_x0, _y0, r0, _x1, _y1, r1) => ({
      addColorStop: (offset, colour) => {
        const at = r0 + offset * (r1 - r0);
        if (at <= RADIUS || offset === 0) under.push({ at, colour }); // the first stop also paints inside r0
      },
    }),
  };
  paint(record);
  assert.ok(innermost >= CLEAR * RADIUS - 1e-9, `a shape reaches ${(innermost / RADIUS).toFixed(2)} wheel radii`);
  const ground = rgb(COCO_PALETTE.ground);
  for (const { colour } of under) {
    const [r, g, b, a] = colour.match(/[\d.]+/g).map(Number);
    assert.equal(a, 0, `${colour} shows inside the wheel's edge`);
    assert.ok([r, g, b].every(Number.isFinite));
  }
  const face = ground.map((c, i) => FACE_ALPHA * rgb(COLORS.void)[i] + (1 - FACE_ALPHA) * c);
  for (const [voice, { color }] of Object.entries(COCO_XAMBA.voices)) {
    assert.ok(contrast(rgb(color), face) >= 3, `${voice} ${color}: ${contrast(rgb(color), face).toFixed(2)}:1`);
    assert.ok(contrast(rgb(color), ground) >= 3, `${voice} ${color} on the ground`);
  }
  for (const hex of [...Object.values(COCO_PALETTE), ...Object.values(COCO_XAMBA.voices).map(v => v.color)]) {
    const [r, g, b] = rgb(hex);
    assert.ok(r / (r + g + b) < 0.8, hex);
  }
});

test('with reduced motion the background drops every pulse and turns at half speed', () => {
  const saved = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    let strokes = 0;
    const angles = [];
    const record = {
      stroke: () => strokes++,
      arc: (_x, _y, _r, from) => angles.push(from),
    };
    const painter = paint(record, [8, 9]);
    assert.deepEqual(painter.flashTimes(), [], 'no golpe bloom');
    assert.equal(strokes, 0, 'no ring');
    assert.ok(angles.length > 0, 'the skirts still turn');
  } finally {
    globalThis.matchMedia = saved;
  }
});

test('the coco keeps its felt tempo in the researched coco range, 2/4 on an 8-step wheel', () => {
  assert.ok(COCO_XAMBA.bpm >= 125 && COCO_XAMBA.bpm <= 145, `${COCO_XAMBA.bpm} BPM`); // frevo-manguebeat-coco.md, 3c
  assert.equal(stepsPerBar, 8);
});
