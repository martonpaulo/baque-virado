import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPlayer, DEFAULT_CHOICES } from '../src/audio.js';

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
    createBufferSource = () => ({ ...node(), buffer: null, playbackRate: {}, start() {} });
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
