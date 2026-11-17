// The frevo package: its show script, its sounds and the rules its music and colours keep
// (docs/frevo.md).
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { meterOf } from '../src/music.js';
import { CAIXA_CELL, FREVO, FREVO_LINES, MAX_BORROW, midiOf, nearestSample, PANDEIRO_BAR } from '../src/rhythms/frevo.js';
import { FREVO_PALETTE } from '../src/rhythms/frevo-background.js';
import { createShow } from '../src/show.js';
import { planStudio } from '../src/studio.js';
import { COLORS } from '../src/theme.js';

const show = createShow(FREVO);
const DEFAULTS = Object.fromEntries(FREVO.sounds.choices.map(choice => [choice.id, choice.defaultOption]));
const soundPath = (name, extension) => fileURLToPath(new URL(`../sounds/${name}${extension}`, import.meta.url));
const allFiles = choices => [...FREVO.sounds.choices.flatMap(c => c.files(choices[c.id])), ...FREVO.sounds.fixedFiles];
const PHONE_BYTES = 880_000; // every default sample of the melodic show, before Play (docs/frevo.md)

test('frevo is 2/4 at one tempo on an 8-step wheel, eleven scenes as the script lists them', () => {
  const meter = meterOf(FREVO);
  assert.equal(FREVO.bpm, 125); // the reference's tempo, inside the frevo-canção range (docs/frevo.md)
  assert.equal(meter.stepsPerBar, 8);
  assert.deepEqual(
    show.SCENES.map(scene => [scene.id, scene.bars]),
    [
      ['introducao', 4],
      ['surdo', 4],
      ['caixa', 8],
      ['pandeiro', 4],
      ['tuba', 8],
      ['palhetas', 16],
      ['metais', 8],
      ['la-e-ca', 16],
      ['segunda', 16],
      ['fotografia', 4],
      ['final', 16],
    ],
  );
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of show.hitsInBar(bar)) {
      assert.ok(h.grid >= bar && h.grid < bar + 1, `${h.voice} at ${h.grid} is outside bar ${bar}`);
      assert.equal(h.swing, 0, 'frevo has no swing');
    }
});

test('the parts enter one by one: surdo, caixa, pandeiro, tuba, the palhetas, then the metais', () => {
  const firstBar = voice => {
    for (let bar = FREVO.scenes[0].bars; bar < show.TOTAL_BARS; bar++) if (show.hitsInBar(bar).some(h => h.voice === voice)) return bar;
    return null;
  };
  const order = ['surdo', 'tarol', 'pandeiro', 'tuba', 'sax', 'clarinete', 'trompete'].map(firstBar);
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    order,
  );
});

test('the caixa cell is twelve sixteenths, then the rufo, over two bars', () => {
  const tokens = CAIXA_CELL.join(' ').split(' ');
  assert.equal(tokens.filter(token => token === 'X' || token === 'x').length, 12);
  assert.equal(tokens.indexOf('r'), 12);
});

test('the pandeiro plays a sixteenth-note ostinato: every step of the bar, grave on each beat', () => {
  const bar = show.sceneById('pandeiro').start;
  const steps = show
    .hitsInBar(bar)
    .filter(h => h.voice === 'pandeiro')
    .map(h => h.hit.step)
    .sort((a, b) => a - b);
  assert.deepEqual(steps, [...Array(meterOf(FREVO).stepsPerBar).keys()]);
  assert.deepEqual(
    PANDEIRO_BAR.split(' ').flatMap((token, step) => (token === 'X' ? [step] : [])),
    [0, FREVO.stepsPerBeat],
  );
});

test('every note plays a take within four semitones of it, the nearest within two, and every take exists', () => {
  const plan = planStudio(FREVO, show, DEFAULTS);
  for (const events of plan.values())
    for (const event of events)
      for (const source of event.sources) {
        assert.ok(existsSync(soundPath(source.file, '.m4a')), `${source.file} is missing`);
        assert.ok(Math.abs(Math.log2(source.rate) * 12) <= MAX_BORROW + 1e-9, `${event.voice} ${source.file} retunes too far`);
      }
  assert.deepEqual(nearestSample('trompete', 'bb5').slice(2), [1]);
  for (const [voice, line] of Object.entries(FREVO_LINES))
    for (const note of [...line.values()].flat()) assert.ok(note.stroke, `${voice} ${note.note} has no take`);
  assert.equal(midiOf('bb4'), 70);
});

