// The forró's own graphics, in the stage's main square (#54): the sanfona («sanfona»), the right
// hand's keyboard with each key lit for as long as its note is held and, under it, the left hand's
// buttons, one column a note and one row a kind, lit as they are pressed; and the zabumba
// («zabumba») from the side, the head the maceta plays above and the head the bacalhau plays below,
// each lit while its stroke rings. Both are functions of the show position: `update` reads the bar's
// hits from the engine's timeline and the strokes that just sounded. Nothing here has a clock of its
// own, so the video export matches playback (docs/product.md, Constraints).
import { createGraphicImage, DECIMALS, DIM, fillAt, LIT_FILL, lightOf, OUTLINE, REST_LINE, VIEW } from '../graphics.js';
import { COLORS, REDUCED_MOTION_QUERY } from '../theme.js';
import { setAttr, svgElement } from '../util.js';

export const FORRO_GRAPHICS = ['sanfona', 'zabumba']; // the ids of this show's graphics: no other show uses them

// Everything sits about 45 units from the main square's centre at most, inside its inscribed circle.
const SEMITONES_PER_OCTAVE = 12;
const BLACK_KEYS = [1, 3, 6, 8, 10]; // the pitch classes of the black keys, from dó
const SANFONA_LABEL_Y = 13.5;
// The keyboard: the white keys side by side, a black key on the line between two of them.
const KEYBOARD = { left: 19, right: 81, top: 17.5, height: 13, blackWidth: 0.6, blackHeight: 0.62, radius: 0.6, stroke: 0.3, lit: 0.6 }; // `blackWidth`, `blackHeight`: of a white key's
// The finger on a key that sounds: a dot in the foreground's colour near the key's end, so a lit key differs from one at rest by more than its red.
const FINGER = { radius: 1, fromEnd: 2.2 };
// The left hand's buttons: each row stands to the right of the one above it, as on the instrument.
// Over its four rows a column leans less than half a column, so a button stays under its own note's name.
const BUTTONS = { left: 34.7, top: 41.5, column: 8.8, row: 5.4, slant: 1.1, radius: 1.9, stroke: 0.4 };
const COLUMN_NAME_Y = 37; // the columns' notes, over the first row
const ROW_NAME_GAP = 2; // between a row's name and its first button
const ROW_NAME_BASELINE = 1; // from a row's middle down to the baseline of its name
const PRESS = { hold: 1, fade: 1 }; // sixteenths a button stays lit after its stroke and, with motion on, fades over
const BARS_BACK = 1; // a note written in the bar before may still be held: tests/forro.test.js keeps every note of the show inside it
// The zabumba from the side: two heads and the shell between them, the heads' names on its right.
const ZABUMBA_LABEL_Y = 66.5;
const DRUM = { x: 39, top: 73, bottom: 84.5, rx: 13, ry: 3.4, stroke: 0.5, shell: 0.4, nameX: 56, nameBaseline: 1 };
// A stroke of the maceta pressed into the skin lights the middle of the head alone, and for less time.
const PRESSED = { tone: 'abafada', ring: 0.14, share: 0.42 };
const OPEN_TONE = 'aberto';
const HEADS = [
  { voice: 'grave', y: DRUM.top, ring: 0.3 },
  { voice: 'bacalhau', y: DRUM.bottom, ring: 0.14 },
];

