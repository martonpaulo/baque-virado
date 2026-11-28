// What every rhythm's own graphics share (#49): the main square's units, the stage's label, and how
// strong a part is at rest, lit or disabled. A graphic is one SVG image on the element the app gives.
import { fgAlpha, MONO_FONT } from './theme.js';
import { clamp, setAttr, svgElement } from './util.js';

export const VIEW = 100; // the main square, in SVG units; everything sits inside its inscribed circle
export const LABEL_SIZE = 3; // the stage's label size in the video export (2.2cqw of a 74cqw square); the page's is larger
const LABEL_MAX = 3.9; // the largest label every graphic's names still fit their places at
const LABEL_SPACING = 0.3;
export const DECIMALS = 3; // of an opacity or a scale written into the SVG
export const OUTLINE = 0.55; // a label, and a part at rest in the foreground's colour
export const REST_LINE = 0.7; // a line or an outline at rest in an instrument's colour: 3:1 on the ground
export const REST_FILL = 0.1; // a part at rest: its colour, faint
export const LIT_FILL = 0.9;
export const DIM = 0.38; // a muted instrument's part
export const WAITING = 0.62; // a part that does not sound now: still read at 4.5:1 on the ground

/** A part's light for a stroke that sounded `age` seconds ago and rings `ring`: 1 at the stroke, 0 once it has rung; with `still` it is lit or not. */
export const lightOf = (age, ring, still) => (age < 0 || age >= ring ? 0 : still ? 1 : 1 - age / ring);

/** The fill of a part at a light from 0 (at rest) to 1 (lit), as an SVG opacity. */
export const fillAt = light => (REST_FILL + (LIT_FILL - REST_FILL) * light).toFixed(DECIMALS);

/**
 * One SVG image on `element`, named `name` for a screen reader. `label(text, x, y, parent, anchor)`
 * draws a label in capitals; `labels` holds every text at the stage's label size, a graphic's own
 * names too; `resize()` sets each to that size as the page renders it now (`labelPixels()`, which is
 * larger than the video export's).
 */
export function createGraphicImage(element, name, labelPixels) {
  element.replaceChildren();
  const svg = svgElement('svg', { viewBox: `0 0 ${VIEW} ${VIEW}`, role: 'img', 'aria-label': name }, element);
  const labels = [];
  const label = (text, x, y, parent = svg, anchor = 'middle') => {
    const element = svgElement(
      'text',
      { x, y, 'text-anchor': anchor, fill: fgAlpha(OUTLINE), 'font-family': MONO_FONT, 'font-size': LABEL_SIZE, 'letter-spacing': LABEL_SPACING },
      parent,
    );
    element.textContent = text.toUpperCase();
    labels.push(element);
    return element;
  };
  const resize = () => {
    const unit = element.clientWidth / VIEW; // CSS px per SVG unit, before any zoom of the stage
    const size = unit > 0 && labelPixels ? clamp(labelPixels() / unit, LABEL_SIZE, LABEL_MAX) : LABEL_SIZE;
    for (const text of labels) setAttr(text, 'font-size', size.toFixed(2));
  };
  return { svg, labels, label, resize };
}
