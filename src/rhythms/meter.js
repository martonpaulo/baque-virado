// The timing fields of a rhythm package with a straight grid: no measured swing for any voice.

/** `bpm`, `beatsPerBar`, `stepsPerBeat` and an empty `swing`, for a rhythm package to spread. */
export const straightMeter = (bpm, beatsPerBar, stepsPerBeat) => ({ bpm, beatsPerBar, stepsPerBeat, swing: {} });

/** Where each scene starts, in bars, and the show's length: the running sum of the scenes' bars. */
export function sceneStarts(scenes) {
  const starts = [];
  let total = 0;
  for (const scene of scenes) {
    starts.push(total);
    total += scene.bars;
  }
  return { starts, total };
}
