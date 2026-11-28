// The frevo's own graphics, in the stage's main square (#55): the tune's score («partitura»), four
// bars a page on two staves, the note that sounds lit and a cursor at the show's place; and the
// trompete's three valves («pistos»), pressed as each note it plays asks, with the note's name.
// Both are functions of the show position: `update` reads the page's bars and the trompete's notes
// from the package. Nothing here has a clock of its own, so the video export matches playback
// (docs/product.md, Constraints).
import { createGraphicImage, DIM, fillAt, OUTLINE, REST_LINE, VIEW, WAITING } from '../graphics.js';
import { SCORE_SHAPES } from '../score.js';
import { COLORS, MONO_FONT, REDUCED_MOTION_QUERY, ROLES } from '../theme.js';
import { setAttr, svgElement } from '../util.js';

export const FREVO_GRAPHICS = ['partitura', 'pistos']; // the ids of this show's graphics: no other show uses them

// Everything sits about 42 units from the main square's centre at most, inside the ring the background's
// sombrinhas turn on: the score, the widest part, stands across the middle.
export const BARS_PER_PAGE = 4; // two staves of two bars
const BARS_PER_STAFF = 2;
const SCORE_LABEL_Y = 27;
const SPACE = 2.4; // between two lines of a staff
const STAFF_LINES = 5;
const STAFF = { left: 13, right: 87, tops: [34, 52], line: 0.35, bar: 0.4 }; // `tops`: each staff's top line
const NOTES_LEFT = 28.8; // after the clef, the key and the time signature
const BAR_GAP = 1.6; // between the last sixteenth of a bar and the first of the next
const BOTTOM_LINE = 30; // E4, as a diatonic degree (7 an octave, C0 is 0)
const MIDDLE_LINE = 34; // B4: a note on it or above has its stem down
const DEGREES_PER_OCTAVE = 7;
const HEAD = { rx: 1.3, ry: 0.92, tilt: -20, hollow: 0.42 }; // `hollow`: the outline of a half note's head
const STEM = { length: 3.3 * SPACE, width: 0.3, inset: 0.92 }; // `inset`: where the stem meets the head, of its half width
const FLAG = { scale: 0.8, narrow: 0.5, step: 1.7 }; // `narrow`: of its width, so a flag stays over its own sixteenth // of the percussion score's flag at this staff's size; from a flag along the stem to the second one
const DOT = { radius: 0.34, gap: 0.95 };
const TIE = { rise: 1.5, width: 0.3, gap: 0.5, stub: 2.2 }; // `stub`: a tie that comes from, or goes to, another staff
const LEDGER = { reach: 0.75, width: 0.3 }; // past the head on each side
const ACCIDENTAL = { gap: 0.75, width: 0.26, bar: 0.4 }; // from the head's edge to its accidental's middle; `bar`: a sharp's two thick strokes
const CLEF = { x: 16.6, scale: 0.8, width: 0.3 }; // `scale`: of the staff's space, so two staves' clefs stand clear of each other
const KEY_X = 20.6; // the first flat of the key signature
const KEY_STEP = 1.9;
const METER = { x: 25.6, size: 5.6, weight: 700 }; // the time signature's two numbers
// The flats of a key signature, in their order, where the treble clef writes them: B4, E5, A4, D5.
const FLAT_ORDER = [
  { letter: 6, degree: 34 },
  { letter: 2, degree: 37 },
  { letter: 5, degree: 33 },
  { letter: 1, degree: 36 },
];
// What a note or a rest can be written as, in sixteenths: a half, a dotted quarter, a quarter, a
// dotted eighth, an eighth and a sixteenth. A rest is never dotted here.
const NOTE_VALUES = [8, 6, 4, 3, 2, 1];
const REST_VALUES = [4, 2, 1];
const HALF = 8;
const DOTTED = [6, 3];
const ONE_FLAG = 3; // a dotted eighth or shorter has a flag
const TWO_FLAGS = 1;
// The room a piece needs before it when the piece before it is one sixteenth long, in sixteenths: an
// accidental after a flag that reaches right, an accidental or a rest in the next slot; and the room
// a flag needs before the bar line.
const ROOM = { afterFlag: 0.75, tight: 0.5, end: 0.3 };
const CURSOR = { width: 0.4, reach: 1.6 * SPACE };
// The trompete's valves: three casings, each with its button on a stem, the first nearest the mouthpiece.
const VALVES_LABEL_Y = 72.5;
const VALVES = { x: [41, 50, 59], top: 79, width: 6, height: 8, radius: 1, stroke: 0.45, up: 3, travel: 1.8, cap: { rx: 2.6, ry: 0.8 }, number: 5.4 }; // `number`: from a casing's top down to the baseline of its number
const NOTE_NAME = { x: 65, y: 84.8, size: 4.6, weight: 700 }; // the note that sounds, larger than a label
const BAND = { reach: SPACE, opacity: 0.3, radius: 0.8 }; // the light behind the note that sounds, a space past the staff on each side
// A B♭ trumpet's fingerings by written note, a semitone a step from F♯3: the valves pressed, 0 for none.
const FINGERINGS = '123 13 23 12 1 2 0 123 13 23 12 1 2 0 23 12 1 2 0 12 1 2 0 1 2 0 23 12 1 2 0 12 1 2 0 1 2 0'.split(' ');
const LOWEST_WRITTEN = 54; // F♯3
const TRANSPOSITION = 2; // a B♭ trumpet sounds a tone under its written note
const SHAPE = SCORE_SHAPES.space; // the percussion score's staff space: its shapes are scaled to this staff's
const INK = 'currentColor';