test('every sound option has its files beside their WAV masters; the phone set stays under 880 KB', () => {
  for (const choice of FREVO.sounds.choices)
    for (const [option] of choice.options)
      for (const name of allFiles({ ...DEFAULTS, [choice.id]: option })) {
        assert.ok(existsSync(soundPath(name, '.m4a')), `${name}.m4a`);
        assert.ok(existsSync(soundPath(name, '.wav')), `${name}.wav`);
      }
  const bytes = allFiles(DEFAULTS).reduce((sum, name) => sum + statSync(soundPath(name, '.m4a')).size, 0);
  assert.ok(bytes < PHONE_BYTES, `the default samples weigh ${bytes} bytes`);
});

test('the tune is played three times, each with its pickup, and the second part moves to the relative major', () => {
  const sax = (scene, bar) => JSON.stringify((FREVO_LINES.sax.get(show.sceneById(scene).start + bar) || []).map(note => [note.step, note.note, note.steps]));
  const THEME_BARS = 14; // the bars every statement shares; the last two lead somewhere else each time
  for (const scene of ['la-e-ca', 'final']) {
    for (let bar = 0; bar < THEME_BARS; bar++) assert.equal(sax(scene, bar), sax('palhetas', bar), `${scene}, bar ${bar + 1}`);
  }
  for (const scene of ['palhetas', 'la-e-ca', 'final']) assert.notEqual(sax(scene, -1), '[]', `no pickup into ${scene}`);
  assert.notEqual(sax('segunda', 0), sax('palhetas', 0));
  const scenes = Object.fromEntries(FREVO.scenes.map(scene => [scene.id, scene]));
  assert.equal(scenes.palhetas.chords[0], 'Gm');
  assert.equal(scenes.segunda.chords[0], 'Bb');
  assert.equal(scenes.final.chords.at(-1), 'Gm', 'the show ends on the tonic');
});

test('the horns sing: held notes of many lengths, sections of several players, the metais in the gaps of the tune', () => {
  const plan = planStudio(FREVO, show, DEFAULTS);
  const events = voice => [...plan.values()].flat().filter(event => event.voice === voice);
  const lengths = new Set(events('sax').map(event => event.length.toFixed(2)));
  assert.ok(lengths.size >= 6, `the saxofones play ${lengths.size} note lengths`);
  assert.ok(Math.max(...events('sax').map(event => event.length)) > meterOf(FREVO).beatSeconds, 'no held note longer than a beat');
  const section = event => event.sources.length >= 2 && new Set(event.sources.map(source => source.file)).size === event.sources.length;
  assert.ok(events('sax').every(section), 'a saxofone note with one player');
  assert.ok(
    events('trompete')
      .filter(event => event.stroke === 'curta')
      .every(section),
    'a staccato trompete note with one player',
  );
  // an answer sounds while the tune holds a note: the saxofones start no note from its first step to its last
  const laEca = show.sceneById('la-e-ca');
  for (let bar = laEca.start; bar < laEca.start + laEca.bars; bar++) {
    const answer = FREVO_LINES.trompete.get(bar) || [];
    if (!answer.some(note => note.staccato) || answer.length < 3) continue;
    const tune = (FREVO_LINES.sax.get(bar) || []).filter(note => note.step >= answer[0].step && note.step <= answer.at(-1).step);
    assert.deepEqual(tune, [], `bar ${bar + 1}: the tune moves under the answer`);
  }
});

/** WCAG relative luminance and contrast. */
const luminance = hex => {
  const channel = i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

test('each voice reads at 3:1 on the wheel, and no red passes R/(R+G+B) 0.8', () => {
  for (const [voice, { color }] of Object.entries(FREVO.voices)) assert.ok(contrast(color, COLORS.void) >= 3, `${voice} ${color}`);
  for (const hex of [...Object.values(FREVO_PALETTE), ...Object.values(FREVO.voices).map(v => v.color)]) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(r / (r + g + b) < 0.8, hex);
  }
});
