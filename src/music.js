// The meter, voices and swing of a rhythm, as the engine reads them. A rhythm package
// (src/rhythms/) holds the data; `meterOf` derives the rest, and the module's exports are the
// rhythm this page shows. Positions are steps of the bar (a sixteenth, with four steps per beat).
import { RHYTHM } from './rhythms/index.js';

/** Everything the engine derives from one rhythm's tempo, meter, voices and swing. */
export function meterOf(rhythm) {
  const beatSeconds = 60 / rhythm.bpm,
    stepsPerBeat = rhythm.stepsPerBeat,
    stepsPerBar = rhythm.beatsPerBar * stepsPerBeat,
    voiceOrder = Object.keys(rhythm.voices);
  return {
    beatSeconds,
    barSeconds: beatSeconds * rhythm.beatsPerBar,
    stepsPerBar,
    voiceOrder,
    /** How far a hit moves off the grid, in steps, when swing is on. */
    swingOffset(voice, step, swingOn) {
      const group = rhythm.voices[voice].swing;
      return swingOn && group ? rhythm.swing[group][step % stepsPerBeat] * stepsPerBeat : 0;
    },
  };
}

const METER = meterOf(RHYTHM);
export const BPM = RHYTHM.bpm;
export const BEAT_SECONDS = METER.beatSeconds;
export const BAR_SECONDS = METER.barSeconds;
export const BEATS_PER_BAR = RHYTHM.beatsPerBar;
export const STEPS_PER_BEAT = RHYTHM.stepsPerBeat;
export const STEPS_PER_BAR = METER.stepsPerBar;
export const VOICES = RHYTHM.voices;
// The order also seeds the per-hit variation of the sound: keep it stable.
export const VOICE_ORDER = METER.voiceOrder;
export const INSTRUMENTS = VOICE_ORDER.filter(voice => !VOICES[voice].calls); // every voice that is drumming
export const swingOffset = METER.swingOffset;

/** A hand of the lead drum (the alfaia's two hands): contratempo marks, the instrument named over it. */
export const isHand = voice => Boolean(VOICES[voice].hand);
export const isOffbeat = step => step % STEPS_PER_BEAT !== 0;