/** The valves a B♭ trumpet presses for the sounding note `midi`: [1, 3], [] for an open note, or null out of its range. */
export function valvesFor(midi) {
  const pressed = FINGERINGS[midi + TRANSPOSITION - LOWEST_WRITTEN];
  return pressed === undefined ? null : [...pressed].map(Number).filter(valve => valve > 0);
}

/** A length in sixteenths as the values it is written with, longest first: 5 is a quarter and a sixteenth. */
export function spell(steps, values = NOTE_VALUES) {
  const out = [];
  let left = steps;
  for (const value of values)
    while (left >= value) {
      out.push(value);
      left -= value;
    }
  return out;
}

/** Does a piece's flag reach to its right, into the next sixteenth? An up-stem's does. */
const flagsRight = piece => !piece.rest && piece.steps <= ONE_FLAG && piece.degree < MIDDLE_LINE;

/**
 * A bar's pieces with the accidental each note shows (`accidental`: -1, 0, 1 or null): where its
 * alter differs from the key (`flatLetters`: the letters the key flattens, 0 for C to 6 for B) or
 * from the same note earlier in the bar. A note tied from the one before shows none.
 */
export function withAccidentals(pieces, flatLetters) {
  const state = new Map(); // the alter written so far in this bar, by degree
  return pieces.map(piece => {
    if (piece.rest) return piece;
    const letter = ((piece.degree % DEGREES_PER_OCTAVE) + DEGREES_PER_OCTAVE) % DEGREES_PER_OCTAVE,
      current = state.get(piece.degree) ?? (flatLetters.includes(letter) ? -1 : 0);
    state.set(piece.degree, piece.alter);
    return { ...piece, accidental: !piece.tiedFrom && piece.alter !== current ? piece.alter : null };
  });
}

/**
 * Where each sixteenth of a bar stands, as shares of the bar's width: `middles[step]`, the middle of
 * that sixteenth, for 0 to `stepsPerBar` (the last is the sixteenth after the bar). A sixteenth is
 * wider by the room the piece on it needs before it (ROOM), so no sign stands on its neighbour.
 */
export function barLayout(pieces, stepsPerBar) {
  const before = pieces.map((piece, i) => {
    const previous = pieces[i - 1];
    if (!previous || previous.steps > 1) return 0;
    if (!piece.rest && piece.accidental !== null) return flagsRight(previous) ? ROOM.afterFlag : ROOM.tight;
    return flagsRight(previous) && piece.rest ? ROOM.tight : 0;
  });
  const end = pieces.length > 0 && flagsRight(pieces.at(-1)) ? ROOM.end : 0,
    total = stepsPerBar + before.reduce((sum, room) => sum + room, 0) + end,
    middles = [];
  let room = 0;
  for (let step = 0; step <= stepsPerBar; step++) {
    const index = pieces.findIndex(piece => piece.step === step);
    if (index >= 0) room += before[index];
    middles.push((step + room + 1 / 2) / total);
  }
  return middles;
}

