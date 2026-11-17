// The manguebeat package: its show script, its riff and echoes, its sounds and the rules its
// colours and flashes keep (docs/rhythms/manguebeat.md).
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { meterOf } from '../src/music.js';
import {
  ANSWER,
  BASS_A,
  BASS_B,
  CAIXA,
  GANZA,
  isEcho,
  isThrown,
  LICK,
  MAIN,
  MANGUEBEAT,
  MAX_DOUBLE_RETUNE,
  MAX_RETUNE,
  parseTone,
  RIFF_A,
  RIFF_B,
} from '../src/rhythms/manguebeat.js';
import { MANGUE_PALETTE } from '../src/rhythms/manguebeat-background.js';
import { midiOf } from '../src/rhythms/studio-kit.js';
import { createShow } from '../src/show.js';
import { planStudio } from '../src/studio.js';
import { COLORS } from '../src/theme.js';

const show = createShow(MANGUEBEAT);
const meter = meterOf(MANGUEBEAT);
const DEFAULTS = Object.fromEntries(MANGUEBEAT.sounds.choices.map(choice => [choice.id, choice.defaultOption]));
const soundPath = (name, extension) => fileURLToPath(new URL(`../sounds/${name}${extension}`, import.meta.url));
const PHONE_BYTES = 520_000; // every default take and the room, before Play (docs/rhythms/manguebeat.md)
const FELT_RANGE = [90, 105]; // docs/research/pernambuco-rhythms-feeling.md, § 4
const SHOW_SECONDS = [80, 130]; // about 1:20 to 2:10
const ECHO_STEPS = 3; // a dotted eighth, in sixteenths
const OCTAVE = 12;
const CELL = [0, 3, 6, 8, 11, 14]; // 3 + 3 + 2 sixteenths, twice a bar
const PICK_UPS = [7, 15]; // the answer hand, before beats 3 and 1
const LOUDEST_CAIXA = [6, 14]; // the «2» of each cell
const MOST_OF_A_BAR = 0.75; // a riff sounds on at most this share of the bar's sixteenths
const MIN_LICK_RESTS = 6; // sixteenths of silence in each bar of the second guitar
const marked = (text, mark = 'X') => text.split(' ').flatMap((token, step) => (token === mark ? [step] : []));
const hitsOf = (bar, voice, keep = () => true) => show.hitsInBar(bar).filter(h => h.voice === voice && keep(h));
const stepsOf = (bar, voice, keep) => hitsOf(bar, voice, keep).map(h => h.hit.step);
const written = h => !isEcho(h.hit.tone);
const bars = id => {
  const scene = show.sceneById(id);
  return [...Array(scene.bars).keys()].map(bar => scene.start + bar);
};

test('manguebeat is 4/4 at one felt tempo, the top of its range, on a 16-step wheel: twelve scenes, 52 bars', () => {
  assert.equal(MANGUEBEAT.id, 'manguebeat');
  assert.equal(MANGUEBEAT.copy.name, 'manguebeat');
  assert.ok(MANGUEBEAT.bpm >= FELT_RANGE[0] && MANGUEBEAT.bpm <= FELT_RANGE[1], `${MANGUEBEAT.bpm} BPM`);
  assert.equal(MANGUEBEAT.bpm, FELT_RANGE[1], 'the edge of the range nearest the reference recording');
  assert.equal(meter.stepsPerBar, 16);
  assert.deepEqual(
    show.SCENES.map(scene => [scene.id, scene.bars]),
    [
      ['introducao', 2],
      ['alfaias', 4],
      ['maos', 4],
      ['caixa', 4],
      ['coco', 4],
      ['baixo', 4],
      ['guitarra', 4],
      ['dub', 4],
      ['retorno', 4],
      ['corte', 2],
      ['banda', 12],
      ['final', 4],
    ],
  );
  assert.equal(show.TOTAL_BARS, 52);
  assert.ok(show.TOTAL_SECONDS > SHOW_SECONDS[0] && show.TOTAL_SECONDS < SHOW_SECONDS[1], `${show.TOTAL_SECONDS} s`);
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of show.hitsInBar(bar)) assert.ok(h.grid >= bar && h.grid < bar + 1, `${h.voice} at ${h.grid} is outside bar ${bar}`);
  for (const scene of show.SCENES) assert.ok(MANGUEBEAT.readout(scene).markup.length > 0, scene.id);
});

test('the parts enter one by one after the introduction: alfaias, caixa, ganzá, bass, guitar, the guitar in the echo', () => {
  const firstBar = voice => {
    for (let bar = show.sceneById('alfaias').start; bar < show.TOTAL_BARS; bar++) if (show.hitsInBar(bar).some(h => h.voice === voice)) return bar;
    return null;
  };
  const order = ['main', 'caixa', 'ganza', 'baixo', 'guitarra', 'eco'].map(firstBar);
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    order,
  );
  assert.equal(new Set(order).size, order.length);
});

