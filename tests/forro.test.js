// The forró pé-de-serra package: the show script, the tune's rules and that every hit has a sound.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { meterOf } from '../src/music.js';
import { FORRO_PE_DE_SERRA as FORRO, FORRO_PIECES } from '../src/rhythms/forro.js';
import { createShow } from '../src/show.js';

const show = createShow(FORRO);
const { MOTIFS, PHRASE, ANSWER, MODE, midiOf, thirdBelow } = FORRO_PIECES;
const soundPath = (name, extension) => fileURLToPath(new URL(`../sounds/${name}${extension}`, import.meta.url));

test('one tempo, 2/4 on an 8-step wheel, the eleven scenes of the script, 98 bars', () => {
  assert.equal(FORRO.bpm, 120);
  assert.equal(meterOf(FORRO).stepsPerBar, 8);
  assert.deepEqual(
    show.SCENES.map(scene => [scene.id, scene.bars]),
    [
      ['triangulo', 8],
      ['zabumba', 8],
      ['bacalhau', 8],
      ['trio', 4],
      ['sanfona', 16],
      ['baixo', 8],
      ['rabeca', 16],
      ['fole', 8],
      ['baiao', 12],
      ['breque', 2],
      ['final', 8],
    ],
  );
  assert.equal(show.TOTAL_SECONDS, 98);
});

// The voice order seeds the per-hit sound variation (src/audio.js): keep it stable.
test('the voice order is pinned', () => {
  assert.deepEqual(Object.keys(FORRO.voices), ['grave', 'bacalhau', 'triangulo', 'fole', 'baixo', 'cavaquinho', 'sanfona', 'rabeca', 'bandolim']);
});

test('the parts enter one by one: the triângulo alone, then the zabumba, then the bacalhau, then the sanfona', () => {
  const firstBars = ['triangulo', 'zabumba', 'bacalhau', 'trio'].map(id => show.barTimeline(show.sceneById(id).start).playing.length);
  assert.deepEqual(firstBars, [1, 2, 3, 4]);
});

test('every hit of the show plays a sample that exists, in tune and in a sane rate', () => {
  for (const option of ['funda', 'seca']) {
    for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
      for (const { voice, hit } of show.hitsInBar(bar)) {
        const [name, gain, rate] = FORRO.sounds.sampleFor[voice]({ zabumba: option }, hit.velocity, hit.tone, 0.5);
        assert.ok(existsSync(soundPath(name, '.m4a')) && existsSync(soundPath(name, '.wav')), `${voice} in bar ${bar}: ${name}`);
        assert.ok(gain > 0 && gain <= 1.5, `${voice} gain ${gain}`);
        assert.ok(rate > 0.6 && rate < 1.6, `${voice} rate ${rate} retunes too far`);
      }
    }
  }
});

test('the melody stays in G mixolydian, with the flat seventh on a beat head of the hook', () => {
  const pitchClasses = new Set(MODE.map(name => midiOf(`${name}4`) % 12));
  for (const [id, motif] of Object.entries(MOTIFS))
    for (const bar of motif.melody) for (const [, note] of bar) assert.ok(pitchClasses.has(midiOf(note) % 12), `${id}: ${note} is outside the mode`);
  const onBeat = MOTIFS.A.melody.flat().filter(([step]) => step % 4 === 0);
  assert.ok(
    onBeat.some(([, note]) => note.startsWith('F')),
    'the hook lands the flat seventh on a beat',
  );
});

test('the hook plays three times, varied once, and comes back unchanged at the end of each phrase', () => {
  assert.deepEqual(PHRASE, ['A', 'A', 'A2', 'A']);
  assert.equal(ANSWER.at(-1), 'A');
  for (const scene of show.SCENES.filter(s => s.tune.length > 2)) assert.equal(scene.tune.at(-1), 'A', scene.id);
});

test('the bandolim doubles the melody a third below, inside the mode', () => {
  assert.deepEqual(['D5', 'C5', 'B4', 'F5', 'G5'].map(thirdBelow), ['B4', 'A4', 'G4', 'D5', 'E5']);
});

test('the breque cuts on 1 and the sanfona alone leads back; the show ends on the tonic', () => {
  const breque = show.sceneById('breque');
  const cut = show.hitsInBar(breque.start + 1);
  assert.deepEqual([...new Set(cut.filter(h => h.hit.step > 0).map(h => h.voice))], ['sanfona']);
  const last = show.hitsInBar(show.TOTAL_BARS - 1);
  assert.ok(last.every(h => h.hit.step === 0));
  assert.equal(last.find(h => h.voice === 'sanfona').hit.tone, 'G5:L');
});

// docs/research/brega-forro.md, «What makes it special»: bacalhau at 50 to 70 % of the low head,
// triângulo closed at about 60 % under the open accent. Too quiet and the signature is lost.
test('the bacalhau and the closed triângulo sit at the research levels under their accents', () => {
  const { sampleFor } = FORRO.sounds,
    choice = { zabumba: 'funda' };
  const bar = show.barTimeline(show.sceneById('bacalhau').start).voices;
  const gainOf = (voice, { hit }) => sampleFor[voice](choice, hit.velocity, hit.tone, 0.5)[1];
  const onBeat = bar.grave.find(h => h.hit.step === 0);
  const grave = gainOf('grave', onBeat),
    bacalhau = Math.max(...bar.bacalhau.map(h => gainOf('bacalhau', h)));
  assert.ok(bacalhau / grave >= 0.5 && bacalhau / grave <= 0.7, `bacalhau at ${bacalhau / grave} of the low head`);
  const triangle = bar.triangulo.map(h => [h.hit.tone, gainOf('triangulo', h)]),
    open = Math.min(...triangle.filter(([tone]) => tone === 'aberto').map(([, g]) => g));
  for (const [tone, g] of triangle) if (tone === 'fechado') assert.ok(g / open <= 0.7, `closed stroke at ${g / open} of the open one`);
});

// The key over the lanes names, on one line, each wheel voice the lanes do not show (src/lanes.js
// keyVoices); at 393 px six names fit. A voice the scene does not play draws nothing.
test('only the voices a scene plays reach the wheel, so the key fits one line', () => {
  const MAX_KEY_NAMES = 6;
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
    const { scene, playing, voices } = show.barTimeline(bar);
    for (const voice of Object.keys(voices)) if (!playing.includes(voice)) assert.deepEqual(voices[voice], [], `${voice} in bar ${bar}`);
    const named = Object.keys(voices).filter(voice => voices[voice].length && !scene.lanes.includes(voice));
    assert.ok(named.length <= MAX_KEY_NAMES, `bar ${bar}: ${named}`);
  }
});
