// Markup pieces of the readout under the wheel, shared by the engine and every rhythm's layouts.

// `data-inst` names the instrument a part shows, so a muted instrument's parts show disabled
const inst = id => (id ? ` data-inst="${id}"` : '');
export const label = (text, color, id) => `<span class="k"${inst(id)}${color ? ` style="color:${color}"` : ''}>${text}</span>`;
export const row = (left, right, id) => `<div class="row"${inst(id)}>${left}<span>${right}</span></div>`;
export const stat = (value, text, color) => `<div><b style="color:${color}">${value}</b>${label(text)}</div>`;
export const stats = (modifier, ...cells) => `<div class="stats ${modifier}">${cells.join('')}</div>`;

// ---------- rows of strokes (#73) ----------
// One builder and one layout for every show (styles.css `.strokes`); the maracatu keeps its own
// approved rows. A mark is a kind below; the glyphs and their order in the legend live here, and the
// legend's words in `COPY.marks` (src/copy.js), which the engine fills in (`fillLegends`): a
// package cannot import the copy.
export const MARKS = { strong: '●', soft: '○', roll: '≈', echo: '◌', rest: '·', beat: '|' };

/** A bar of `steps` marks: `kind` at each step of `at`, a rest elsewhere. Later calls can overlay: `{ ...bar, [step]: kind }`. */
export const marksAt = (steps, at, kind = 'strong') => Array.from({ length: steps }, (_, step) => (at.includes(step) ? kind : 'rest'));

const cell = (kind, color) => `<i${kind === 'beat' || kind === 'rest' ? ` class="${kind}"` : ''}${color ? ` style="color:${color}"` : ''}>${MARKS[kind]}</i>`;

/**
 * One block of rows of strokes, with its legend. `rows`: `{ name, marks, color, inst, count }`, where
 * `marks` holds one entry a step: a kind of MARKS, or `{ kind, color }` for a mark in a colour of its
 * own. A line stands between beats of `stepsPerBeat` steps. `heading` names the whole block, for
 * rows that are the bars of one cell. Every row needs a name: a row with none is refused.
 */
export function notation(stepsPerBeat, rows, heading = '') {
  const used = new Set();
  const lines = rows.map(({ name, marks, color, inst: id, count = '' }) => {
    if (!name) throw new Error('a row of strokes needs a name');
    const cells = marks.map((mark, step) => {
      const { kind, color: own } = typeof mark === 'string' ? { kind: mark } : mark;
      if (!Object.hasOwn(MARKS, kind) || kind === 'beat') throw new Error(`«${name}»: ${kind} is not a mark`);
      used.add(kind);
      const beat = step % stepsPerBeat === stepsPerBeat - 1 && step < marks.length - 1;
      if (beat) used.add('beat');
      return cell(kind, own) + (beat ? cell('beat') : '');
    });
    return `${label(name, color, id)}<span class="seq"${inst(id)}${color ? ` style="color:${color}"` : ''}>${cells.join('')}</span><span class="n"${inst(id)}>${count}</span>`;
  });
  const legend = Object.keys(MARKS)
    .filter(kind => used.has(kind))
    .map(kind => `<span data-mark="${kind}">${MARKS[kind]}</span>`);
  return `<div class="strokes">${heading ? `<span class="k heading">${heading}</span>` : ''}${lines.join('')}<p class="legend">${legend.join(' ')}</p></div>`;
}

/** Write each legend's words beside its marks, in `element`: `words` maps a kind of MARKS to its word. */
export function fillLegends(element, words) {
  for (const item of element.querySelectorAll('.legend [data-mark]')) item.textContent = `${MARKS[item.dataset.mark]}\u00a0${words[item.dataset.mark]}`;
}
