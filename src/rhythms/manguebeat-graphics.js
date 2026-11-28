// The manguebeat's own graphics, in the stage's main square (#56): the bass tablature on the neck
// («tablatura»), the neck with the place that sounds lit and, under it, the bar's notes as fret
// numbers on the four strings; and the echo («eco»), the stroke thrown into it and its repeats as
// copies, each smaller and fainter than the one before. Both are functions of the show position:
// `build` draws a scene's echo slots and `update` reads the bar's notes and the newest thrown stroke.
// Nothing here has a clock of its own, so the video export matches playback (docs/product.md,
// Constraints).
import { COLORS, fgAlpha, MONO_FONT, REDUCED_MOTION_QUERY } from '../theme.js';
import { clamp, setAttr, svgElement } from '../util.js';

export const MANGUEBEAT_GRAPHICS = ['tablatura', 'eco']; // the ids of this show's graphics: no other show uses them

const VIEW = 100; // the main square, in SVG units; everything sits about 42 from its centre at most, inside the ring the background's shapes are born on
const LABEL_SIZE = 3; // the stage's label size in the video export; the page's is larger
const LABEL_MAX = 3.9; // the largest label the tablature's string names still fit at
const LABEL_SPACING = 0.3;
const DECIMALS = 3; // of an opacity or a scale written into the SVG
const OUTLINE = 0.55; // a label, and a part at rest in the foreground's colour
const REST_LINE = 0.7; // a line or an outline at rest in an instrument's colour: 3:1 on the ground
const REST_FILL = 0.1;
const LIT_FILL = 0.9;
const DIM = 0.38; // a muted instrument's part
const WAITING = 0.62; // a note of the bar that does not sound now: still read at 4.5:1 on the ground

// The bass, four strings from the highest (drawn on top, as a tablature is written) to the lowest.
export const STRINGS = [
  { name: 'G', open: 43 },
  { name: 'D', open: 38 },
  { name: 'A', open: 33 },
  { name: 'E', open: 28 },
];
export const FRETS = 5; // the frets the neck shows: the show's bass stays in the first position
const SEMITONES_PER_OCTAVE = 12;
// The neck: the nut on the left, each fret nearer the next, as on the instrument.
const NECK = { left: 24, right: 79, top: 22, gap: 4.6, nut: 1.1, fret: 0.35, string: 0.4, lit: 0.9 };
const NECK_LABEL_Y = 15.5;
const FRET_REACH = FRETS + 0.5; // the neck is cut half a fret past its last one
const DOT = { radius: 2, open: 1.6, swell: 0.25 }; // the finger's place; an open string rings left of the nut
const OPEN_X = NECK.left - 3.1; // between the string's name and the nut
// The bar's tablature under the neck: one line a string, a fret number where each note starts.
const TAB = { left: 24, right: 79, top: 42.5, gap: 4.3, line: 0.4, hold: 0.9 };
const NAME_X = 19.5; // the strings' names, left of the tablature; the neck above it has the same strings in the same order
const NUMBER_SIZE = 4;
const NUMBER_WEIGHT = 700; // bold, as the stage's figures
const NUMBER_BOX = { width: 3, height: 4, radius: 0.8 };
const NUMBER_BASELINE = 1.4;
const NAME_BASELINE = 1; // from a line down to the baseline of its string's name
const MID_STEP = 0.5; // a note's number stands in the middle of its sixteenth // from a line down to its number's baseline
// The echo: the thrown stroke on the left, its copies to the right, one every repeat.
const ECHO_LABEL_Y = 67.5;
const ECHO = { y: 76.5, radius: 5.2, least: 1.1, gap: 1.7, stroke: 0.5 }; // `least`: the smallest copy drawn; `gap`: clear ground between two copies
const ECHO_VOICE_Y = 86.5; // the name of the instrument whose stroke is in the echo
const REST_SLOTS = 4; // the copies a scene with no echo still shows, at rest
const RING_REPEATS = 2; // a copy stays lit for this many repeats, so two copies show at once

/** Where a note of MIDI number `midi` is played: { string (index in STRINGS), fret }, at its lowest fret, or null off the neck. */
export function placeOf(midi) {
  const places = STRINGS.map(({ open }, string) => ({ string, fret: midi - open })).filter(({ fret }) => fret >= 0 && fret <= FRETS);
  return places.length ? places.reduce((low, place) => (place.fret < low.fret ? place : low)) : null;
}

