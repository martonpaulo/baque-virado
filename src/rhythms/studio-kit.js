// Small helpers a rhythm package uses to describe its studio instruments (src/studio.js): the
// recorded takes by group, note names, and a sound choice per instrument built from its voices.
import { TAKES } from './recorded-takes.js';

const NOTE_NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MIDI_C0 = 12;
const OCTAVE = 12;
/** MIDI number of a note name such as 'D5', 'F#2' or 'Bb3'. */
export function midiOf(name) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`not a note: ${name}`);
  return MIDI_C0 + OCTAVE * Number(match[3]) + NOTE_NAMES[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
}

/** The takes of one or more recorded groups, each optionally with its own level and rate. */
export function takes(...groups) {
  return groups.flatMap(group => {
    const [id, extra] = Array.isArray(group) ? group : [group, {}];
    if (!TAKES[id]) throw new Error(`no recorded takes for ${id}`);
    return TAKES[id].map(take => ({ ...take, ...extra }));
  });
}

/**
 * A style template: the offset (ms) of each sixteenth of the bar, the off-beat sixteenths late by
 * `fraction` of a sixteenth (a 56 % swing is 0.12), plus a fixed push of the whole voice.
 */
export const lilt = (stepsPerBar, stepMs, fraction, pushMs = 0) => [...Array(stepsPerBar).keys()].map(step => pushMs + (step % 2 ? fraction * stepMs : 0));

/** Every file the studio voices `voices` can play, for the sample bank. */
export const studioFiles = (studio, voices, choice = {}) => [
  ...new Set(voices.flatMap(voice => Object.values(studio.voices[voice].strokes(choice)).flatMap(list => list.map(take => take.file)))),
];

/** One sound choice per instrument: a single recorded option (its name), its voices previewed. */
export const recordedChoice = (studio, id, label, voices, optionLabel) => ({
  id,
  label,
  defaultOption: 'gravado',
  preview: voices,
  files: () => studioFiles(studio, voices, {}),
  options: [['gravado', optionLabel]],
});

/** Every instrument's sound choice, from rows of [id, label, voices, option label]. */
export const recordedChoices = (studio, rows) => rows.map(([id, label, voices, optionLabel]) => recordedChoice(studio, id, label, voices, optionLabel));

/** A rhythm package's `sounds`: its choices, its room and its studio; `previewScene` plays every part. */
export const studioSounds = (studio, choices, previewScene) => ({ choices, fixedFiles: [studio.room], studio, previewScene });