test('the alfaias play the coco cell, 3 + 3 + 2 twice a bar, in unison first; then the answer hand plays the pick-ups', () => {
  assert.deepEqual(marked(MAIN), CELL);
  const last = bars('alfaias').at(-1);
  for (const bar of bars('alfaias')) {
    assert.deepEqual(stepsOf(bar, 'main'), CELL);
    if (bar !== last) assert.deepEqual(stepsOf(bar, 'answer'), CELL);
  }
  assert.equal(ANSWER.length, 2);
  for (const bar of bars('maos')) {
    assert.deepEqual(stepsOf(bar, 'main'), CELL);
    const answer = hitsOf(bar, 'answer');
    for (const pickUp of PICK_UPS)
      assert.ok(
        answer.some(h => h.hit.step === pickUp && h.hit.velocity > 0.5),
        `no pick-up at ${pickUp} in bar ${bar}`,
      );
    if (bar !== bars('maos').at(-1)) assert.ok(!answer.some(h => CELL.includes(h.hit.step)), `the answer hand doubles the main hand in bar ${bar}`);
  }
});

test('the caixa accents the cell with the alfaias, ghost notes between; the ganzá plays every sixteenth with the same accents', () => {
  for (const text of CAIXA) {
    assert.deepEqual(marked(text), CELL);
    assert.ok(marked(text, 'x').length >= 4, 'ghost notes');
  }
  assert.deepEqual(marked(GANZA), CELL);
  assert.equal(GANZA.split(' ').length, meter.stepsPerBar);
  for (const bar of bars('coco')) assert.equal(stepsOf(bar, 'ganza').length, meter.stepsPerBar);
  // the loudest caixa strokes are the syncopated ones, never the first beat
  const [bar] = bars('coco');
  const loudest = Math.max(...hitsOf(bar, 'caixa').map(h => h.hit.velocity));
  assert.deepEqual(
    stepsOf(bar, 'caixa', h => h.hit.velocity === loudest),
    LOUDEST_CAIXA,
  );
});

test('the riffs lock on the cell and leave space: guitar accents on the alfaia strokes, the bass an octave under each bar’s first chord', () => {
  const sounding = hits => new Set(hits.flatMap(h => [...Array(parseTone(h.hit.tone).steps).keys()].map(i => h.hit.step + i)));
  for (const id of ['guitarra', 'banda'])
    for (const bar of bars(id)) {
      const guitar = hitsOf(bar, 'guitarra', written),
        bass = hitsOf(bar, 'baixo', written);
      for (const g of guitar.filter(h => h.hit.velocity === 1))
        assert.ok(CELL.includes(g.hit.step), `a guitar accent off the cell at ${g.hit.step}, bar ${bar}`);
      assert.equal(guitar[0].hit.step, 0);
      assert.equal(bass[0].hit.step, 0);
      assert.equal(midiOf(parseTone(guitar[0].hit.tone).note) - midiOf(parseTone(bass[0].hit.tone).note), OCTAVE, `bar ${bar}`);
      assert.ok(sounding(bass).size <= meter.stepsPerBar * MOST_OF_A_BAR, `the bass leaves no space in bar ${bar}`);
      assert.ok(sounding(guitar).size <= meter.stepsPerBar * MOST_OF_A_BAR, `the guitar leaves no space in bar ${bar}`);
    }
  // a phrase is four bars and at least three of them differ: never one bar in a loop
  for (const phrase of [BASS_A, BASS_B, RIFF_A, RIFF_B]) {
    assert.equal(phrase.length, 4);
    assert.ok(new Set(phrase).size >= 3);
  }
  // the second guitar answers after the riff's first stabs, and rests for a third of each bar or more
  for (const bar of LICK)
    assert.ok(
      marked(bar, '.').length >= MIN_LICK_RESTS &&
        bar
          .split(' ')
          .slice(0, 4)
          .every(token => token === '.'),
    );
});

test('every line is in E minor, natural or harmonic, and the riffs start on the tonic', () => {
  const E_MINOR = new Set(['E', 'F#', 'G', 'A', 'B', 'C', 'D', 'D#']);
  const notes = [BASS_A, BASS_B, RIFF_A, RIFF_B, LICK].flatMap(phrase =>
    phrase.flatMap(bar => bar.split(' ').filter(token => token !== '.' && token !== '-')).map(token => token.replace(/[!*\d]/g, '')),
  );
  assert.ok(notes.length > 100);
  for (const note of notes) assert.ok(E_MINOR.has(note), note);
  assert.ok(RIFF_A[0].startsWith('E2'), 'the riff starts on the tonic');
  assert.ok(BASS_A[0].startsWith('E1'));
});