/**
 * A bar as it is written, from the notes that sound in it (each { step, steps, degree, alter }, `step`
 * negative for a note held from the bar before): its pieces in order, notes and rests, each
 * { step, steps, rest } and, for a note, its degree and alter, `tiedFrom` and `tiedTo` (a tie to the
 * piece before or after, in another bar too) and `sounds`, the sixteenths [from, to) of the whole
 * written note, by which all its pieces light together. A bar with no note is one rest of the whole bar.
 */
export function barPieces(notes, stepsPerBar) {
  const pieces = [];
  let at = 0;
  const rest = until => {
    if (until <= at) return;
    const values = at === 0 && until === stepsPerBar ? [stepsPerBar] : spell(until - at, REST_VALUES);
    for (const steps of values) {
      pieces.push({ step: at, steps, rest: true });
      at += steps;
    }
  };
  for (const note of [...notes].sort((a, b) => a.step - b.step)) {
    const from = Math.max(0, note.step),
      to = Math.min(stepsPerBar, note.step + note.steps);
    if (to <= from) continue;
    rest(from);
    const values = spell(to - from);
    values.forEach((steps, i) => {
      pieces.push({
        step: at,
        steps,
        rest: false,
        degree: note.degree,
        alter: note.alter,
        tiedFrom: i > 0 || note.step < 0,
        tiedTo: i < values.length - 1 || note.step + note.steps > stepsPerBar,
        sounds: [note.step, note.step + note.steps],
      });
      at += steps;
    });
  }
  rest(stepsPerBar);
  return pieces;
}

/**
 * The frevo's graphics on `element`. `voices`: the show's voices (their colours and instruments);
 * `copy`: the rhythm's words; `stepsPerBar`; `beatsPerBar`; `tuneIn(bar)`: the tune's notes that
 * sound in a bar of the show, each { step, steps, degree, alter }; `trumpetIn(bar)`: the trompete's,
 * each { step, steps, midi, pitch }; `flats`: how many the key signature has; `volume`: each
 * instrument's level, so a muted part shows disabled; `labelPixels()`: the stage's label size as the
 * page renders it now, which every label matches.
 */
