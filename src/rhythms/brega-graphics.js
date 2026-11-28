// The brega's own graphics, in the stage's main square (#49): the chord chart («cifras»), one cell a
// bar of the scene with the chord that sounds lit, and the drum kit seen from above, each piece lit
// while its stroke rings. Both are functions of the show position: `build` draws a scene's cells and
// `update` reads the bar and the strokes that just sounded. Nothing here has a clock of its own, so
// the video export matches playback (docs/product.md, Constraints).
import { COLORS, fgAlpha, MONO_FONT, REDUCED_MOTION_QUERY, ROLES } from '../theme.js';
import { clamp, setAttr, svgElement } from '../util.js';

export const BREGA_GRAPHICS = ['cifras', 'bateria']; // the ids of this show's graphics: no other show uses them

const VIEW = 100; // the main square, in SVG units; everything sits inside its inscribed circle
const LABEL_SIZE = 3; // the stage's label size in the video export (2.2cqw of a 74cqw square); the page's is larger
const LABEL_MAX = 3.9; // the largest label the kit's names still fit their pieces at
const LABEL_SPACING = 0.3;
// The chart: up to two rows of four cells, centred on CHART_Y.
const CELLS_PER_ROW = 4;
const CELL = { width: 15.5, height: 11, gap: 1.5, radius: 1.6 };
const CHART_Y = 26; // the middle of the chart's rows
const CHART_LABEL_Y = 9.5;
const SYMBOL_SIZE = 6; // a chord symbol: 4.4cqw, the readout's larger text
const SYMBOL_WEIGHT = 700; // bold, as the stage's figures
const DECIMALS = 3; // of an opacity or a scale written into the SVG
const SYMBOL_BASELINE = 2.1; // from a cell's middle down to the symbol's baseline
const REST = '–'; // a bar with no chord (the Breque's silence)
// The kit, seen from above as the drummer sits: chimbal on the left, caixa in front, bumbo in the
// middle, the three toms from high to low, left to right. `ring`: seconds a stroke stays lit.
// `dark`: the light from which the piece's fill is bright enough for its name in the ground's colour
// (where that ink and the light one read alike on the piece's colour).
const KIT_LABEL_Y = 42.3; // clear of the chart above and of the toms under it, lit or not
export const KIT_PIECES = [
  { id: 'chimbal', voice: 'chimbal', x: 19, y: 66, radius: 10, ring: 0.14, dark: 0.64 },
  { id: 'caixa', voice: 'caixa', x: 33, y: 83, radius: 8.5, ring: 0.22, dark: 0.49 },
  { id: 'bumbo', voice: 'bumbo', x: 53, y: 72, radius: 12.5, ring: 0.3, dark: 0.79 },
  { id: 'tom-agudo', voice: 'tom', tone: 'agudo', x: 39, y: 55, radius: 7, ring: 0.26, dark: 0.66 },
  { id: 'tom-medio', voice: 'tom', tone: 'medio', x: 60, y: 51.5, radius: 7, ring: 0.28, dark: 0.66 },
  { id: 'tom-grave', voice: 'tom', tone: 'grave', x: 76, y: 74, radius: 8.5, ring: 0.32, dark: 0.66 },
];
const OPEN = { tone: 'aberto', ring: 0.36, grow: 1.6 }; // the open chimbal rings longer, and its outer ring opens
const OPEN_RING_GAP = 1.6; // the chimbal's second ring, outside its edge
const REST_FILL = 0.1; // a piece at rest: its colour, faint
const LIT_FILL = 0.9;
const OUTLINE = 0.55;
const PIECE_STROKE = 0.5;
const NAME_HALO = 0.7; // a light name keeps a rim of the ground's colour, so it reads on a fill that is filling or fading
const SWELL = 0.07; // a lit piece grows by this share, with motion on
const WAITING = 0.62; // a cell that is not the bar that sounds: still read at 4.5:1 on the ground
const DIM = 0.38; // a muted instrument's piece
const CELL_STROKE = 0.4;
const CELL_FILL = 0.16; // the lit cell's fill, of the accent

