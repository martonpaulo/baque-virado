// The forró pé-de-serra package: the show script, the tune's rules.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meterOf } from '../src/music.js';
import { FORRO_PE_DE_SERRA as FORRO, FORRO_PIECES } from '../src/rhythms/forro.js';
import { FORRO_GRAPHICS, keysBetween, pressLight, soundingAt } from '../src/rhythms/forro-graphics.js';
import { createShow } from '../src/show.js';

const show = createShow(FORRO);
const { WRITTEN, PARTS, CHORDS, MODE, LEADING_NOTE, PATTERNS, TOKEN, midiOf, thirdBelow } = FORRO_PIECES;
const STEPS_PER_BAR = 8;
const PITCH_CLASSES = 12;
const pitchClass = name => midiOf(name) % PITCH_CLASSES;
const hitsOf = (bar, voice) => show.hitsInBar(bar).filter(h => h.voice === voice);
/** The note names of a hit's tone (`~C5+A4:2` gives C5 and A4). */
const namesOf = tone => tone.split(TOKEN.length)[0].replace(TOKEN.grace, '').split(TOKEN.join);

// The owner's reference («Forró no Malagueta») runs at 97 to 103 BPM; the researched baião range is
// 85 to 110 (docs/rhythms/forro.md). The show keeps between 1:20 and 2:10.
test('one tempo inside the researched range, 2/4 on an 8-step wheel, the eleven scenes of the script', () => {
  assert.equal(FORRO.bpm, 100);
  assert.equal(meterOf(FORRO).stepsPerBar, STEPS_PER_BAR);
  assert.deepEqual(
    show.SCENES.map(scene => [scene.id, scene.bars]),
    [
      ['triangulo', 4],
      ['zabumba', 4],
      ['bacalhau', 4],
      ['trio', 8],
      ['sanfona', 8],
      ['baixo', 8],
      ['rabeca', 16],
      ['fole', 8],
      ['baiao', 16],
      ['breque', 2],
      ['final', 8],
    ],
  );
  assert.equal(show.TOTAL_BARS, 86);
  assert.ok(show.TOTAL_SECONDS > 80 && show.TOTAL_SECONDS < 130, `${show.TOTAL_SECONDS} s`);
});

// The voice order seeds the per-hit sound variation (src/audio.js): keep it stable.
test('the voice order is pinned', () => {
  assert.deepEqual(Object.keys(FORRO.voices), ['grave', 'bacalhau', 'triangulo', 'fole', 'baixo', 'cavaquinho', 'sanfona', 'rabeca', 'bandolim']);
});

test('the parts enter one by one: the triângulo alone, then the zabumba, the bacalhau, the left hand, the tune', () => {
  const firstBars = ['triangulo', 'zabumba', 'bacalhau', 'trio', 'sanfona'].map(id => show.barTimeline(show.sceneById(id).start).playing.length);
  assert.deepEqual(firstBars, [1, 2, 3, 4, 5]);
  assert.equal(show.barTimeline(show.sceneById('rabeca').start).playing.length, Object.keys(FORRO.voices).length);
});

test('every written bar has eight sixteenths, and every part is whole phrases with a chord per bar', () => {
  for (const [id, part] of Object.entries(WRITTEN)) {
    for (const voice of ['sanfona', 'rabeca', 'baixo']) {
      assert.equal(part[voice].length, part.chords.length, `${id} ${voice}`);
      for (const bar of part[voice]) assert.equal(bar.split(' ').length, STEPS_PER_BAR, `${id} ${voice}: ${bar}`);
    }
    for (const chord of part.chords) assert.ok(CHORDS[chord], `${id}: ${chord}`);
  }
  assert.equal(WRITTEN.A.chords.length, 8);
  assert.equal(WRITTEN.B.chords.length, 8);
});

test('the tune stays in A dorian; only the cadence on V7 borrows the leading note', () => {
  const mode = new Set(MODE.map(name => pitchClass(`${name}4`)));
  const leading = pitchClass(`${LEADING_NOTE}4`);
  for (const [id, part] of Object.entries(PARTS))
    part.forEach((bar, index) => {
      for (const voice of ['sanfona', 'rabeca', 'bandolim'])
        for (const note of bar[voice])
          for (const name of note.notes) {
            const pitch = pitchClass(name);
            assert.ok(mode.has(pitch) || (pitch === leading && bar.chord === 'E7'), `${id} bar ${index + 1} ${voice}: ${name}`);
          }
    });
  const sixths = PARTS.A.flatMap(bar => bar.sanfona).filter(note => note.notes[0].startsWith('F#'));
  assert.ok(sixths.length > 0, 'part A plays the major sixth that makes the mode dorian');
});