export function createFrevoGraphics(
  element,
  { voices, copy, stepsPerBar, beatsPerBar, tuneIn, trumpetIn, flats, labelPixels, volume = {}, matchMedia = globalThis.matchMedia },
) {
  const still = matchMedia?.(REDUCED_MOTION_QUERY);
  const words = copy.graphics;
  const { svg, label, resize } = createGraphicImage(element, words.label, labelPixels);
  const signature = FLAT_ORDER.slice(0, flats);
  const barWidth = (STAFF.right - NOTES_LEFT - BAR_GAP) / BARS_PER_STAFF,
    slot = barWidth / stepsPerBar,
    barLeft = inStaff => NOTES_LEFT + inStaff * (barWidth + BAR_GAP),
    bottomOf = staff => STAFF.tops[staff] + (STAFF_LINES - 1) * SPACE,
    yOf = (staff, degree) => bottomOf(staff) - ((degree - BOTTOM_LINE) * SPACE) / 2;
  const line = (x1, y1, x2, y2, width, parent, attributes = {}) =>
    svgElement('line', { x1, y1, x2, y2, stroke: INK, 'stroke-width': width, 'stroke-linecap': 'round', ...attributes }, parent);
  const path = (d, width, parent) =>
    svgElement('path', { d, fill: 'none', stroke: INK, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
  /** A shape of the percussion score's own (src/score.js), drawn at (x, y) at this staff's size; `flip` turns it upside down. */
  const shape = (markup, x, y, parent, { flip = false, scale = 1, narrow = 1, mark = '' } = {}) => {
    const k = (scale * SPACE) / SHAPE,
      group = svgElement(
        'g',
        { 'data-mark': mark, transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k * narrow} ${flip ? -k : k}) translate(0 ${-SCORE_SHAPES.line})` },
        parent,
      );
    group.innerHTML = markup;
    return group;
  };
  /** A point in staff spaces from (x, y), as path data. */
  const at = (x, y) => (dx, dy) => `${(x + dx * SPACE).toFixed(2)} ${(y + dy * SPACE).toFixed(2)}`;
  const flat = (x, y, parent) => {
    const p = at(x, y);
    path(`M${p(-0.3, -1.7)} L${p(-0.3, 0.55)} C${p(0.5, 0.1)} ${p(0.75, -0.75)} ${p(-0.3, -0.35)}`, ACCIDENTAL.width, parent);
  };
  const sharp = (x, y, parent) => {
    const p = at(x, y);
    path(`M${p(-0.18, -1.1)} L${p(-0.18, 1.2)} M${p(0.18, -1.2)} L${p(0.18, 1.1)}`, ACCIDENTAL.width, parent);
    path(`M${p(-0.45, -0.3)} L${p(0.45, -0.55)} M${p(-0.45, 0.55)} L${p(0.45, 0.3)}`, ACCIDENTAL.bar, parent);
  };
  const natural = (x, y, parent) => {
    const p = at(x, y);
    path(`M${p(-0.25, -1.4)} L${p(-0.25, 0.6)} L${p(0.25, 0.4)} L${p(0.25, 1.4)} M${p(0.25, -0.6)} L${p(-0.25, -0.4)}`, ACCIDENTAL.width, parent);
  };
  const ACCIDENTALS = { '-1': flat, 0: natural, 1: sharp };

  // ----- the score: two staves, each with its clef and key, the first with the time signature -----
  label(words.score, VIEW / 2, SCORE_LABEL_Y);
  const score = svgElement('g', { 'data-graphic': FREVO_GRAPHICS[0], 'data-inst': voices.sax.instrument }, svg);
  const frame = svgElement('g', { color: COLORS.fg, opacity: REST_LINE }, score);
  STAFF.tops.forEach((top, staff) => {
    for (let i = 0; i < STAFF_LINES; i++) line(STAFF.left, top + i * SPACE, STAFF.right, top + i * SPACE, STAFF.line, frame, { 'stroke-linecap': 'butt' });
    for (const x of [STAFF.left, barLeft(1) - BAR_GAP / 2, STAFF.right]) line(x, top, x, bottomOf(staff), STAFF.bar, frame, { 'stroke-linecap': 'butt' });
    // the treble clef, a line that curls around the G line, the second from the bottom
    const point = at(CLEF.x, bottomOf(staff) - SPACE),
      g = (dx, dy) => point(dx * CLEF.scale, dy * CLEF.scale);
    path(
      `M${g(-0.55, 2.55)} C${g(-0.6, 3.3)} ${g(0.5, 3.3)} ${g(0.35, 2.3)} L${g(-0.2, -3.6)} C${g(-0.3, -4.7)} ${g(0.65, -5.3)} ${g(0.7, -4)} C${g(0.75, -2.9)} ${g(-1.15, -1.7)} ${g(-1.15, 0.05)} C${g(-1.15, 1.35)} ${g(1.0, 1.4)} ${g(1.0, 0.15)} C${g(1.0, -0.95)} ${g(-0.5, -0.95)} ${g(-0.5, 0.05)} C${g(-0.5, 0.5)} ${g(-0.1, 0.65)} ${g(0.15, 0.5)}`,
      CLEF.width,
      frame,
    );
    for (const [i, { degree }] of signature.entries()) flat(KEY_X + i * KEY_STEP, yOf(staff, degree), frame);
  });
  // 2 over 4: each number fills two spaces of the first staff
  for (const [text, degree] of [
    [beatsPerBar, MIDDLE_LINE],
    [stepsPerBar / beatsPerBar, BOTTOM_LINE],
  ]) {
    const number = svgElement(
      'text',
      {
        x: METER.x,
        y: yOf(0, degree),
        'text-anchor': 'middle',
        fill: COLORS.fg,
        'fill-opacity': OUTLINE,
        'font-family': MONO_FONT,
        'font-size': METER.size,
        'font-weight': METER.weight,
      },
      score,
    );
    number.textContent = String(text);
  }
  const written = svgElement('g', {}, score);
  const cursor = svgElement('line', { stroke: ROLES.accent, 'stroke-width': CURSOR.width, 'stroke-linecap': 'round', 'data-cursor': '' }, score);

  // ----- the trompete's valves -----
  label(words.valves, VIEW / 2, VALVES_LABEL_Y);
  const trumpet = voices.trompete;
  const valveGroup = svgElement('g', { 'data-graphic': FREVO_GRAPHICS[1], 'data-inst': trumpet.instrument }, svg);
  const valves = VALVES.x.map((x, i) => {
    const group = svgElement('g', { 'data-valve': i + 1 }, valveGroup),
      casing = svgElement(
        'rect',
        {
          x: x - VALVES.width / 2,
          y: VALVES.top,
          width: VALVES.width,
          height: VALVES.height,
          rx: VALVES.radius,
          fill: trumpet.color,
          'fill-opacity': fillAt(0),
          stroke: trumpet.color,
          'stroke-width': VALVES.stroke,
          'stroke-opacity': REST_LINE,
        },
        group,
      ),
      button = svgElement('g', {}, group);
    svgElement('line', { x1: x, x2: x, y1: -VALVES.up, y2: 0, stroke: trumpet.color, 'stroke-width': VALVES.stroke, 'stroke-opacity': REST_LINE }, button);
    svgElement('ellipse', { cx: x, cy: -VALVES.up, rx: VALVES.cap.rx, ry: VALVES.cap.ry, fill: trumpet.color }, button);
    const number = label(String(i + 1), x, VALVES.top + VALVES.number, group);
    return { group, casing, button, number, ink: number.getAttribute('fill') };
  });
  const noteName = svgElement(
    'text',
    {
      x: NOTE_NAME.x,
      y: NOTE_NAME.y,
      fill: trumpet.color,
      'font-family': MONO_FONT,
      'font-size': NOTE_NAME.size,
      'font-weight': NOTE_NAME.weight,
      'data-note': '',
    },
    valveGroup,
  );

  let scene = null,
    shownPage = null,
    shownBar = null,
    pieces = [], // the page's notes and rests as drawn: { bar, step, steps, rest, x, staff, group, from, to }
    blown = []; // the trompete's notes that sound in the bar shown
  const layouts = new Map(), // each bar of the page: where its sixteenths stand
    flatLetters = signature.map(entry => entry.letter);
  /** Where a time of a bar stands, in sixteenths from its start: between the middles of its sixteenths. */
  const xIn = (left, middles, sixteenth) => {
    const step = Math.min(Math.floor(sixteenth), stepsPerBar - 1);
    return left + barWidth * (middles[step] + (sixteenth - step) * (middles[step + 1] - middles[step]));
  };
  /** Draw one piece of a bar on its staff, and return what the cursor and the light need. */
  const drawPiece = (piece, bar, staff, left, middles) => {
    const x = xIn(left, middles, piece.step),
      group = svgElement('g', { color: COLORS.fg, 'data-step': piece.step, 'data-bar': bar }, written),
      drawn = { ...piece, bar, staff, x, group };
    if (piece.rest) {
      setAttr(group, 'data-rest', piece.steps);
      const middle = yOf(staff, MIDDLE_LINE);
      // a whole bar's rest hangs from the fourth line, in the middle of its bar
      if (piece.steps === stepsPerBar) shape(SCORE_SHAPES.wholeRest(0, INK), left + barWidth / 2, middle - SPACE, group, { mark: 'rest' });
      else shape(SCORE_SHAPES.rest(piece.steps, 0, INK), x, middle, group, { mark: 'rest' });
      return drawn;
    }
    const y = yOf(staff, piece.degree),
      down = piece.degree >= MIDDLE_LINE,
      side = down ? -1 : 1,
      stemX = x + side * HEAD.rx * STEM.inset,
      tip = y - side * STEM.length;
    setAttr(group, 'data-degree', piece.degree);
    // the light behind it while it sounds, as long as the piece
    const band = svgElement(
      'rect',
      {
        x: x - slot / 2,
        y: STAFF.tops[staff] - BAND.reach,
        width: Math.min(xIn(left, middles, piece.step + piece.steps), left + barWidth + slot / 2) - x,
        height: (STAFF_LINES - 1) * SPACE + 2 * BAND.reach,
        rx: BAND.radius,
        fill: voices.sax.color,
        'fill-opacity': 0,
      },
      group,
    );
    // short lines for a note under or over the staff
    for (let degree = BOTTOM_LINE - 2; degree >= piece.degree; degree -= 2)
      line(x - HEAD.rx - LEDGER.reach, yOf(staff, degree), x + HEAD.rx + LEDGER.reach, yOf(staff, degree), LEDGER.width, group);
    for (let degree = BOTTOM_LINE + 2 * STAFF_LINES; degree <= piece.degree; degree += 2)
      line(x - HEAD.rx - LEDGER.reach, yOf(staff, degree), x + HEAD.rx + LEDGER.reach, yOf(staff, degree), LEDGER.width, group);
    const hollow = piece.steps === HALF;
    svgElement(
      'ellipse',
      {
        cx: x,
        cy: y,
        rx: HEAD.rx - (hollow ? HEAD.hollow / 2 : 0),
        ry: HEAD.ry - (hollow ? HEAD.hollow / 2 : 0),
        transform: `rotate(${HEAD.tilt} ${x.toFixed(2)} ${y.toFixed(2)})`,
        fill: hollow ? 'none' : INK,
        stroke: INK,
        'stroke-width': hollow ? HEAD.hollow : 0,
        'data-mark': 'head',
      },
      group,
    );
    line(stemX, y, stemX, tip, STEM.width, group, { 'stroke-linecap': 'butt', 'data-mark': 'stem' });
    const flag = { flip: down, scale: FLAG.scale, narrow: FLAG.narrow, mark: 'flag' };
    if (piece.steps <= ONE_FLAG) shape(SCORE_SHAPES.flag(0, SCORE_SHAPES.line, INK), stemX, tip, group, flag);
    if (piece.steps === TWO_FLAGS) shape(SCORE_SHAPES.flag(0, SCORE_SHAPES.line, INK), stemX, tip + side * FLAG.step, group, flag);
    // a dot stands in a space: beside the head, or just above a head that sits on a line
    if (DOTTED.includes(piece.steps))
      svgElement('circle', { cx: x + HEAD.rx + DOT.gap, cy: y - ((piece.degree - BOTTOM_LINE) % 2 === 0 ? SPACE / 2 : 0), r: DOT.radius, fill: INK }, group);
    // the accidental it shows, with room of its own before the head (barLayout)
    if (piece.accidental !== null) {
      ACCIDENTALS[piece.accidental](x - HEAD.rx - ACCIDENTAL.gap, y, svgElement('g', { 'data-mark': 'accidental' }, group));
      setAttr(group, 'data-accidental', piece.accidental);
    }
    // a tie to the piece after it, on the side away from the stem; into the next staff it is cut short
    if (piece.tiedTo || (piece.tiedFrom && piece.step === 0)) {
      const curve = (from, to) =>
        path(
          `M${from.toFixed(2)} ${(y + side * (HEAD.ry + TIE.gap)).toFixed(2)} Q${((from + to) / 2).toFixed(2)} ${(y + side * (HEAD.ry + TIE.gap + TIE.rise)).toFixed(2)} ${to.toFixed(2)} ${(y + side * (HEAD.ry + TIE.gap)).toFixed(2)}`,
          TIE.width,
          group,
        );
      const next = xIn(left, middles, piece.step + piece.steps) + (piece.step + piece.steps >= stepsPerBar ? BAR_GAP : 0);
      if (piece.tiedTo) curve(x + HEAD.rx / 2, Math.min(next - HEAD.rx / 2, STAFF.right - TIE.gap));
      if (piece.tiedFrom && piece.step === 0 && left === barLeft(0)) curve(x - HEAD.rx - TIE.stub, x - HEAD.rx / 2);
    }
    const [from, to] = piece.sounds;
    return { ...drawn, band, from: bar + from / stepsPerBar, to: bar + to / stepsPerBar };
  };
  /** Draw a page: the scene's four bars from `page`, two a staff; a bar past the scene's end stays empty. */
  const drawPage = page => {
    shownPage = page;
    written.replaceChildren();
    pieces = [];
    layouts.clear();
    for (let i = 0; i < BARS_PER_PAGE; i++) {
      const bar = scene.start + page * BARS_PER_PAGE + i;
      if (bar >= scene.start + scene.bars) break;
      const staff = Math.floor(i / BARS_PER_STAFF),
        left = barLeft(i % BARS_PER_STAFF),
        barsPieces = withAccidentals(barPieces(tuneIn(bar), stepsPerBar), flatLetters),
        middles = barLayout(barsPieces, stepsPerBar);
      layouts.set(bar, middles);
      for (const piece of barsPieces) pieces.push(drawPiece(piece, bar, staff, left, middles));
    }
  };
  return {
    resize,
    /** A scene's pages start at its first bar. */
    build(next) {
      scene = next;
      resize();
      shownPage = null;
      shownBar = null;
    },
    /** `position`: bars on the timeline. The page, the lit note, the cursor and the valves are read from it alone. */
    update(position) {
      const bar = Math.floor(position),
        sixteenth = (position - bar) * stepsPerBar,
        page = Math.floor((bar - scene.start) / BARS_PER_PAGE);
      if (page !== shownPage) drawPage(page);
      // the score: the note that sounds is lit, with every piece it is tied to
      const silent = volume[voices.sax.instrument] === 'mute';
      setAttr(score, 'opacity', silent ? String(DIM) : '1');
      for (const piece of pieces) {
        const now = !silent && !piece.rest && position >= piece.from && position < piece.to;
        setAttr(piece.group, 'data-now', now ? 'true' : 'false');
        setAttr(piece.group, 'opacity', now ? '1' : String(WAITING));
        if (piece.band) setAttr(piece.band, 'fill-opacity', now ? String(BAND.opacity) : '0');
      }
      // the cursor: at the show's place, or with reduced motion at the note or rest that holds it
      const inPage = bar - scene.start - page * BARS_PER_PAGE,
        staff = Math.floor(inPage / BARS_PER_STAFF),
        held = pieces.find(piece => piece.bar === bar && sixteenth >= piece.step && sixteenth < piece.step + piece.steps),
        left = barLeft(inPage % BARS_PER_STAFF),
        x = still?.matches && held ? (held.steps === stepsPerBar ? left + slot / 2 : held.x) : xIn(left, layouts.get(bar), sixteenth);
      setAttr(cursor, 'x1', x.toFixed(2));
      setAttr(cursor, 'x2', x.toFixed(2));
      setAttr(cursor, 'y1', (STAFF.tops[staff] - CURSOR.reach).toFixed(2));
      setAttr(cursor, 'y2', (bottomOf(staff) + CURSOR.reach).toFixed(2));
      setAttr(cursor, 'data-staff', staff);
      // the valves: pressed for the note the trompete plays now
      if (bar !== shownBar) {
        shownBar = bar;
        blown = trumpetIn(bar);
      }
      const muted = volume[trumpet.instrument] === 'mute',
        note = muted ? null : (blown.find(candidate => sixteenth >= candidate.step && sixteenth < candidate.step + candidate.steps) ?? null),
        pressed = note ? (valvesFor(note.midi) ?? []) : [];
      setAttr(valveGroup, 'opacity', muted ? String(DIM) : '1');
      setAttr(valveGroup, 'data-sounds', note ? note.pitch : '');
      valves.forEach(({ group, casing, button, number, ink }, i) => {
        const down = pressed.includes(i + 1);
        setAttr(number, 'fill', down ? COLORS.void : ink); // dark on the lit casing
        setAttr(group, 'data-pressed', down ? 'true' : 'false');
        setAttr(casing, 'fill-opacity', fillAt(down ? 1 : 0));
        setAttr(casing, 'stroke-opacity', note ? '1' : String(REST_LINE));
        setAttr(button, 'transform', `translate(0 ${VALVES.top + (down ? VALVES.travel : 0)})`);
      });
      const name = note ? words.notes[note.pitch].toUpperCase() : '';
      if (noteName.textContent !== name) noteName.textContent = name;
      setAttr(noteName, 'display', note ? 'inline' : 'none'); // no empty name beside valves at rest
    },
  };
}
