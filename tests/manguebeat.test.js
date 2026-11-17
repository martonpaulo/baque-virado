// The manguebeat package: its show script, its riff and echoes, its sounds and the rules its
// colours and flashes keep (docs/rhythms/manguebeat.md).
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { meterOf } from '../src/music.js';
import { ANSWER, GANZA, isEcho, MAIN, MANGUEBEAT, MAX_RETUNE, RIFF } from '../src/rhythms/manguebeat.js';
import { MANGUE_PALETTE } from '../src/rhythms/manguebeat-background.js';
import { midiOf } from '../src/rhythms/studio-kit.js';
import { createShow } from '../src/show.js';
import { planStudio } from '../src/studio.js';
import { COLORS } from '../src/theme.js';

const show = createShow(MANGUEBEAT);
const meter = meterOf(MANGUEBEAT);
const DEFAULTS = Object.fromEntries(MANGUEBEAT.sounds.choices.map(choice => [choice.id, choice.defaultOption]));
const soundPath = (name, extension) => fileURLToPath(new URL(`../sounds/${name}${extension}`, import.meta.url));
const PHONE_BYTES = 420_000; // every default take and the room, before Play (docs/rhythms/manguebeat.md)
const FELT_RANGE = [90, 105]; // docs/research/pernambuco-rhythms-feeling.md, § 4
const stepsOf = (bar, voice, keep = () => true) =>
  show
    .hitsInBar(bar)
    .filter(h => h.voice === voice && keep(h))
    .map(h => h.hit.step);
const written = h => !isEcho(h.hit.tone);
const bars = id => {
  const scene = show.sceneById(id);
  return [...Array(scene.bars).keys()].map(bar => scene.start + bar);
};

test('manguebeat is 4/4 at a felt 100 BPM on a 16-step wheel, twelve scenes, 48 bars, under two minutes', () => {
  assert.equal(MANGUEBEAT.id, 'manguebeat');
  assert.equal(MANGUEBEAT.copy.name, 'manguebeat');
  assert.ok(MANGUEBEAT.bpm >= FELT_RANGE[0] && MANGUEBEAT.bpm <= FELT_RANGE[1], `${MANGUEBEAT.bpm} BPM`);
  assert.equal(meter.stepsPerBar, 16);
  assert.equal(meter.barSeconds, 2.4);
  assert.deepEqual(
    show.SCENES.map(scene => [scene.id, scene.bars]),
    [
      ['introducao', 2],
      ['alfaias', 4],
      ['maos', 4],
      ['caixa', 4],
      ['baixo', 4],
      ['guitarra', 4],
      ['coco', 4],
      ['dub', 4],
      ['retorno', 4],
      ['corte', 2],
      ['banda', 8],
      ['final', 4],
    ],
  );
  assert.equal(show.TOTAL_BARS, 48);
  assert.ok(show.TOTAL_SECONDS > 110 && show.TOTAL_SECONDS < 120, `${show.TOTAL_SECONDS} s`);
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of show.hitsInBar(bar)) assert.ok(h.grid >= bar && h.grid < bar + 1, `${h.voice} at ${h.grid} is outside bar ${bar}`);
});

test('the parts enter one by one after the introduction: alfaias, caixa, bass, guitar, ganzá', () => {
  const firstBar = voice => {
    for (let bar = show.sceneById('alfaias').start; bar < show.TOTAL_BARS; bar++) if (show.hitsInBar(bar).some(h => h.voice === voice)) return bar;
    return null;
  };
  const order = ['main', 'caixa', 'baixo', 'guitarra', 'ganza'].map(firstBar);
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    order,
  );
  assert.equal(new Set(order).size, order.length);
});

test('the alfaias play in unison first, then the answer hand moves to beats 2 and 4', () => {
  for (const bar of bars('alfaias')) assert.deepEqual(stepsOf(bar, 'answer'), stepsOf(bar, 'main'));
  const main = MAIN.split(' ').flatMap((token, step) => (token === 'X' ? [step] : []));
  for (const bar of bars('maos')) {
    assert.deepEqual(stepsOf(bar, 'main'), main);
    assert.deepEqual(
      stepsOf(bar, 'answer').filter(step => step % meter.stepsPerBar < 13),
      [4, 12],
    );
  }
  assert.equal(ANSWER.length, 2);
});

