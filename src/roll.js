// The melody roll: a phrase drawn as pitch against time, one row of bars, so the eye sees the
// contour of a line, where it repeats and where it peaks. It keeps the score's contract with the
// readout: `slotX` holds the x of every sixteenth slot, so the readout's cursor walks it.
import { fgAlpha } from './theme.js';

const SLOT_WIDTH = 4; // SVG units per sixteenth
const PAD_Y = 3; // above the highest and below the lowest note
const ROW_HEIGHT = 1.6; // SVG units per semitone
const NOTE_HEIGHT = 2.4;
const NOTE_GAP = 0.6; // a short note stops this much before the next slot
const BAR_LINE_ALPHA = 0.35;
const BEAT_LINE_ALPHA = 0.12;
const BAND_ALPHA = 0.08;
const LINE_WIDTH = 0.4;
const FIXED = 2;
const num = value => Number(value.toFixed(FIXED));

/**
 * `bars`: the number of bars drawn. `lines`: [{ color, id, notes: [{ slot, midi, length }] }], slots
 * counted from the first bar, lengths in slots. `band`: optional { from, to } in bars, shaded.
 * Returns { markup, slotX, width }.
 */
export function renderRoll({ bars, stepsPerBar, stepsPerBeat, lines, band }) {
  const slots = bars * stepsPerBar,
    width = slots * SLOT_WIDTH;
  const all = lines.flatMap(line => line.notes.map(note => note.midi));
  const low = Math.min(...all),
    high = Math.max(...all);
  const height = (high - low) * ROW_HEIGHT + NOTE_HEIGHT + 2 * PAD_Y;
  const y = midi => PAD_Y + (high - midi) * ROW_HEIGHT;
  let body = '';
  if (band)
    body += `<rect x="${band.from * stepsPerBar * SLOT_WIDTH}" y="0" width="${(band.to - band.from) * stepsPerBar * SLOT_WIDTH}" height="${num(height)}" fill="${fgAlpha(BAND_ALPHA)}"/>`;
  for (let slot = 0; slot <= slots; slot += stepsPerBeat) {
    const alpha = slot % stepsPerBar === 0 ? BAR_LINE_ALPHA : BEAT_LINE_ALPHA;
    body += `<line x1="${slot * SLOT_WIDTH}" x2="${slot * SLOT_WIDTH}" y1="0" y2="${num(height)}" stroke="${fgAlpha(alpha)}" stroke-width="${LINE_WIDTH}"/>`;
  }
  for (const line of lines) {
    body += `<g fill="${line.color}"${line.id ? ` data-inst="${line.id}"` : ''}>`;
    for (const note of line.notes)
      body += `<rect x="${note.slot * SLOT_WIDTH}" y="${num(y(note.midi))}" width="${num(note.length * SLOT_WIDTH - NOTE_GAP)}" height="${NOTE_HEIGHT}" rx="${NOTE_HEIGHT / 2}"/>`;
    body += '</g>';
  }
  const slotX = [...Array(slots).keys()].map(slot => slot * SLOT_WIDTH);
  return {
    markup: `<svg viewBox="0 0 ${width} ${num(height)}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`,
    slotX,
    width,
  };
}

/** A scene's roll as readout markup: the roll and its cursor, and the roll itself for its owner. */
export function rollReadout(options) {
  const score = renderRoll(options);
  return { markup: `<div class="score roll">${score.markup}<i class="scur"></i></div>`, score };
}
