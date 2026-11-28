// The brega's own graphics, in the stage's main square (#49): the chord chart («cifras»), one cell a
// bar of the scene with the chord that sounds lit, and the drum kit seen from above, each piece lit
// while its stroke rings. Both are functions of the show position: `build` draws a scene's cells and
// `update` reads the bar and the strokes that just sounded. Nothing here has a clock of its own, so
// the video export matches playback (docs/product.md, Constraints).
import { COLORS, fgAlpha, MONO_FONT, REDUCED_MOTION_QUERY, ROLES } from '../theme.js';
import { clamp, setAttr, svgElement } from '../util.js';

export const BREGA_GRAPHICS = ['cifras', 'bateria']; // the ids of this show's graphics: no other show uses them

const VIEW = 100; // the main square, in SVG units; everything sits inside its inscribed circle
const LABEL_SIZE = 3; // the stage's label size (2.2cqw of a 74cqw square)
const LABEL_SPACING = 0.3;
// The chart: up to two rows of four cells, centred on CHART_Y.
const CELLS_PER_ROW = 4;
const CELL = { width: 15.5, height: 11, gap: 1.5, radius: 1.6 };
const CHART_Y = 27; // the middle of the chart's rows
const CHART_LABEL_Y = 9.5;
const SYMBOL_SIZE = 6; // a chord symbol: 4.4cqw, the readout's larger text
const SYMBOL_BASELINE = 2.1; // from a cell's middle down to the symbol's baseline
const REST = '–'; // a bar with no chord (the Breque's silence)
// The kit, seen from above as the drummer sits: chimbal on the left, caixa in front, bumbo in the
// middle, the three toms from high to low, left to right. `ring`: seconds a stroke stays lit.
const KIT_LABEL_Y = 44;
export const KIT_PIECES = [
  { id: 'chimbal', voice: 'chimbal', x: 20, y: 66, radius: 8, ring: 0.14 },
  { id: 'caixa', voice: 'caixa', x: 33, y: 83, radius: 8.5, ring: 0.22 },
  { id: 'bumbo', voice: 'bumbo', x: 53, y: 72, radius: 12.5, ring: 0.3 },
  { id: 'tom-agudo', voice: 'tom', tone: 'agudo', x: 41, y: 55.5, radius: 6, ring: 0.26 },
  { id: 'tom-medio', voice: 'tom', tone: 'medio', x: 59, y: 52.5, radius: 6.5, ring: 0.28 },
  { id: 'tom-grave', voice: 'tom', tone: 'grave', x: 76, y: 74, radius: 8.5, ring: 0.32 },
];
const OPEN = { tone: 'aberto', ring: 0.36, grow: 1.6 }; // the open chimbal rings longer, and its outer ring opens
const OPEN_RING_GAP = 1.6; // the chimbal's second ring, outside its edge
const REST_FILL = 0.1; // a piece at rest: its colour, faint
const LIT_FILL = 0.9;
const OUTLINE = 0.55;
const PIECE_STROKE = 0.5;
const DARK_NAME_FROM = 0.7; // a piece lit this much is bright enough for its name in the ground's colour
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
 * `volume`: each instrument's level, so a muted piece shows disabled.
 */
export function createBregaGraphics(element, { voices, copy, symbolAt, volume = {}, matchMedia = globalThis.matchMedia }) {
  const still = matchMedia?.(REDUCED_MOTION_QUERY);
  const words = copy.graphics;
  element.replaceChildren();
  const svg = svgElement('svg', { viewBox: `0 0 ${VIEW} ${VIEW}`, role: 'img', 'aria-label': words.label }, element);
  const label = (text, y) => {
    const element = svgElement(
      'text',
      { x: VIEW / 2, y, 'text-anchor': 'middle', fill: fgAlpha(OUTLINE), 'font-family': MONO_FONT, 'font-size': LABEL_SIZE, 'letter-spacing': LABEL_SPACING },
      svg,
    );
    element.textContent = text.toUpperCase();
  };
  label(words.chords, CHART_LABEL_Y);
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
        { y: LABEL_SIZE / 3, 'text-anchor': 'middle', fill: COLORS.fg, 'font-family': MONO_FONT, 'font-size': LABEL_SIZE, 'letter-spacing': LABEL_SPACING },
        group,
      );
    name.textContent = (piece.tone ? words.toms[piece.tone] : copy.voices[piece.voice]).toUpperCase();
    return { ...piece, group, body, disc, open, name };
  });

  let cells = [],
    scene = null;
  return {
    /** Draw the cells of a scene: one a bar that holds a chord or a rest; a scene with no chord draws none. */
    build(next) {
      scene = next;
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
              'font-weight': 700,
            },
            group,
          );
        text.textContent = symbol ?? REST;
        return { group, box, text };
      });
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
        setAttr(piece.disc, 'fill-opacity', (REST_FILL + (LIT_FILL - REST_FILL) * light).toFixed(3));
        setAttr(piece.name, 'fill', light > DARK_NAME_FROM ? COLORS.void : COLORS.fg);
        setAttr(piece.body, 'transform', still?.matches ? '' : `scale(${(1 + SWELL * clamp(light, 0, 1)).toFixed(3)})`);
        if (piece.open) setAttr(piece.open, 'stroke-opacity', opened && !muted ? String(OUTLINE) : '0');
      }
    },
  };
}
