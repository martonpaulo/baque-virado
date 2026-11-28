import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keyVoices, nameLines, rowLines } from '../src/lanes.js';
import { VOICES } from '../src/music.js';
import { RHYTHMS } from '../src/rhythms/index.js';
import { barTimeline, sceneAt, TOTAL_BARS } from '../src/show.js';

// #12: every dot colour the wheel draws is named on the stage, by a lane row or by the key.
test('every voice the wheel draws is a lane row or in the key, never both', () => {
  const unnamed = [];
  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const rows = sceneAt(bar).lanes,
      key = keyVoices(bar);
    const drawn = Object.entries(barTimeline(bar).voices)
      .filter(([voice, hits]) => VOICES[voice].ring && hits.length > 0)
      .map(([voice]) => voice);
    for (const voice of drawn) if (!rows.includes(voice) && !key.includes(voice)) unnamed.push(`${bar}: ${voice}`);
    assert.deepEqual(
      key.filter(voice => rows.includes(voice)),
      [],
    );
  }
  assert.deepEqual(unnamed, []);
});

// #65: a hand's name was two lines at a third of its row's height, 5 px in the maracatu's seven rows.
// The names are drawn at the stage's label size, and the instrument is written over the hand only
// where the row holds the two lines.
test('a hand is named on two lines only where its row holds them at the label size', () => {
  const LABEL = 10,
    TWO_LINES = 20; // the instrument's line half a size over the row's middle, the hand's half a size under it, and a line's own height
  assert.equal(rowLines(TWO_LINES, LABEL), 2);
  assert.equal(rowLines(TWO_LINES - 0.1, LABEL), 1, 'a row a little too short takes one line');
  assert.equal(rowLines(40, LABEL), 2);
  assert.equal(rowLines(12, LABEL), 1, 'seven rows of a phone');
  assert.equal(rowLines(0, LABEL), 1, 'a row with no height never takes two');
  const narrow = text => text.length <= 13; // a name column thirteen letters wide
  assert.deepEqual(nameLines({ name: 'PRINCIPAL', instrument: 'ALFAIA', lines: 2, fits: narrow }), ['ALFAIA', 'PRINCIPAL']);
  assert.deepEqual(
    nameLines({ name: 'PRINCIPAL', instrument: 'ALFAIA', oneLine: 'ALFAIA PRINC.', lines: 1, fits: narrow }),
    ['ALFAIA PRINC.'],
    'one line keeps the instrument, in its package’s short form',
  );
  assert.deepEqual(
    nameLines({ name: 'PRINCIPAL', instrument: 'ALFAIA', oneLine: 'ALFAIA PRINC.', lines: 2, fits: narrow }),
    ['ALFAIA', 'PRINCIPAL'],
    'the short form is for a row of one line only',
  );
  assert.deepEqual(
    nameLines({ name: 'PRINCIPAL', instrument: 'ALFAIA', lines: 1, fits: narrow }),
    ['PRINCIPAL'],
    'a package with no short form: the hand alone',
  );
});

// #65: on one line the maracatu's hands read «PRINCIPAL» and «RESPOSTA» in the Orquestra and «ALFAIA»
// over each in every other scene: one show named the same voices two ways.
test('a one-line name is written for a hand, holds its instrument’s name, and no hand of that show lacks one', () => {
  const written = RHYTHMS.filter(rhythm => rhythm.copy.handsOnOneLine);
  assert.ok(
    written.some(rhythm => rhythm.id === 'maracatu'),
    'the maracatu writes them: its Orquestra has seven rows',
  );
  for (const { id, voices, copy } of written)
    for (const [voice, name] of Object.entries(copy.handsOnOneLine)) {
      assert.ok(voices[voice]?.hand, `${id}: «${voice}» is a hand`);
      assert.ok(name.includes(copy.instruments[voices[voice].instrument]), `${id}: «${name}» names the instrument of «${voice}»`);
    }
  // every hand of a package that writes one has one: no row of that show falls back to the hand alone
  for (const { id, voices, copy } of written)
    assert.deepEqual(
      Object.keys(voices).filter(voice => voices[voice].hand && !copy.handsOnOneLine[voice]),
      [],
      `${id}: a hand with no one-line name`,
    );
});

// #65: at the label size «GUITARRA COM ECO», the manguebeat's longest name, ran 12 px into the plot.
test('a name wider than its column breaks at the space nearest its middle, where the row holds two lines', () => {
  const narrow = text => text.length <= 13;
  assert.deepEqual(nameLines({ name: 'GUITARRA COM ECO', instrument: null, lines: 2, fits: narrow }), ['GUITARRA', 'COM ECO']);
  assert.deepEqual(nameLines({ name: 'GUITARRA COM ECO', instrument: null, lines: 1, fits: narrow }), ['GUITARRA COM ECO'], 'a short row keeps one line');
  assert.deepEqual(nameLines({ name: 'MÃO PRINCIPAL', instrument: null, lines: 2, fits: narrow }), ['MÃO PRINCIPAL'], 'a name that fits stays whole');
  assert.deepEqual(nameLines({ name: 'TRIÂNGULO-DE-FERRO', instrument: null, lines: 2, fits: narrow }), ['TRIÂNGULO-DE-FERRO'], 'no space, no break');
  assert.deepEqual(nameLines({ name: 'A BB CCCCCCCCCCCC', instrument: null, lines: 2, fits: narrow }), ['A BB', 'CCCCCCCCCCCC']);
});