/** The distance of fret `n` from the nut, as a share of the neck drawn: each fret a twelfth root of two nearer the bridge. */
export const fretShare = n => (1 - 2 ** (-n / SEMITONES_PER_OCTAVE)) / (1 - 2 ** (-FRET_REACH / SEMITONES_PER_OCTAVE));

/** The level of the echo's copy `n`: the stroke is 1, each repeat `feedback` of the one before. */
export const copyLevel = (n, feedback) => feedback ** n;

/**
 * Where the stroke and its `repeats` copies sit, as [x, radius] each: a copy's area follows its
 * level, none is drawn under ECHO.least, they stand clear of each other and the row is centred.
 */
export function copyPlaces(repeats, feedback) {
  const radii = Array.from({ length: repeats + 1 }, (_, n) => Math.max(ECHO.least, ECHO.radius * Math.sqrt(copyLevel(n, feedback))));
  const width = 2 * radii.reduce((sum, radius) => sum + radius, 0) + repeats * ECHO.gap;
  let left = (VIEW - width) / 2;
  return radii.map(radius => {
    const place = [left + radius, radius];
    left += 2 * radius + ECHO.gap;
    return place;
  });
}

/**
 * The light of the echo's copy `n` (0 is the stroke itself), `elapsed` sixteenths after the stroke:
 * 0 before it sounds, 1 as it sounds, then fading over RING_REPEATS repeats; with `still` it is lit
 * until the next copy sounds and never fades.
 */
export function copyLight(n, elapsed, every, still) {
  const age = elapsed - n * every;
  if (age < 0) return 0;
  if (still) return age < every ? 1 : 0;
  return clamp(1 - age / (RING_REPEATS * every), 0, 1);
}

/**
 * The manguebeat's graphics on `element`. `voices`: the show's voices (their colours and
 * instruments); `copy`: the rhythm's words; `stepsPerBar`; `notesIn(bar)`: the bass notes of a bar of
 * the show, each { step, steps, midi }; `lastThrow(position)`: the newest stroke thrown into the
 * echo at a position, { voice, at, repeats }, or null; `echo`: the delay, { steps, feedback };
 * `volume`: each instrument's level, so a muted part shows disabled; `labelPixels()`: the stage's
 * label size as the page renders it now, which every label of the graphic matches.
 */