test('part B lands the flat seventh of D on the first beat and holds it', () => {
  const [first] = PARTS.B[1].sanfona;
  assert.deepEqual([first.step, first.notes[0][0], first.steps >= 3], [0, 'C', true]);
});

test('each part ends on a cadence: A on V7 then i, B on two bars of V7 that lead back', () => {
  assert.deepEqual(WRITTEN.A.chords.slice(-2), ['E7', 'Am']);
  assert.deepEqual(WRITTEN.B.chords.slice(-2), ['E7', 'E7']);
  const [last] = PARTS.A.at(-1).sanfona;
  assert.equal(last.notes[0], 'A4');
});

// What made the old tune a nursery rhyme: a two-bar motif repeated, on the grid, one note at a time.
test('the tune is not a two-bar loop: no bar of a part repeats another, it runs in sixteenths, crosses the bar line and plays thirds', () => {
  for (const id of ['A', 'B']) {
    const bars = WRITTEN[id].sanfona;
    assert.equal(new Set(bars).size, bars.length, `part ${id} repeats a bar`);
    const notes = PARTS[id].flatMap(bar => bar.sanfona);
    assert.ok(notes.length / bars.length >= 5, `part ${id}: ${notes.length} notes in ${bars.length} bars`);
    assert.ok(
      notes.some(note => note.notes.length > 1),
      `part ${id} has no thirds`,
    );
    assert.ok(new Set(notes.map(note => note.steps)).size >= 3, `part ${id}: every note the same length`);
  }
  assert.ok(
    WRITTEN.A.sanfona.some(bar => bar.startsWith(TOKEN.hold)),
    'no note of part A is held over a bar line',
  );
  assert.ok(
    PARTS.A.flatMap(bar => bar.sanfona).some(note => note.grace),
    'no grace note',
  );
});

test('the bass walks: it plays with the low head, leaves the root, and leans into the next chord on the last sixteenth', () => {
  const low = PATTERNS.base.grave.map(([step]) => step);
  assert.deepEqual(low, [0, 3, 4, 7]);
  for (const id of ['A', 'B']) {
    const bars = PARTS[id];
    for (const bar of bars) assert.ok(bar.baixo.length >= 4, `part ${id}: ${bar.baixo.length} bass notes in a bar`);
    assert.deepEqual(
      bars[0].baixo.map(note => note.step),
      low,
    );
    const pitches = new Set(bars.flatMap(bar => bar.baixo.map(note => note.notes[0])));
    assert.ok(pitches.size >= 8, `part ${id}: only ${[...pitches]}`);
    for (const bar of bars) assert.equal(bar.baixo.at(-1).step, STEPS_PER_BAR - 1);
  }
});

test('the bandolim doubles the tune a third below, inside the mode', () => {
  assert.deepEqual(['C5', 'D5', 'E5', 'F#5', 'A4', 'B4', 'G#4'].map(thirdBelow), ['A4', 'B4', 'C5', 'D5', 'F#4', 'G4', 'E4']);
  const bar = show.sceneById('rabeca').start;
  const [tune] = hitsOf(bar, 'sanfona'),
    [third] = hitsOf(bar, 'bandolim');
  assert.equal(namesOf(third.hit.tone)[0], thirdBelow(namesOf(tune.hit.tone)[0]));
});

test('the zabumba plays its cell with the pick-up, a fill at each phrase end, and 3 + 3 + 2 in the Baião scene', () => {
  const steps = bar => hitsOf(bar, 'grave').map(h => h.hit.step);
  const trio = show.sceneById('trio').start;
  assert.deepEqual(steps(trio), [0, 3, 4, 7]);
  assert.equal(hitsOf(trio, 'grave')[2].hit.tone, 'abafada');
  assert.deepEqual(steps(trio + 7), [0, 2, 3, 4, 6, 7]);
  assert.deepEqual(steps(show.sceneById('baiao').start), [0, 3, 6]);
});

test('in the jogo de fole the bellows shake on every sixteenth, accented in 3 + 3 + 2', () => {
  const chords = hitsOf(show.sceneById('fole').start, 'fole').filter(h => h.hit.tone.startsWith('a'));
  assert.equal(chords.length, STEPS_PER_BAR);
  const loudest = Math.max(...chords.map(h => h.hit.velocity));
  assert.deepEqual(
    chords.filter(h => h.hit.velocity === loudest).map(h => h.hit.step),
    [0, 3, 6],
  );
});

