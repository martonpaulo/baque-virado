// A fake OfflineAudioContext that records every sample the show starts: its name, start time,
// playback rate and level. Enough of the Web Audio API for renderShowWav, for tests in Node.
export function installRecordingContext() {
  const log = [];
  const param = () => ({
    value: 1,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    setTargetAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  });
  const node = extra => ({ connect: next => next, disconnect() {}, gain: param(), ...extra });
  class RecordingContext {
    constructor(_channels, length, sampleRate) {
      this.sampleRate = sampleRate;
      this.length = length;
      this.currentTime = 0;
      this.destination = node();
    }
    createGain = () => node();
    createDynamicsCompressor = () => node({ threshold: param(), ratio: param(), attack: param(), release: param(), knee: param() });
    createWaveShaper = () => node();
    createConvolver = () => node({ buffer: null });
    createBiquadFilter = () => node({ type: '', frequency: param(), Q: param() });
    createStereoPanner = () => node({ pan: param() });
    createOscillator = () => node({ frequency: param(), start() {}, stop() {} });
    createBufferSource() {
      const entry = { name: null, time: 0, rate: 1, level: 1 };
      const level = node();
      const source = node({
        buffer: null,
        playbackRate: param(),
        start: time => {
          entry.started = true;
          entry.name = source.buffer?.name;
          entry.time = time;
          entry.rate = source.playbackRate.value;
          entry.level = level.gain.value;
          log.push(entry);
        },
        stop() {
          // as Web Audio does: a source stopped before it starts throws
          if (!entry.started) throw new Error('cannot call stop without calling start first');
        },
        connect: next => {
          if (next?.gain) Object.assign(level, { gain: next.gain });
          return next;
        },
      });
      return source;
    }
    createBuffer = (_channels, length) => ({ length, copyToChannel() {}, getChannelData: () => new Float32Array(length), name: 'synth' });
    async startRendering() {
      const empty = new Float32Array(1);
      return { length: 1, sampleRate: this.sampleRate, getChannelData: () => empty };
    }
  }
  globalThis.OfflineAudioContext = RecordingContext;
  return log;
}

/** A bank whose buffers carry only their names. */
export const namedBank = {
  load: async (_context, names) => Object.fromEntries(names.map(name => [name, { name, duration: 1, length: 44100, sampleRate: 44100 }])),
};
