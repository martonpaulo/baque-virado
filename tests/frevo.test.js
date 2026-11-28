// The frevo package: its show script, its sounds and the rules its music and colours keep
// (docs/frevo.md).
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { meterOf } from '../src/music.js';
import { CAIXA_CELL, FREVO, FREVO_LINES, MAX_BORROW, midiOf, nearestSample, PANDEIRO_BAR, soundingIn } from '../src/rhythms/frevo.js';
import { FREVO_PALETTE } from '../src/rhythms/frevo-background.js';
import { BARS_PER_PAGE, barLayout, barPieces, FREVO_GRAPHICS, spell, valvesFor, withAccidentals } from '../src/rhythms/frevo-graphics.js';
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

// ---------- its own graphics: the tune's score and the trompete's valves (#55) ----------
const STEPS_PER_BAR = 8;
const startOf = id => show.sceneById(id).start;
const [G4, B4, D5] = [32, 34, 36]; // degrees: a note's place among the seven of each octave, as a staff writes it
/** A bar's pieces as short text: `34b:1` a B flat of one sixteenth, `r4` a rest, `~` a tie on that side. */
const written = bar =>
  barPieces(soundingIn('sax', bar), STEPS_PER_BAR).map(piece =>
    piece.rest
      ? `r${piece.steps}`
      : `${piece.tiedFrom ? '~' : ''}${piece.degree}${{ '-1': 'b', 0: '', 1: 's' }[piece.alter]}:${piece.steps}${piece.tiedTo ? '~' : ''}`,
  );

test('a length is written with the fewest note values, and a bar as its notes, ties and rests', () => {
  assert.deepEqual(FREVO.graphics.ids, FREVO_GRAPHICS);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8].map(steps => spell(steps)),
    [[1], [2], [3], [4], [4, 1], [6], [6, 1], [8]],
  );
  // a bar with nothing is one rest of the whole bar; a gap inside a bar is never a dotted rest
  assert.deepEqual(barPieces([], STEPS_PER_BAR), [{ step: 0, steps: STEPS_PER_BAR, rest: true }]);
  assert.deepEqual(
    barPieces([{ step: 7, steps: 1, degree: G4, alter: 0 }], STEPS_PER_BAR).map(piece => [piece.step, piece.steps, piece.rest]),
    [
      [0, 4, true],
      [4, 2, true],
      [6, 1, true],
      [7, 1, false],
    ],
  );
  // five sixteenths are a quarter tied to a sixteenth, and both light as the one note they write
  const five = barPieces([{ step: 0, steps: 5, degree: D5, alter: 0 }], STEPS_PER_BAR);
  assert.deepEqual(
    five.map(piece => [piece.steps, piece.rest, piece.tiedFrom ?? null, piece.tiedTo ?? null]),
    [
      [4, false, false, true],
      [1, false, true, false],
      [2, true, null, null],
      [1, true, null, null],
    ],
  );
  assert.deepEqual(
    [five[0].sounds, five[1].sounds],
    [
      [0, 5],
      [0, 5],
    ],
  );
});

test('the score writes the tune as the package wrote it: values, accidentals and notes held over a bar line', () => {
  const palhetas = startOf('palhetas');
  // «d5 - - - - - c5 bb4»: a dotted quarter and two sixteenths; the B is flat, as the key has it
  assert.deepEqual(written(palhetas + 1), ['36:6', '35:1', '34b:1']);
  // «bb4 - - a4 - - g4 -» then «- - - - . g4 b4 d5»: 3 + 3 + 2, the last note tied over the bar line,
  // a sixteenth's rest, and a B natural the key lacks
  assert.deepEqual(written(palhetas + 6), ['34b:3', '33:3', '32:2~']);
  assert.deepEqual(written(palhetas + 7), ['~32:4', 'r1', '32:1', '34:1', '36:1']);
  assert.equal(B4, 34);
  // the part's last note: a half, tied to a quarter in the bar after it, then a quarter's rest
  assert.deepEqual(written(palhetas + 14), ['32:8~']);
  assert.deepEqual(written(palhetas + 15), ['~32:4', 'r4']);
  // a scene with no tune: every bar is one whole rest
  assert.deepEqual(written(startOf('caixa')), ['r8']);
  // every bar of the show fills its bar, piece after piece, and pages of four bars fill every scene
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
    let at = 0;
    for (const piece of barPieces(soundingIn('sax', bar), STEPS_PER_BAR)) {
      assert.equal(piece.step, at, `bar ${bar}: a piece at ${piece.step}, after ${at}`);
      at += piece.steps;
    }
    assert.equal(at, STEPS_PER_BAR, `bar ${bar} holds ${at} sixteenths`);
  }
  for (const scene of show.SCENES) assert.equal(scene.bars % BARS_PER_PAGE, 0, `${scene.id}: ${scene.bars} bars`);
});