test('the breque cuts on 1 and the sanfona alone leads back; the show ends on the tonic chord', () => {
  const breque = show.sceneById('breque');
  const cut = show.hitsInBar(breque.start + 1);
  assert.deepEqual([...new Set(cut.filter(h => h.hit.step > 0).map(h => h.voice))], ['sanfona']);
  const last = show.hitsInBar(show.TOTAL_BARS - 1);
  assert.ok(last.every(h => h.hit.step === 0));
  const tonic = new Set(['A', 'C', 'E']);
  for (const name of namesOf(last.find(h => h.voice === 'sanfona').hit.tone)) assert.ok(tonic.has(name[0]), name);
  assert.equal(namesOf(last.find(h => h.voice === 'sanfona').hit.tone)[0][0], 'A');
});

// docs/research/brega-forro.md, «What makes it special»: triângulo closed at about 60 % under the
// open accent. The levels between voices are the studio's (src/studio.js, docs/rhythms/forro.md).
test('the closed triângulo strokes sit under the open accent', () => {
  const bar = show.barTimeline(show.sceneById('bacalhau').start).voices;
  const triangle = bar.triangulo.map(h => [h.hit.tone, h.hit.velocity]),
    open = Math.min(...triangle.filter(([tone]) => tone === 'aberto').map(([, v]) => v));
  assert.ok(triangle.some(([tone]) => tone === 'fechado'));
  for (const [tone, v] of triangle) if (tone === 'fechado') assert.ok(v / open <= 0.7, `closed stroke at ${v / open} of the open one`);
});

// Owner limit: never one sample repeated unchanged, and a melodic take stays near its recorded note.
test('the sanfona plays recorded notes at most two semitones away, and the cavaquinho is strummed from single strings', () => {
  const { voices } = FORRO.sounds.studio;
  assert.equal(voices.sanfona.zone, 2);
  assert.ok(voices.sanfona.strokes({}).nota.length >= 12);
  assert.ok(voices.cavaquinho.strokes({}).corda.length >= 8);
  const down = voices.cavaquinho.shape('Am:d'),
    up = voices.cavaquinho.shape('Am:u');
  assert.deepEqual([down.notes.length, up.notes.length], [4, 3]);
  assert.ok(down.strum > 0 && up.strum > 0);
});

// The key over the lanes names each wheel voice the lanes do not show (src/lanes.js keyVoices): at
// most six in this show, on two lines at most. A voice the scene does not play draws nothing.
test('only the voices a scene plays reach the wheel, so the key names six voices at most', () => {
  const MAX_KEY_NAMES = 6;
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
    const { scene, playing, voices } = show.barTimeline(bar);
    for (const voice of Object.keys(voices)) if (!playing.includes(voice)) assert.deepEqual(voices[voice], [], `${voice} in bar ${bar}`);
    const named = Object.keys(voices).filter(voice => voices[voice].length && !scene.lanes.includes(voice));
    assert.ok(named.length <= MAX_KEY_NAMES, `bar ${bar}: ${named}`);
  }
});

// ---------- its own graphics: the sanfona's two hands and the zabumba's two heads (#54) ----------
const { BASS_COLUMNS, BUTTON_ROWS, KEYBOARD_RANGE, rightHand, leftHand } = FORRO_PIECES;
const FIFTH = 7; // semitones
const octave = name => midiOf(`${name}3`);

test('the keyboard holds every note the right hand plays, from a white key to a white key', () => {
  assert.deepEqual(FORRO.graphics.ids, FORRO_GRAPHICS);
  assert.equal(typeof FORRO.graphics.create, 'function');
  const keys = keysBetween(...KEYBOARD_RANGE),
    onIt = new Set(keys.map(key => key.midi));
  assert.deepEqual(KEYBOARD_RANGE, [midiOf('E4'), midiOf('A5')]);
  assert.deepEqual([keys.at(0).black, keys.at(-1).black, keys.filter(key => !key.black).length, keys.filter(key => key.black).length], [false, false, 11, 7]);
  // a black key stands on the line after the white keys to its left: F#4 after E4 and F4
  assert.deepEqual(
    keys.find(key => key.midi === midiOf('F#4')),
    { midi: midiOf('F#4'), black: true, at: 2 },
  );
  // a range that starts or ends on a black key is widened to the white keys around it
  assert.deepEqual(
    keysBetween(midiOf('C#4'), midiOf('D#4')).map(key => key.midi),
    [midiOf('C4'), midiOf('C#4'), midiOf('D4'), midiOf('D#4'), midiOf('E4')],
  );
  let played = 0;
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of hitsOf(bar, 'sanfona')) {
      const { notes, steps } = rightHand(h.hit.tone);
      played += notes.length;
      for (const note of notes) assert.ok(onIt.has(note), `bar ${bar}: no key for MIDI ${note}`);
      // the graphic reads the bar and the one before it: a note ends in the bar after its own at the latest
      assert.ok(h.hit.step + steps <= 2 * STEPS_PER_BAR, `bar ${bar}: a note of ${steps} sixteenths from step ${h.hit.step}`);
    }
  assert.ok(played > 200, `the right hand plays only ${played} notes`);
});