test('the bass doubles the main hand, an octave under the guitar, and the riff sits on its strokes', () => {
  for (const id of ['baixo', 'guitarra', 'banda'])
    for (const bar of bars(id)) {
      const main = stepsOf(bar, 'main', written);
      assert.deepEqual(stepsOf(bar, 'baixo', written), main, `${id} bar ${bar}`);
      if (id === 'baixo') continue;
      const guitar = show.hitsInBar(bar).filter(h => h.voice === 'guitarra' && written(h));
      for (const g of guitar.filter(h => h.hit.velocity === 1)) assert.ok(main.includes(g.hit.step), `a guitar accent off the main hand at ${g.hit.step}`);
      for (const b of show.hitsInBar(bar).filter(h => h.voice === 'baixo')) {
        const g = guitar.find(h => h.hit.step === b.hit.step);
        assert.equal(midiOf(g.hit.tone) - midiOf(b.hit.tone), 12, `bar ${bar} step ${b.hit.step}`);
      }
    }
});

test('the riff is in E minor: every chord root is a degree of E natural or harmonic minor', () => {
  const E_MINOR = new Set(['E', 'F#', 'G', 'A', 'B', 'C', 'D', 'D#']);
  const roots = RIFF.flatMap(bar => bar.split(' ').filter(token => token !== '.')).map(token => token.replace(/[!~]/g, ''));
  assert.ok(roots.length > 0);
  for (const root of roots) assert.ok(E_MINOR.has(root), root);
  assert.equal(roots[0], 'E', 'the riff starts on the tonic');
});

test('the ganzá plays the coco levada: every sixteenth, the accent on the third of each beat', () => {
  const tokens = GANZA.split(' ');
  assert.equal(tokens.length, meter.stepsPerBar);
  assert.deepEqual(
    tokens.flatMap((token, step) => (token === 'X' ? [step % MANGUEBEAT.stepsPerBeat] : [])),
    [2, 2, 2, 2],
  );
  for (const bar of bars('coco')) assert.equal(stepsOf(bar, 'ganza').length, meter.stepsPerBar);
});

test('the dub echo repeats each accent a dotted eighth later, softer each time, and the show ends in silence', () => {
  const echoes = [];
  for (const bar of bars('dub')) for (const h of show.hitsInBar(bar)) if (isEcho(h.hit.tone)) echoes.push(h);
  assert.ok(echoes.length > 10, `${echoes.length} echoes in the dub`);
  const sixteenths = (a, b) => Math.round((a.grid - b.grid) * meter.stepsPerBar);
  for (const echo of echoes) {
    const bar = Math.floor(echo.grid);
    const source = [...show.hitsInBar(bar - 1), ...show.hitsInBar(bar)].find(
      h => h.voice === echo.voice && sixteenths(echo, h) > 0 && sixteenths(echo, h) % 3 === 0 && h.hit.velocity > echo.hit.velocity,
    );
    assert.ok(source, `${echo.voice} echo at ${echo.grid} has no louder stroke a dotted eighth or more before it`);
  }
  // the final: one stroke for all, then only its echo, fading, then nothing
  const [, stroke, tail, last] = bars('final');
  assert.ok(show.hitsInBar(stroke).some(h => h.voice === 'guitarra' && h.hit.tone.endsWith('~')));
  const tailHits = show.hitsInBar(tail).filter(h => h.voice === 'main');
  assert.ok(tailHits.length > 0 && tailHits.every(h => isEcho(h.hit.tone)));
  const levels = [stroke, tail].flatMap(bar => show.hitsInBar(bar).filter(h => h.voice === 'main' && isEcho(h.hit.tone))).map(h => h.hit.velocity);
  assert.deepEqual(
    levels,
    [...levels].sort((a, b) => b - a),
  );
  assert.deepEqual(show.hitsInBar(last), []);
});

test('every planned take exists, a chord retunes at most two semitones, the same render every time', () => {
  const plan = planStudio(MANGUEBEAT, show, DEFAULTS);
  const again = planStudio(MANGUEBEAT, show, DEFAULTS);
  assert.deepEqual([...plan.entries()], [...again.entries()]);
  for (const events of plan.values())
    for (const event of events)
      for (const source of event.sources) {
        assert.ok(existsSync(soundPath(source.file, '.m4a')) && existsSync(soundPath(source.file, '.wav')), source.file);
        if (event.voice === 'guitarra' || event.voice === 'baixo')
          assert.ok(Math.abs(Math.log2(source.rate) * 12) <= MAX_RETUNE + 1e-9, `${event.voice} ${source.file} retunes too far`);
      }
});