test('every note of the tune and of the trompete sounds where it is written, and every trompete note has its valves', () => {
  let blown = 0;
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
    for (const voice of ['sax', 'trompete'])
      assert.deepEqual(
        soundingIn(voice, bar)
          .filter(note => note.step >= 0)
          .map(note => note.step),
        show
          .hitsInBar(bar)
          .filter(h => h.voice === voice)
          .map(h => h.hit.step),
        `${voice} in bar ${bar}`,
      );
    for (const note of soundingIn('trompete', bar)) {
      blown++;
      assert.ok(valvesFor(note.midi) !== null, `bar ${bar}: no fingering for MIDI ${note.midi}`);
      assert.ok(FREVO.copy.graphics.notes[note.pitch], `bar ${bar}: no name for «${note.pitch}»`);
    }
  }
  assert.ok(blown > 60, `the trompete plays only ${blown} notes`);
  // a B flat trumpet sounds a tone under its written note: a sounding B flat is its open C
  assert.deepEqual(valvesFor(midiOf('bb4')), []);
  assert.deepEqual(valvesFor(midiOf('a4')), [2]); // written B
  assert.deepEqual(valvesFor(midiOf('g5')), [1, 2]); // written A
  assert.deepEqual(valvesFor(midiOf('fs5')), [2, 3]); // written G sharp
  assert.deepEqual(valvesFor(midiOf('c6')), [1]); // written D
  assert.deepEqual(valvesFor(midiOf('e3')), [1, 2, 3]); // written F sharp, its lowest note
  assert.equal(valvesFor(midiOf('eb3')), null);
});

test('a note shows its accidental where it leaves the key or returns to it, and a bar gives a sign the room it needs', () => {
  const FLATS = [6, 2], // the key's si and mi, as letters from dó
    palhetas = startOf('palhetas'),
    shown = bar => withAccidentals(barPieces(soundingIn('sax', bar), STEPS_PER_BAR), FLATS);
  const signs = bar => shown(bar).map(piece => (piece.rest ? 'r' : piece.accidental));
  // «a4 - cs5 e5 d5 - c5 a4»: a sharp, the natural the key's mi flat needs, and the natural that takes the sharp back
  assert.deepEqual(signs(palhetas + 13), [null, 1, 0, null, 0, null]);
  // a note tied over the bar line shows no sign again; the si natural after it does
  assert.deepEqual(signs(palhetas + 7), [null, 'r', null, 0, null]);
  // a bar with no sign next to a neighbour, and no flag before its bar line, is spaced evenly
  const even = barLayout(shown(palhetas + 1), STEPS_PER_BAR);
  for (const [step, middle] of even.entries()) assert.ok(Math.abs(middle - (step + 1 / 2) / STEPS_PER_BAR) < 1e-9, `step ${step} at ${middle}`);
  // «- - - - . g4 b4 d5»: the natural stands after a sixteenth whose flags reach right, so its sixteenth is wider
  const wide = barLayout(shown(palhetas + 7), STEPS_PER_BAR),
    gaps = wide.slice(1).map((middle, step) => middle - wide[step]);
  assert.ok(gaps[5] > 1.7 * gaps[0] && gaps[5] < 1.8 * gaps[0], `the natural's sixteenth is ${(gaps[5] / gaps[0]).toFixed(2)} of a plain one`);
  for (const step of [0, 1, 2, 3, 4, 6]) assert.ok(Math.abs(gaps[step] - gaps[0]) < 1e-9, `step ${step}`);
  assert.ok(wide[STEPS_PER_BAR - 1] < 1, 'the last note stands inside its bar');
});