test('every stroke of the left hand has its button, in columns a fifth apart', () => {
  assert.deepEqual(BUTTON_ROWS, ['baixo', 'maior', 'menor', 'setima']);
  for (const [i, column] of BASS_COLUMNS.slice(1).entries())
    assert.equal((octave(column) - octave(BASS_COLUMNS[i]) + PITCH_CLASSES) % PITCH_CLASSES, FIFTH, `${BASS_COLUMNS[i]} to ${column}`);
  const pressed = new Set();
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of hitsOf(bar, 'fole')) {
      const { row, column } = leftHand(h.hit.tone);
      assert.ok(BUTTON_ROWS.includes(row) && BASS_COLUMNS.includes(column), `bar ${bar}: no button for ${h.hit.tone}`);
      pressed.add(`${row}-${column}`);
    }
  // the tonic's bass and its fifth, the minor tonic, the three major chords and the dominant seventh
  for (const button of ['baixo-A', 'baixo-E', 'menor-A', 'maior-D', 'maior-G', 'maior-C', 'setima-E']) assert.ok(pressed.has(button), button);
  assert.deepEqual(leftHand('a:E7'), { row: 'setima', column: 'E' });
  assert.deepEqual(leftHand('b:D3'), { row: 'baixo', column: 'D' });
  for (const row of BUTTON_ROWS) assert.ok(FORRO.copy.graphics.rows[row].length > 0, row);
});

test('a key sounds for as long as its note is written, a button lights as strong as its stroke, and with reduced motion nothing fades', () => {
  const notes = [
    { from: 3.875, to: 4.25, notes: [81] }, // held over the bar line
    { from: 4.25, to: 4.375, notes: [79] },
  ];
  assert.deepEqual(
    [3.8, 3.875, 4.1, 4.25, 4.3, 4.375].map(position => soundingAt(notes, position).flatMap(note => note.notes)),
    [[], [81], [81], [79], [79], []],
  );
  assert.equal(pressLight(0, 1, false), 1);
  assert.equal(pressLight(0.9, 0.45, false), 0.45); // a faint stroke of the jogo de fole
  assert.ok(Math.abs(pressLight(1.5, 1, false) - 0.5) < 1e-9); // fading
  assert.equal(pressLight(2, 1, false), 0);
  assert.equal(pressLight(-0.1, 1, false), 0); // a stroke still to come
  assert.equal(pressLight(0.9, 0.45, true), 1); // lit whole, however faint the stroke
  assert.equal(pressLight(1, 1, true), 0);
});

// Found while every background was read for #63: the forró's never read the viewer's motion setting,
// so its bellows and its flags moved for a viewer who asked for reduced motion.
test('with reduced motion the background holds still: the bellows rest and no flag or spark flies', () => {
  const FPS = 30,
    BAR = 40, // a bar of the Rabeca scene, far from a scene change
    geometry = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: 120, dpr: 1 };
  /** What each frame of the bar draws: every path point, arc and gradient. */
  const framesOf = () => {
    const layer = FORRO.background.create({}),
      frames = [];
    const record =
      name =>
      (...shape) => {
        frames.at(-1).push([name, ...shape]);
      };
    const ctx = new Proxy(
      {},
      {
        get: (_target, key) =>
          key.startsWith('create')
            ? (...shape) => {
                record(key)(...shape);
                return { addColorStop: record('stop') };
              }
            : record(key),
        set: () => true,
      },
    );
    for (let frame = 0; frame < meterOf(FORRO).barSeconds * FPS; frame++) {
      const position = BAR + frame / FPS / meterOf(FORRO).barSeconds,
        recent = show.recentHits(position, 1.2);
      frames.push([]);
      layer.draw(ctx, { ...geometry, position, totalBars: BAR + 1, recent, energy: show.energyOf(recent), flow: show.flowAt(position) }); // `totalBars`: the dusk's slow change, held for the bar
    }
    return frames;
  };
  const motion = { matches: false };
  const saved = globalThis.matchMedia;
  globalThis.matchMedia = () => motion;
  try {
    const moving = framesOf();
    assert.ok(
      moving.some(frame => JSON.stringify(frame) !== JSON.stringify(moving[0])),
      'with motion the bellows breathe',
    );
    motion.matches = true;
    const still = framesOf().map(frame => frame.filter(([name]) => name !== 'createRadialGradient' && name !== 'stop')); // but the sky, which dims over the whole show
    assert.ok(still.length > 1);
    for (const frame of still) assert.deepEqual(frame, still[0], 'every frame draws the same picture');
  } finally {
    motion.matches = false;
    globalThis.matchMedia = saved;
  }
});
