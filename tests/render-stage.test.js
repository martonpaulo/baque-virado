// tools/render-stage.mjs: what a command line asks for, and that each file it writes has the name
// Workbench's landing script reads as a render of an interface change (#60). No browser here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RHYTHMS } from '../src/rhythms/index.js';
import { createShow } from '../src/show.js';
import { fileName, parseArguments, SIZES, shotsOf } from '../tools/render-stage.mjs';

// The landing script's own pattern (Workbench, `render_evidence.py`): `<anything>-<light|dark>-<small|default|large>.png`.
const EVIDENCE_NAME = /^.+-(light|dark)-(small|default|large)\.png$/;
const MARACATU = RHYTHMS.find(rhythm => rhythm.id === 'maracatu');

test('the three sizes are a phone, a desktop and a large desktop', () => {
  assert.deepEqual(
    Object.entries(SIZES).map(([size, { width, height }]) => [size, width, height]),
    [
      ['small', 375, 667],
      ['default', 1440, 900],
      ['large', 1920, 1200],
    ],
  );
});

test('a show alone asks for each of its scenes, half a bar in', () => {
  const { SCENES } = createShow(MARACATU),
    shots = shotsOf('maracatu');
  assert.deepEqual(
    shots,
    SCENES.map(scene => ({ show: 'maracatu', name: scene.id, at: scene.start + 0.5, still: false })),
  );
});

test('a scene, bars into it, and reduced motion are read from one word', () => {
  const { SCENES } = createShow(MARACATU),
    swing = SCENES.find(scene => scene.id === 'swing');
  assert.deepEqual(shotsOf('maracatu:swing'), [{ show: 'maracatu', name: 'swing', at: swing.start + 0.5, still: false }]);
  assert.deepEqual(shotsOf('maracatu:swing+2'), [{ show: 'maracatu', name: 'swing+2', at: swing.start + 2, still: false }]);
  assert.deepEqual(shotsOf('maracatu:swing+-0.1!'), [{ show: 'maracatu', name: 'swing+-0.1', at: swing.start - 0.1, still: true }]);
});

test('a word that names no show, no scene or no number of bars is refused with what it could be', () => {
  assert.throws(() => shotsOf('samba'), /no show «samba»: one of maracatu/);
  assert.throws(() => shotsOf('maracatu:refrao'), /the maracatu has no scene «refrao»: one of opening/);
  assert.throws(() => shotsOf('maracatu:swing+two'), /«two» is not a number of bars/);
  assert.throws(() => shotsOf('maracatu:swing+'), /«» is not a number of bars/);
});

test('the command line gives the folder and the shots: every show where it names none', () => {
  assert.deepEqual(parseArguments(['--out', 'renders', 'maracatu:swing']), { out: 'renders', shots: shotsOf('maracatu:swing') });
  const all = parseArguments([]);
  assert.equal(all.out, null);
  assert.deepEqual(
    all.shots,
    RHYTHMS.flatMap(rhythm => shotsOf(rhythm.id)),
  );
  assert.throws(() => parseArguments(['--out']), /--out needs a folder/);
  assert.throws(() => parseArguments(['--out', '--size']), /--out needs a folder/);
  assert.throws(() => parseArguments(['--size', '375']), /no option «--size»/);
});

test('every file it writes has the name the landing script reads, dark, at each size, and no two share one', () => {
  const shots = [...parseArguments([]).shots, ...shotsOf('maracatu:swing+2'), ...shotsOf('maracatu:swing+-0.1!'), ...shotsOf('maracatu:swing!')],
    names = Object.keys(SIZES).flatMap(size => shots.map(shot => fileName(shot, size)));
  for (const name of names) assert.match(name, EVIDENCE_NAME);
  assert.ok(names.every(name => name.includes('-dark-')));
  assert.equal(new Set(names).size, names.length);
  assert.equal(fileName(shotsOf('maracatu:swing!')[0], 'small'), 'maracatu-swing-still-dark-small.png');
});
