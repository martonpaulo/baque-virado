import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPlayer, DEFAULT_CHOICES, SOUND_CHOICES } from '../src/audio.js';
import { BAR_SECONDS } from '../src/music.js';

// A fake audio context: enough of the Web Audio API for the player, with a clock the test moves.
function installFakeAudio() {
  const contexts = [];
  const node = () => ({ connect: next => next || node(), disconnect() {}, gain: { value: 1, setTargetAtTime() {} } });
  class FakeContext {
    constructor() {
      this.currentTime = 0;
      this.outputLatency = 0;
      this.state = 'running';
      this.destination = node();
      contexts.push(this);
    }
    createGain = node;
    createDynamicsCompressor = () => ({ ...node(), threshold: {}, ratio: {}, attack: {}, release: {} });
    createWaveShaper = node;
    played = []; // [sample name, start time] of every source started
    createBufferSource = () => {
      const source = { ...node(), buffer: null, playbackRate: {}, start: time => this.played.push([source.buffer.name, time]) };
      return source;
    };
    async resume() {
      this.state = 'running';
    }
    async suspend() {
      this.state = 'suspended';
    }
    close() {}
  }
  globalThis.window = { AudioContext: FakeContext };
  return contexts;
}

const instantBank = { load: async () => ({}) };
// Like the real bank: one buffer map per context, filled as more names are loaded.
const namedBank = () => {
  const maps = new WeakMap();
  return {
    load: async (context, names) => {
      if (!maps.has(context)) maps.set(context, {});
      for (const name of names) maps.get(context)[name] = { name };
      return maps.get(context);
    },
  };
};
const slowBank = { load: () => new Promise(done => setTimeout(() => done({}), 20)) };

test('two overlapping prepares open one audio context', async () => {
  const contexts = installFakeAudio();
  const player = createPlayer(slowBank, { ...DEFAULT_CHOICES });
  await Promise.all([player.prepare(), player.prepare()]);
  assert.equal(contexts.length, 1);
});

test('the position never reads before the bar playback started at', async () => {
  const contexts = installFakeAudio();
  const player = createPlayer(instantBank, { ...DEFAULT_CHOICES });
  await player.prepare();
  player.start(33);
  contexts[0].currentTime = 0.05; // inside the start delay
  assert.equal(player.position(), 33);
  player.stop();
});

test('a stop followed at once by a start does not leave the context asleep', async () => {
  const contexts = installFakeAudio();
  const player = createPlayer(instantBank, { ...DEFAULT_CHOICES });
  await player.prepare();
  player.start(0);
  player.stop();
  await player.prepare();
  player.start(4);
  await new Promise(done => setTimeout(done, 450)); // past the stop's release
  assert.equal(contexts[0].state, 'running');
  player.stop();
  await new Promise(done => setTimeout(done, 450));
  assert.equal(contexts[0].state, 'suspended'); // paused for good: the audio thread sleeps
});

test('starting again replaces the scheduler instead of adding one', async () => {
  installFakeAudio();
  const intervals = new Set();
  const realSet = globalThis.setInterval,
    realClear = globalThis.clearInterval;
  globalThis.setInterval = (fn, ms) => {
    const id = realSet(fn, ms);
    intervals.add(id);
    return id;
  };
  globalThis.clearInterval = id => {
    intervals.delete(id);
    realClear(id);
  };
  try {
    const player = createPlayer(instantBank, { ...DEFAULT_CHOICES });
    await player.prepare();
    player.start(0);
    player.start(2);
    assert.equal(intervals.size, 1);
    player.stop();
    assert.equal(intervals.size, 0);
  } finally {
    globalThis.setInterval = realSet;
    globalThis.clearInterval = realClear;
  }
});

// #5, and the owner on 2026-11-16: a pick while paused plays one and a half cycles of its instrument alone,
// with the picked sound; the show does not start.
test('a preview plays one and a half cycles of the picked instrument without starting the show', async () => {
  const contexts = installFakeAudio();
  const choice = { ...DEFAULT_CHOICES };
  const player = createPlayer(namedBank(), choice);
  const sound = id => SOUND_CHOICES.find(s => s.id === id);
  await player.preview({ ...choice, agogo: 'big-bell' }, sound('agogo').preview);
  assert.equal(player.playing, false);
  const played = contexts[0].played;
  assert.ok(played.length > 0 && played.every(([name]) => name === 'agogo-big-bell'), 'only the picked agogô');
  const times = played.map(([, time]) => time);
  const span = Math.max(...times) - Math.min(...times);
  assert.ok(span > BAR_SECONDS && span < 1.5 * BAR_SECONDS, 'it spans one and a half cycles');
});

test('a preview right after a pause is not silenced by the pause', async () => {
  const contexts = installFakeAudio();
  const player = createPlayer(namedBank(), { ...DEFAULT_CHOICES });
  await player.prepare();
  player.start(0);
  player.stop();
  await player.preview({ ...DEFAULT_CHOICES }, ['ganza']);
  await new Promise(done => setTimeout(done, 450)); // past the pause's release
  assert.equal(contexts[0].state, 'running');
});

test('a preview whose samples fail to load rejects and plays nothing', async () => {
  const contexts = installFakeAudio();
  const failing = { load: async () => Promise.reject(new Error('offline')) };
  const player = createPlayer(failing, { ...DEFAULT_CHOICES });
  await assert.rejects(player.preview({ ...DEFAULT_CHOICES }, ['ganza']));
  assert.ok(contexts.every(context => context.played.length === 0));
});

// 2026-11-16, owner: each instrument has a volume; mute plays nothing of it.
test('a muted instrument plays no hit, and the others still play', async () => {
  const contexts = installFakeAudio();
  const choice = { ...DEFAULT_CHOICES };
  const player = createPlayer(namedBank(), choice, { agogo: 'mute' });
  const sound = id => SOUND_CHOICES.find(s => s.id === id);
  await player.preview(choice, sound('agogo').preview);
  await player.preview(choice, sound('caixa').preview);
  assert.ok(contexts[0].played.length > 0);
  assert.ok(contexts[0].played.every(([name]) => name === `caixa-${choice.caixa}`));
});
