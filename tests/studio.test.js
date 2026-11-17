import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { RHYTHMS } from '../src/rhythms/index.js';
import { createShow } from '../src/show.js';
import { createStudioMix, pink, planStudio, ROLES } from '../src/studio.js';
import { installRecordingContext, namedBank } from './support/recording-context.js';

// Every rhythm with a studio (src/studio.js), planned with its default choices.
const STUDIO_RHYTHMS = RHYTHMS.filter(rhythm => rhythm.sounds.studio);
const defaults = rhythm => Object.fromEntries(rhythm.sounds.choices.map(choice => [choice.id, choice.defaultOption]));
const planOf = rhythm => planStudio(rhythm, createShow(rhythm), defaults(rhythm));
const soundPath = (name, extension) => fileURLToPath(new URL(`../sounds/${name}${extension}`, import.meta.url));
const events = plan => [...plan.entries()].sort(([a], [b]) => a - b).flatMap(([step, list]) => list.map(event => ({ step, ...event })));
const MAX_RATE = 1.7; // a take is never retuned by more than nine semitones (only an 808 sub goes past eight)
const MAX_OFFSET = 0.04; // seconds: no hit drifts more than this off its swung place

test('the maracatu has no studio: its sound path is the one it always had', () => {
  assert.equal(RHYTHMS[0].id, 'maracatu');
  assert.equal(RHYTHMS[0].sounds.studio, undefined);
  assert.ok(STUDIO_RHYTHMS.length >= 3);
});

test('the same show position plans the same audio every time', () => {
  for (const rhythm of STUDIO_RHYTHMS) assert.deepEqual(events(planOf(rhythm)), events(planOf(rhythm)), rhythm.id);
});

test('every planned take exists, is retuned sanely and sits near its place', () => {
  for (const rhythm of STUDIO_RHYTHMS) {
    const files = new Set(rhythm.sounds.choices.flatMap(choice => choice.files(choice.defaultOption)));
    for (const event of events(planOf(rhythm))) {
      assert.ok(event.gain > 0 && event.gain < 2, `${rhythm.id} ${event.voice} gain ${event.gain}`);
      assert.ok(Math.abs(event.offset) < MAX_OFFSET + 0.5, `${rhythm.id} ${event.voice} offset ${event.offset}`);
      for (const source of event.sources) {
        assert.ok(files.has(source.file), `${rhythm.id} ${event.voice}: ${source.file} is not in the bank`);
        assert.ok(existsSync(soundPath(source.file, '.m4a')) && existsSync(soundPath(source.file, '.wav')), source.file);
        assert.ok(source.rate > 1 / MAX_RATE && source.rate < MAX_RATE, `${rhythm.id} ${event.voice} ${source.file} rate ${source.rate}`);
      }
    }
    assert.ok(existsSync(soundPath(rhythm.sounds.studio.room, '.m4a')), `${rhythm.id} room`);
  }
});

test('a voice never plays the same take of a stroke twice in a row when the stroke has another', () => {
  for (const rhythm of STUDIO_RHYTHMS) {
    const last = {};
    for (const event of events(planOf(rhythm))) {
      const pool = new Set(rhythm.sounds.studio.voices[event.voice].strokes({})[event.stroke].map(take => take.file));
      const [first] = event.sources;
      if (pool.size > 1 && last[event.voice])
        assert.ok(!last[event.voice].includes(first.file), `${rhythm.id} ${event.voice} repeats ${first.file} at step ${event.step}`);
      last[event.voice] = event.sources.map(source => source.file);
    }
  }
});

test('humanised timing drifts with a 1/f spread near a top drummer’s, and grid voices stay on the grid', () => {
  for (const rhythm of STUDIO_RHYTHMS) {
    const byVoice = {};
    for (const event of events(planOf(rhythm))) {
      byVoice[event.voice] ??= [];
      byVoice[event.voice].push(event);
    }
    for (const [voice, list] of Object.entries(byVoice)) {
      const spec = rhythm.sounds.studio.voices[voice];
      if (spec.role === 'grid') {
        for (const event of list) assert.equal(event.offset, 0, `${rhythm.id} ${voice} leaves the grid`);
        continue;
      }
      const template = event => (spec.template?.[event.step % (rhythm.beatsPerBar * rhythm.stepsPerBeat)] ?? 0) / 1000;
      const human = list.map(event => event.offset - template(event)).filter((_, i) => list[i].offset !== undefined);
      const mean = human.reduce((a, b) => a + b, 0) / human.length;
      const spread = Math.sqrt(human.reduce((a, b) => a + (b - mean) ** 2, 0) / human.length) * 1000;
      assert.ok(spread > 2 && spread < 12, `${rhythm.id} ${voice} spreads ${spread.toFixed(1)} ms`);
    }
  }
});

test('pink noise is long-range correlated, not white', () => {
  const n = 4096,
    values = Array.from({ length: n }, (_, i) => pink(i, 7));
  const correlation = lag => {
    let sum = 0;
    for (let i = 0; i + lag < n; i++) sum += values[i] * values[i + lag];
    return sum / (n - lag);
  };
  const variance = correlation(0);
  assert.ok(variance > 0.6 && variance < 1.4, `variance ${variance}`);
  assert.ok(correlation(1) / variance > 0.5, 'neighbours are correlated');
  assert.ok(correlation(16) / variance > 0.1, 'and so are hits 16 apart');
  assert.deepEqual(pink(123, 4), pink(123, 4));
});

test('the follower roles correct less than the gap per beat, the lead the least', () => {
  assert.ok(ROLES.lead.correction <= 0.1);
  assert.ok(ROLES.follower.correction >= 0.2 && ROLES.follower.correction <= 0.25);
});

test('the mix plays every planned event of every studio show through Web Audio without error', async () => {
  const log = installRecordingContext();
  for (const rhythm of STUDIO_RHYTHMS) {
    const context = new OfflineAudioContext(2, 1, 44100);
    const files = rhythm.sounds.choices.flatMap(choice => choice.files(choice.defaultOption));
    const buffers = await namedBank.load(context, [...files, rhythm.sounds.studio.room]);
    const mix = createStudioMix(context, context.destination, buffers, rhythm.sounds.studio);
    const before = log.length;
    for (const event of events(planOf(rhythm))) mix.play(event, event.step * 0.1 + 1, 1);
    assert.ok(log.length - before > 500, `${rhythm.id} started ${log.length - before} sources`);
  }
});
