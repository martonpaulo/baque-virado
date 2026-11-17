// The timing fields of a rhythm package with a straight grid: no measured swing for any voice.

/** `bpm`, `beatsPerBar`, `stepsPerBeat` and an empty `swing`, for a rhythm package to spread. */
export const straightMeter = (bpm, beatsPerBar, stepsPerBeat) => ({ bpm, beatsPerBar, stepsPerBeat, swing: {} });