/** A piece's light for a stroke that sounded `age` seconds ago: 1 at the stroke, 0 once it has rung. */
export const lightOf = (age, ring, still) => (age < 0 || age >= ring ? 0 : still ? 1 : 1 - age / ring);

/** The kit piece a hit sounds on: the tom of its tone, else the piece of its voice. */
export const pieceOf = (voice, tone) => KIT_PIECES.find(piece => piece.voice === voice && (piece.tone === undefined || piece.tone === tone))?.id ?? null;

/** Where each of `count` cells sits: [x, y] of its top left corner, rows of four, centred. */
export function cellPlaces(count) {
  const rows = Math.ceil(count / CELLS_PER_ROW),
    top = CHART_Y - (rows * CELL.height + (rows - 1) * CELL.gap) / 2;
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / CELLS_PER_ROW),
      inRow = Math.min(CELLS_PER_ROW, count - row * CELLS_PER_ROW),
      left = (VIEW - (inRow * CELL.width + (inRow - 1) * CELL.gap)) / 2;
    return [left + (i % CELLS_PER_ROW) * (CELL.width + CELL.gap), top + row * (CELL.height + CELL.gap)];
  });
}

/**
 * The brega's graphics on `element`. `voices`: the show's voices (their colours); `copy`: the
 * rhythm's words; `symbolAt(scene, barInScene)`: the chord symbol that sounds in a bar, or null;
 * `volume`: each instrument's level, so a muted piece shows disabled; `labelPixels()`: the stage's
 * label size as the page renders it now, which every label of the graphic matches.
 */