test('every default take sits beside its WAV master; the phone set stays under 420 KB', () => {
  const names = [...new Set([...MANGUEBEAT.sounds.choices.flatMap(choice => choice.files(choice.defaultOption)), ...MANGUEBEAT.sounds.fixedFiles])];
  for (const name of names) assert.ok(existsSync(soundPath(name, '.m4a')) && existsSync(soundPath(name, '.wav')), name);
  const bytes = names.reduce((sum, name) => sum + statSync(soundPath(name, '.m4a')).size, 0);
  assert.ok(bytes < PHONE_BYTES, `the default takes weigh ${bytes} bytes`);
});

// ---------- colours and flashes ----------
const channel = c => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const WHEEL_COLOURS = Object.values(MANGUEBEAT.voices).map(voice => voice.color);

test('each voice reads at 3:1 on the wheel and on the mud, and no red passes R/(R+G+B) 0.8', () => {
  for (const [voice, { color }] of Object.entries(MANGUEBEAT.voices)) {
    assert.ok(contrast(rgb(color), rgb(COLORS.void)) >= 3, `${voice} ${color} on the wheel`);
    assert.ok(contrast(rgb(color), rgb(MANGUE_PALETTE.ground)) >= 3, `${voice} ${color} on the ground`);
  }
  for (const hex of [...Object.values(MANGUE_PALETTE), ...WHEEL_COLOURS]) {
    const [r, g, b] = rgb(hex);
    assert.ok(r / (r + g + b) < 0.8, hex);
  }
});

const FPS = 30;
const RADIUS = 120;
const GEOMETRY = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: RADIUS, dpr: 1 };
/** Draw the whole show at 30 frames a second on a context that records what `record` asks for. */
function drawShow(record = {}) {
  const noop = () => {};
  const gradient = () => ({ addColorStop: noop });
  const ctx = new Proxy(
    {},
    { get: (_target, key) => record[key] || (key === 'createRadialGradient' || key === 'createLinearGradient' ? gradient : noop), set: () => true },
  );
  const layer = MANGUEBEAT.background.create({ stepsPerBar: meter.stepsPerBar, angleOf: step => (step / meter.stepsPerBar) * Math.PI * 2 });
  for (let frame = 0; frame < show.TOTAL_SECONDS * FPS; frame++) {
    const position = frame / FPS / meter.barSeconds;
    const blend = show.blendAt(position, 1.5);
    const params = { from: MANGUEBEAT.looks[blend.from.id], to: MANGUEBEAT.looks[blend.to.id], mix: blend.amount, sceneId: blend.scene.id };
    layer.draw(ctx, { ...GEOMETRY, position, params, recent: show.recentHits(position, 2), fresh: frame === 0 });
  }
  return layer;
}

test('the background flashes at most 3 times in any second (WCAG 2.3.1)', () => {
  const flashes = drawShow().flashTimes();
  assert.ok(flashes.length > 0);
  for (const start of flashes) assert.ok(flashes.filter(t => t >= start && t < start + 1).length <= 3, `flashes from ${start.toFixed(2)} s`);
});

test('under the wheel the background stays dark: the wheel colours keep 3:1, and every shape is born outside it', () => {
  const ground = rgb(MANGUE_PALETTE.ground);
  let darkest = Infinity,
    nearest = Infinity;
  const near = (x, y) => {
    nearest = Math.min(nearest, Math.hypot(x - GEOMETRY.centreX, y - GEOMETRY.centreY));
  };
  drawShow({
    createRadialGradient: (_x0, _y0, r0, _x1, _y1, r1) => ({
      addColorStop: (offset, colour) => {
        if (r0 + offset * (r1 - r0) > RADIUS) return;
        const [r, g, b, a] = colour.match(/[\d.]+/g).map(Number);
        const under = [r, g, b].map((c, i) => c * a + ground[i] * (1 - a));
        for (const hex of WHEEL_COLOURS) darkest = Math.min(darkest, contrast(rgb(hex), under));
      },
    }),
    moveTo: near,
    lineTo: near,
    quadraticCurveTo: (_cx, _cy, x, y) => near(x, y),
    arc: (x, y, radius) => near(x + (x === GEOMETRY.centreX && y === GEOMETRY.centreY ? radius : 0), y),
    fillRect: (x, y, w, h) => {
      if (w < GEOMETRY.width) near(x + w / 2, y + h / 2);
    },
  });
  assert.ok(darkest >= 3, `a wheel colour at ${darkest.toFixed(2)}:1`);
  assert.ok(nearest > RADIUS, `a shape drawn ${nearest.toFixed(1)} px from the centre, inside the wheel`);
});