test('the dub echo: each mark a dotted eighth after a louder stroke, silent in the plan, its stroke thrown into the studio’s delay', () => {
  const echoes = [];
  for (const bar of bars('dub')) for (const h of show.hitsInBar(bar)) if (isEcho(h.hit.tone)) echoes.push(h);
  assert.ok(echoes.length > 10, `${echoes.length} echoes in the dub`);
  const sixteenths = (a, b) => Math.round((a.grid - b.grid) * meter.stepsPerBar);
  for (const echo of echoes) {
    const bar = Math.floor(echo.grid);
    const source = [...show.hitsInBar(bar - 1), ...show.hitsInBar(bar)].find(
      h => h.voice === echo.voice && sixteenths(echo, h) > 0 && sixteenths(echo, h) % ECHO_STEPS === 0 && h.hit.velocity > echo.hit.velocity,
    );
    assert.ok(source, `${echo.voice} echo at ${echo.grid} has no louder stroke a dotted eighth or more before it`);
  }
  // the dub drops the band: no ganzá, no distorted guitar
  for (const bar of bars('dub')) assert.deepEqual([...hitsOf(bar, 'ganza'), ...hitsOf(bar, 'guitarra')], []);
  // the studio's delay is that dotted eighth, and it sounds the marks: the plan holds no event for them
  const { echo } = MANGUEBEAT.sounds.studio;
  assert.ok(Math.abs(echo.time - (ECHO_STEPS * meter.beatSeconds) / MANGUEBEAT.stepsPerBeat) < 1e-9);
  const plan = planStudio(MANGUEBEAT, show, DEFAULTS);
  let thrown = 0,
    marks = 0;
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of show.hitsInBar(bar)) {
      const events = (plan.get(bar * meter.stepsPerBar + h.hit.step) || []).filter(event => event.voice === h.voice);
      if (isEcho(h.hit.tone)) {
        assert.deepEqual(events, [], `an echo mark of ${h.voice} sounds at bar ${bar} step ${h.hit.step}`);
        marks++;
      } else if (isThrown(h.voice, bar, h.hit.step)) {
        assert.ok(
          events.some(event => event.throw > 0),
          `${h.voice} at bar ${bar} step ${h.hit.step} is not thrown`,
        );
        thrown++;
      }
    }
  assert.ok(marks > thrown);
  assert.ok(thrown >= 10 && thrown <= 40, `${thrown} throws: an effect, not a wash`);
  assert.equal([...plan.values()].flat().filter(event => event.throw).length, thrown);
});

test('the show ends on one stroke for all, its echo fading, then silence', () => {
  const [, stroke, tail, last] = bars('final');
  assert.ok(show.hitsInBar(stroke).some(h => h.voice === 'guitarra' && parseTone(h.hit.tone).steps === meter.stepsPerBar));
  const tailHits = hitsOf(tail, 'main');
  assert.ok(tailHits.length > 0 && tailHits.every(h => isEcho(h.hit.tone)));
  const levels = [stroke, tail].flatMap(bar => hitsOf(bar, 'main', h => isEcho(h.hit.tone))).map(h => h.hit.velocity);
  assert.deepEqual(
    levels,
    [...levels].sort((a, b) => b - a),
  );
  assert.deepEqual(show.hitsInBar(last), []);
});

test('every planned take exists, a note retunes at most two semitones (a chord’s double three), the same render every time', () => {
  const plan = planStudio(MANGUEBEAT, show, DEFAULTS);
  const again = planStudio(MANGUEBEAT, show, DEFAULTS);
  assert.deepEqual([...plan.entries()], [...again.entries()]);
  const LIMIT = { baixo: MAX_RETUNE, guitarra: MAX_DOUBLE_RETUNE };
  const TUNING_SLACK = 0.2; // semitones: the recorded notes' own tuning and the double's few cents
  let doubled = 0,
    chords = 0;
  for (const events of plan.values())
    for (const event of events) {
      if (event.voice === 'guitarra') {
        const [first, twin] = event.sources;
        assert.ok(twin?.twin, 'the guitar is double-tracked');
        chords++;
        if (twin.file !== first.file) doubled++;
      }
      for (const source of event.sources) {
        assert.ok(existsSync(soundPath(source.file, '.m4a')) && existsSync(soundPath(source.file, '.wav')), source.file);
        if (LIMIT[event.voice])
          assert.ok(Math.abs(Math.log2(source.rate) * OCTAVE) <= LIMIT[event.voice] + TUNING_SLACK, `${event.voice} ${source.file} retunes too far`);
      }
    }
  assert.ok(doubled > chords / 2, `${doubled} of ${chords} chords doubled by a different take`);
});

test('every default take sits beside its WAV master; the phone set stays under 520 KB', () => {
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