export function createBregaGraphics(element, { voices, copy, symbolAt, labelPixels, volume = {}, matchMedia = globalThis.matchMedia }) {
  const still = matchMedia?.(REDUCED_MOTION_QUERY);
  const words = copy.graphics;
  element.replaceChildren();
  const svg = svgElement('svg', { viewBox: `0 0 ${VIEW} ${VIEW}`, role: 'img', 'aria-label': words.label }, element);
  const labels = []; // every text at the stage's label size: resized with the stage
  const label = (text, y) => {
    const element = svgElement(
      'text',
      { x: VIEW / 2, y, 'text-anchor': 'middle', fill: fgAlpha(OUTLINE), 'font-family': MONO_FONT, 'font-size': LABEL_SIZE, 'letter-spacing': LABEL_SPACING },
      svg,
    );
    element.textContent = text.toUpperCase();
    labels.push(element);
    return element;
  };
  const chartLabel = label(words.chords, CHART_LABEL_Y);
  const chart = svgElement('g', { 'data-graphic': BREGA_GRAPHICS[0] }, svg);
  label(words.kit, KIT_LABEL_Y);
  const kit = svgElement('g', { 'data-graphic': BREGA_GRAPHICS[1] }, svg);

  const pieces = KIT_PIECES.map(piece => {
    const { color } = voices[piece.voice],
      group = svgElement('g', { 'data-piece': piece.id, 'data-inst': voices[piece.voice].instrument, transform: `translate(${piece.x} ${piece.y})` }, kit),
      body = svgElement('g', {}, group),
      open =
        piece.id === 'chimbal'
          ? svgElement('circle', { r: piece.radius + OPEN_RING_GAP, fill: 'none', stroke: color, 'stroke-width': PIECE_STROKE, 'stroke-opacity': 0 }, body)
          : null,
      disc = svgElement(
        'circle',
        { r: piece.radius, fill: color, 'fill-opacity': REST_FILL, stroke: color, 'stroke-width': PIECE_STROKE, 'stroke-opacity': OUTLINE },
        body,
      ),
      name = svgElement(
        'text',
        {
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          fill: COLORS.fg,
          stroke: COLORS.void,
          'stroke-width': NAME_HALO,
          'paint-order': 'stroke',
          'font-family': MONO_FONT,
          'font-size': LABEL_SIZE,
        },
        group,
      );
    name.textContent = (piece.tone ? words.toms[piece.tone] : copy.voices[piece.voice]).toUpperCase();
    labels.push(name);
    return { ...piece, group, body, disc, open, name };
  });

  let cells = [],
    scene = null;
  /** Set every label to the stage's label size as the page renders it (the page's is larger than the export's). */
  const resize = () => {
    const unit = element.clientWidth / VIEW; // CSS px per SVG unit, before any zoom of the stage
    const size = unit > 0 && labelPixels ? clamp(labelPixels() / unit, LABEL_SIZE, LABEL_MAX) : LABEL_SIZE;
    for (const text of labels) setAttr(text, 'font-size', size.toFixed(2));
  };
  return {
    resize,
    /** Draw the cells of a scene: one a bar that holds a chord or a rest; a scene with no chord draws none. */
    build(next) {
      scene = next;
      resize();
      chart.replaceChildren();
      const symbols = Array.from({ length: scene.chords ? scene.bars : 0 }, (_, bar) => symbolAt(scene, bar));
      const places = cellPlaces(symbols.length);
      cells = symbols.map((symbol, i) => {
        const group = svgElement('g', { 'data-bar': i, transform: `translate(${places[i][0]} ${places[i][1]})` }, chart),
          box = svgElement(
            'rect',
            { width: CELL.width, height: CELL.height, rx: CELL.radius, fill: ROLES.accent, 'fill-opacity': 0, stroke: COLORS.fg, 'stroke-width': CELL_STROKE },
            group,
          ),
          text = svgElement(
            'text',
            {
              x: CELL.width / 2,
              y: CELL.height / 2 + SYMBOL_BASELINE,
              'text-anchor': 'middle',
              fill: COLORS.fg,
              'font-family': MONO_FONT,
              'font-size': SYMBOL_SIZE,
              'font-weight': SYMBOL_WEIGHT,
            },
            group,
          );
        text.textContent = symbol ?? REST;
        return { group, box, text };
      });
      setAttr(chartLabel, 'display', cells.length ? 'inline' : 'none'); // a scene with no harmony shows no empty chart under its name
    },
    /** `position`: bars on the timeline; `heard`: the strokes that just sounded, each with its `age` in seconds. */
    update(position, heard) {
      const barInScene = Math.floor(position) - scene.start;
      cells.forEach(({ group, box }, i) => {
        const now = i === barInScene;
        setAttr(group, 'opacity', now ? '1' : String(WAITING));
        setAttr(group, 'data-now', now ? 'true' : 'false');
        setAttr(box, 'fill-opacity', now ? String(CELL_FILL) : '0');
        setAttr(box, 'stroke', now ? ROLES.accent : COLORS.fg);
      });
      for (const piece of pieces) {
        const muted = volume[piece.group.dataset.inst] === 'mute';
        const strokes = heard.filter(h => pieceOf(h.voice, h.hit.tone) === piece.id);
        const opened = strokes.some(h => h.hit.tone === OPEN.tone && h.age < OPEN.ring);
        const light = muted ? 0 : Math.max(0, ...strokes.map(h => lightOf(h.age, h.hit.tone === OPEN.tone ? OPEN.ring : piece.ring, still?.matches)));
        setAttr(piece.group, 'data-lit', light > 0 ? 'true' : 'false');
        setAttr(piece.group, 'opacity', muted ? String(DIM) : '1');
        setAttr(piece.disc, 'fill-opacity', (REST_FILL + (LIT_FILL - REST_FILL) * light).toFixed(DECIMALS));
        // on a bright fill the name is the ground's colour, with no rim; under it, light with its rim
        setAttr(piece.name, 'fill', light > piece.dark ? COLORS.void : COLORS.fg);
        setAttr(piece.name, 'stroke-width', light > piece.dark ? '0' : String(NAME_HALO));
        setAttr(piece.body, 'transform', still?.matches ? '' : `scale(${(1 + SWELL * clamp(light, 0, 1)).toFixed(DECIMALS)})`);
        if (piece.open) setAttr(piece.open, 'stroke-opacity', opened && !muted ? String(OUTLINE) : '0');
      }
    },
  };
}