const isBlack = midi => BLACK_KEYS.includes(((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE);

/**
 * The keys of a keyboard that holds the notes `low` to `high` (MIDI numbers), from a white key to a
 * white key: each { midi, black, at }, `at` the white keys to its left, so a black key sits on the
 * line after that many.
 */
export function keysBetween(low, high) {
  const first = isBlack(low) ? low - 1 : low,
    last = isBlack(high) ? high + 1 : high,
    keys = [];
  let whites = 0;
  for (let midi = first; midi <= last; midi++) {
    const black = isBlack(midi);
    keys.push({ midi, black, at: whites });
    if (!black) whites++;
  }
  return keys;
}

/** The notes that sound at `position` (bars on the timeline), of `notes` that each sound { from, to }. */
export const soundingAt = (notes, position) => notes.filter(note => position >= note.from && position < note.to);

/**
 * A button's light `age` sixteenths after its stroke of strength `velocity`: as bright as the stroke
 * is strong for PRESS.hold, then fading over PRESS.fade; with `still` it is lit for PRESS.hold, whole,
 * and never fades.
 */
export function pressLight(age, velocity, still) {
  if (age < 0 || age >= PRESS.hold + (still ? 0 : PRESS.fade)) return 0;
  if (still) return 1;
  return velocity * (age < PRESS.hold ? 1 : 1 - (age - PRESS.hold) / PRESS.fade);
}

/**
 * The forró's graphics on `element`. `voices`: the show's voices (their colours and instruments);
 * `copy`: the rhythm's words; `stepsPerBar`; `hitsInBar(bar)`: the engine's hits of a bar of the
 * show; `rightHand(tone)`: the keys of a hit of the tune, { notes, steps }; `leftHand(tone)`: the
 * button of a hit of the left hand, { row, column }; `range`: the tune's lowest and highest note;
 * `rows`, `columns`: the left hand's rows and columns in the instrument's order, each column
 * { note, name }; `volume`: each instrument's level, so a muted part shows disabled;
 * `labelPixels()`: the stage's label size as the page renders it now, which every label matches.
 */
export function createForroGraphics(
  element,
  { voices, copy, stepsPerBar, hitsInBar, rightHand, leftHand, range, rows, columns, labelPixels, volume = {}, matchMedia = globalThis.matchMedia },
) {
  const still = matchMedia?.(REDUCED_MOTION_QUERY);
  const words = copy.graphics;
  const { svg, label, resize } = createGraphicImage(element, words.label, labelPixels);

  // ----- the sanfona: the keyboard, then the buttons -----
  label(words.sanfona, VIEW / 2, SANFONA_LABEL_Y);
  const sanfona = svgElement('g', { 'data-graphic': FORRO_GRAPHICS[0], 'data-inst': voices.sanfona.instrument }, svg);
  const layout = keysBetween(...range),
    whiteWidth = (KEYBOARD.right - KEYBOARD.left) / layout.filter(key => !key.black).length,
    keyAttributes = { rx: KEYBOARD.radius, stroke: COLORS.fg, 'stroke-width': KEYBOARD.stroke, 'stroke-opacity': OUTLINE };
  // the white keys first, so a black key is drawn over the two it stands between
  const keys = [...layout.filter(key => !key.black), ...layout.filter(key => key.black)].map(key => {
    const width = key.black ? whiteWidth * KEYBOARD.blackWidth : whiteWidth,
      rest = key.black ? { fill: COLORS.void, 'fill-opacity': 1 } : { fill: COLORS.fg, 'fill-opacity': fillAt(0) };
    const rect = svgElement(
      'rect',
      {
        'data-key': key.midi,
        x: KEYBOARD.left + key.at * whiteWidth - (key.black ? width / 2 : 0),
        y: KEYBOARD.top,
        width,
        height: key.black ? KEYBOARD.height * KEYBOARD.blackHeight : KEYBOARD.height,
        ...keyAttributes,
        ...rest,
      },
      sanfona,
    );
    return { ...key, rect, rest };
  });
  // the fingers over the keys, the black keys' too
  const fingers = new Map(
    keys.map(key => [
      key.midi,
      svgElement(
        'circle',
        {
          cx: KEYBOARD.left + key.at * whiteWidth + (key.black ? 0 : whiteWidth / 2),
          cy: KEYBOARD.top + KEYBOARD.height * (key.black ? KEYBOARD.blackHeight : 1) - FINGER.fromEnd,
          r: FINGER.radius,
          fill: COLORS.fg,
          display: 'none',
        },
        sanfona,
      ),
    ]),
  );
  const buttonX = (column, row) => BUTTONS.left + column * BUTTONS.column + row * BUTTONS.slant,
    buttonY = row => BUTTONS.top + row * BUTTONS.row;
  for (const [column, { name }] of columns.entries()) label(name, buttonX(column, 0), COLUMN_NAME_Y, sanfona);
  const buttons = rows.flatMap((row, r) => {
    label(words.rows[row], buttonX(0, r) - BUTTONS.radius - ROW_NAME_GAP, buttonY(r) + ROW_NAME_BASELINE, sanfona, 'end');
    return columns.map(({ note }, c) => ({
      id: `${row}-${note}`,
      circle: svgElement(
        'circle',
        {
          'data-button': `${row}-${note}`,
          cx: buttonX(c, r),
          cy: buttonY(r),
          r: BUTTONS.radius,
          fill: voices.fole.color,
          'fill-opacity': fillAt(0),
          stroke: voices.fole.color,
          'stroke-width': BUTTONS.stroke,
          'stroke-opacity': REST_LINE,
        },
        sanfona,
      ),
    }));
  });

  // ----- the zabumba: the shell, then its two heads -----
  label(words.zabumba, VIEW / 2, ZABUMBA_LABEL_Y);
  const zabumba = svgElement('g', { 'data-graphic': FORRO_GRAPHICS[1], 'data-inst': voices.grave.instrument }, svg);
  for (const side of [-1, 1])
    svgElement(
      'line',
      {
        x1: DRUM.x + side * DRUM.rx,
        x2: DRUM.x + side * DRUM.rx,
        y1: DRUM.top,
        y2: DRUM.bottom,
        stroke: COLORS.fg,
        'stroke-width': DRUM.shell,
        'stroke-opacity': OUTLINE,
      },
      zabumba,
    );
  const heads = HEADS.map(head => {
    const { color } = voices[head.voice],
      group = svgElement('g', { 'data-head': head.voice }, zabumba),
      skin = svgElement(
        'ellipse',
        {
          cx: DRUM.x,
          cy: head.y,
          rx: DRUM.rx,
          ry: DRUM.ry,
          fill: color,
          'fill-opacity': fillAt(0),
          stroke: color,
          'stroke-width': DRUM.stroke,
          'stroke-opacity': REST_LINE,
        },
        group,
      ),
      middle = svgElement(
        'ellipse',
        { cx: DRUM.x, cy: head.y, rx: DRUM.rx * PRESSED.share, ry: DRUM.ry * PRESSED.share, fill: color, 'fill-opacity': 0 },
        group,
      );
    label(copy.hands[head.voice], DRUM.nameX, head.y + DRUM.nameBaseline, group, 'start');
    return { ...head, group, skin, middle };
  });

  let shownBar = null,
    tune = [], // the right hand's notes that may sound in the bar shown: { from, to, notes }
    presses = []; // the left hand's strokes: { at, velocity, id }
  /** Read the hits of a bar and of the bar before, whose last note may still be held. */
  const readBar = bar => {
    shownBar = bar;
    const hits = Array.from({ length: BARS_BACK + 1 }, (_, back) => hitsInBar(bar - BARS_BACK + back)).flat();
    tune = hits
      .filter(h => h.voice === 'sanfona')
      .map(h => {
        const { notes, steps } = rightHand(h.hit.tone);
        return { from: h.at, to: h.at + steps / stepsPerBar, notes };
      });
    presses = hits
      .filter(h => h.voice === 'fole')
      .map(h => {
        const { row, column } = leftHand(h.hit.tone);
        return { at: h.at, velocity: h.hit.velocity, id: `${row}-${column}` };
      });
  };
  return {
    resize,
    /** Nothing of the graphic belongs to one scene: it only takes the stage's label size again. */
    build() {
      resize();
      shownBar = null;
    },
    /** `position`: bars on the timeline; `heard`: the strokes that just sounded, each with its `age` in seconds. */
    update(position, heard) {
      const bar = Math.floor(position);
      if (bar !== shownBar) readBar(bar);
      // the sanfona: a key is lit while its note is held, a button with its stroke
      const silent = volume[voices.sanfona.instrument] === 'mute';
      setAttr(sanfona, 'opacity', silent ? String(DIM) : '1');
      const held = new Set(silent ? [] : soundingAt(tune, position).flatMap(note => note.notes));
      for (const key of keys) {
        const lit = held.has(key.midi);
        setAttr(key.rect, 'data-lit', lit ? 'true' : 'false');
        setAttr(key.rect, 'fill', lit ? voices.sanfona.color : key.rest.fill);
        setAttr(key.rect, 'fill-opacity', lit ? LIT_FILL : key.rest['fill-opacity']);
        setAttr(key.rect, 'stroke-width', lit ? KEYBOARD.lit : KEYBOARD.stroke);
        setAttr(key.rect, 'stroke-opacity', lit ? '1' : String(OUTLINE));
        setAttr(fingers.get(key.midi), 'display', lit ? 'inline' : 'none');
      }
      const pressed = new Map(); // a button's light: its brightest stroke
      if (!silent)
        for (const press of presses) {
          const light = pressLight((position - press.at) * stepsPerBar, press.velocity, still?.matches);
          if (light > (pressed.get(press.id) ?? 0)) pressed.set(press.id, light);
        }
      for (const button of buttons) {
        const light = pressed.get(button.id) ?? 0;
        setAttr(button.circle, 'data-lit', light > 0 ? 'true' : 'false');
        setAttr(button.circle, 'fill-opacity', fillAt(light));
      }
      // the zabumba: an open stroke lights the whole head, a pressed one its middle
      const muted = volume[voices.grave.instrument] === 'mute';
      setAttr(zabumba, 'opacity', muted ? String(DIM) : '1');
      for (const head of heads) {
        // the head's newest stroke alone: a pressed one stops the ring of the open one before it
        const newest = muted ? null : heard.filter(h => h.voice === head.voice).reduce((last, h) => (last === null || h.age < last.age ? h : last), null),
          damped = newest?.hit.tone === PRESSED.tone,
          light = newest ? lightOf(newest.age, damped ? PRESSED.ring : head.ring, still?.matches) : 0;
        setAttr(head.group, 'data-lit', light > 0 ? 'true' : 'false');
        setAttr(head.group, 'data-stroke', light > 0 ? (damped ? PRESSED.tone : OPEN_TONE) : '');
        setAttr(head.skin, 'fill-opacity', fillAt(damped ? 0 : light));
        setAttr(head.middle, 'fill-opacity', (damped ? LIT_FILL * light : 0).toFixed(DECIMALS));
      }
    },
  };
}