export function createManguebeatGraphics(
  element,
  { voices, copy, stepsPerBar, notesIn, lastThrow, echo, labelPixels, volume = {}, matchMedia = globalThis.matchMedia },
) {
  const still = matchMedia?.(REDUCED_MOTION_QUERY);
  const words = copy.graphics;
  const bass = voices.baixo;
  element.replaceChildren();
  const svg = svgElement('svg', { viewBox: `0 0 ${VIEW} ${VIEW}`, role: 'img', 'aria-label': words.label }, element);
  const labels = []; // every text at the stage's label size: resized with the stage
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
  const line = (x1, y1, x2, y2, width, parent, stroke = COLORS.fg, opacity = OUTLINE) =>
    svgElement('line', { x1, y1, x2, y2, stroke, 'stroke-width': width, 'stroke-opacity': opacity, 'stroke-linecap': 'round' }, parent);

  // ----- the neck and the bar's tablature -----
  label(words.tab, VIEW / 2, NECK_LABEL_Y);
  const tab = svgElement('g', { 'data-graphic': MANGUEBEAT_GRAPHICS[0], 'data-inst': bass.instrument }, svg);
  const neckWidth = NECK.right - NECK.left,
    neckY = string => NECK.top + string * NECK.gap,
    tabY = string => TAB.top + string * TAB.gap,
    fretX = n => NECK.left + neckWidth * fretShare(n),
    stepX = step => TAB.left + ((TAB.right - TAB.left) * (step + MID_STEP)) / stepsPerBar;
  line(NECK.left, neckY(0), NECK.left, neckY(STRINGS.length - 1), NECK.nut, tab, COLORS.fg, 1);
  for (let n = 1; n <= FRETS; n++) line(fretX(n), neckY(0), fretX(n), neckY(STRINGS.length - 1), NECK.fret, tab);
  const strings = STRINGS.map(({ name }, string) => {
    label(name, NAME_X, tabY(string) + NAME_BASELINE, tab);
    line(TAB.left, tabY(string), TAB.right, tabY(string), TAB.line, tab);
    return { wire: line(NECK.left, neckY(string), NECK.right, neckY(string), NECK.string, tab, bass.color, REST_LINE) };
  });
  // the finger's place on the neck: one dot, moved to the note that sounds
  const finger = svgElement(
    'circle',
    { r: DOT.radius, fill: bass.color, 'fill-opacity': 0, stroke: bass.color, 'stroke-width': NECK.fret, 'stroke-opacity': 0 },
    tab,
  );
  const numbers = svgElement('g', {}, tab);

  // ----- the echo -----
  label(words.echo, VIEW / 2, ECHO_LABEL_Y);
  const trail = svgElement('g', { 'data-graphic': MANGUEBEAT_GRAPHICS[1] }, svg);
  const thrower = label('', VIEW / 2, ECHO_VOICE_Y);
  const slots = svgElement('g', {}, trail);

  let notes = [], // the bar's notes as drawn: { step, steps, place, box, text, hold }
    shownBar = null,
    copies = [];
  /** Set every label to the stage's label size as the page renders it (the page's is larger than the export's). */
  const resize = () => {
    const unit = element.clientWidth / VIEW; // CSS px per SVG unit, before any zoom of the stage
    const size = unit > 0 && labelPixels ? clamp(labelPixels() / unit, LABEL_SIZE, LABEL_MAX) : LABEL_SIZE;
    for (const text of labels) setAttr(text, 'font-size', size.toFixed(2));
  };
  /** Draw a bar's notes on the tablature: a fret number where each starts, and a line for as long as it is held. */
  const drawBar = bar => {
    shownBar = bar;
    numbers.replaceChildren();
    notes = notesIn(bar)
      .map(note => ({ ...note, place: placeOf(note.midi) }))
      .filter(note => note.place !== null)
      .map(note => {
        const x = stepX(note.step),
          y = tabY(note.place.string),
          group = svgElement('g', { 'data-step': note.step, 'data-string': STRINGS[note.place.string].name }, numbers),
          hold = note.steps > 1 ? line(x, y, stepX(note.step + note.steps - 1), y, TAB.hold, group, bass.color, REST_LINE) : null,
          box = svgElement(
            'rect',
            {
              x: x - NUMBER_BOX.width / 2,
              y: y - NUMBER_BOX.height / 2,
              width: NUMBER_BOX.width,
              height: NUMBER_BOX.height,
              rx: NUMBER_BOX.radius,
              fill: COLORS.void,
            },
            group,
          ),
          text = svgElement(
            'text',
            {
              x,
              y: y + NUMBER_BASELINE,
              'text-anchor': 'middle',
              fill: COLORS.fg,
              'font-family': MONO_FONT,
              'font-size': NUMBER_SIZE,
              'font-weight': NUMBER_WEIGHT,
            },
            group,
          );
        text.textContent = String(note.place.fret);
        return { ...note, group, box, text, hold };
      });
  };
  return {
    resize,
    /** Draw the echo's copies of a scene: the stroke and one copy a repeat; a scene with no echo shows them at rest. */
    build(scene) {
      resize();
      shownBar = null;
      slots.replaceChildren();
      const repeats = scene.echo?.repeats ?? REST_SLOTS;
      copies = copyPlaces(repeats, echo.feedback).map(([x, radius], n) =>
        svgElement(
          'circle',
          {
            'data-copy': n,
            cx: x.toFixed(DECIMALS),
            cy: ECHO.y,
            r: radius.toFixed(DECIMALS),
            fill: COLORS.fg,
            'fill-opacity': 0,
            stroke: COLORS.fg,
            'stroke-width': ECHO.stroke,
            'stroke-opacity': OUTLINE,
          },
          slots,
        ),
      );
    },
    /** `position`: bars on the timeline. The notes and the echo are read from it alone. */
    update(position) {
      const bar = Math.floor(position),
        sixteenth = (position - bar) * stepsPerBar;
      if (bar !== shownBar) drawBar(bar);
      // the tablature: the note that sounds is lit, on the staff and on the neck
      const bassMuted = volume[bass.instrument] === 'mute';
      const sounding = bassMuted ? null : (notes.find(note => sixteenth >= note.step && sixteenth < note.step + note.steps) ?? null);
      setAttr(tab, 'opacity', bassMuted ? String(DIM) : '1');
      for (const note of notes) {
        const now = note === sounding;
        setAttr(note.group, 'data-now', now ? 'true' : 'false');
        // a waiting note dims its number alone: its box stays whole over the staff's line
        setAttr(note.box, 'fill', now ? bass.color : COLORS.void);
        setAttr(note.text, 'fill', now ? COLORS.void : COLORS.fg);
        setAttr(note.text, 'fill-opacity', now ? '1' : String(WAITING));
        if (note.hold) setAttr(note.hold, 'stroke-opacity', now ? '1' : String(REST_LINE));
      }
      const light = sounding ? (still?.matches ? 1 : 1 - (DOT.swell * (sixteenth - sounding.step)) / sounding.steps) : 0;
      strings.forEach(({ wire }, string) => {
        const rings = sounding?.place.string === string;
        setAttr(wire, 'stroke-width', rings ? NECK.lit : NECK.string);
        setAttr(wire, 'stroke-opacity', rings ? '1' : String(REST_LINE));
      });
      setAttr(tab, 'data-string', sounding ? STRINGS[sounding.place.string].name : '');
      setAttr(tab, 'data-fret', sounding ? sounding.place.fret : '');
      if (sounding) {
        const { string, fret } = sounding.place,
          open = fret === 0;
        setAttr(finger, 'cx', (open ? OPEN_X : (fretX(fret - 1) + fretX(fret)) / 2).toFixed(DECIMALS));
        setAttr(finger, 'cy', neckY(string).toFixed(DECIMALS));
        setAttr(finger, 'r', open ? DOT.open : DOT.radius);
        // an open string is a ring: no finger holds it down
        setAttr(finger, 'fill-opacity', open ? '0' : (LIT_FILL * light).toFixed(DECIMALS));
        setAttr(finger, 'stroke-width', open ? NECK.lit : NECK.fret);
      }
      setAttr(finger, 'stroke-opacity', sounding ? light.toFixed(DECIMALS) : '0');
      if (!sounding) setAttr(finger, 'fill-opacity', '0');

      // the echo: the newest thrown stroke and the copies of it that have sounded
      const thrown = lastThrow(position),
        instrument = thrown && voices[thrown.voice].instrument,
        elapsed = thrown ? (position - thrown.at) * stepsPerBar : 0,
        lights = copies.map((_, n) => (thrown && n <= thrown.repeats ? copyLight(n, elapsed, echo.steps, still?.matches) : 0)),
        holds = lights.some(light => light > 0), // a stroke is in the echo now
        muted = holds && volume[instrument] === 'mute',
        color = holds ? voices[thrown.voice].color : COLORS.fg;
      copies.forEach((circle, n) => {
        const light = muted ? 0 : lights[n];
        setAttr(circle, 'fill', color);
        setAttr(circle, 'stroke', color);
        setAttr(circle, 'stroke-opacity', holds ? String(REST_LINE) : String(OUTLINE));
        setAttr(circle, 'data-lit', light > 0 ? 'true' : 'false');
        setAttr(circle, 'fill-opacity', (REST_FILL + (LIT_FILL - REST_FILL) * light).toFixed(DECIMALS));
      });
      setAttr(trail, 'data-voice', holds ? thrown.voice : '');
      setAttr(trail, 'opacity', muted ? String(DIM) : '1'); // a muted instrument's stroke: its copies and its name disabled, none lit
      setAttr(thrower, 'opacity', muted ? String(DIM) : '1');
      setAttr(thrower, 'display', holds ? 'inline' : 'none'); // no name under an echo that holds nothing
      // the instrument as the sound controls name it (the alfaia, not one of its hands), else the voice
      const name = holds ? (copy.instruments?.[instrument] ?? copy.voices[thrown.voice]).toUpperCase() : '';
      if (holds && thrower.textContent !== name) thrower.textContent = name;
    },
  };
}
