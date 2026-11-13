// The wheel: a 16-sixteenth polar "scope" with one ring per voice, the rhythm's shapes,
// a sweeping hand and the labels in its centre.

import { COPY } from './copy.js';
import { BAR_SECONDS, INSTRUMENTS, isAlfaia, isOffbeat, STEPS_PER_BAR, VOICE_ORDER, VOICES } from './music.js';
import { barTimeline, recentHits } from './show.js';
import { COLORS, MONO_FONT, TINTS } from './theme.js';
import { fixed2, pad2, polylinePath, setAttr, setText, svgElement } from './util.js';

// Radii, in SVG units of the viewBox, which spans -VIEWBOX_RADIUS..VIEWBOX_RADIUS on both axes.
const VIEWBOX_RADIUS = 135;
const OUTER = 112; // the graduated scale
const FACE_RADIUS = 104; // dark disc behind the scale; also where sixteenth ticks start
const MINOR_TICK_INNER = 108.5; // where the 64th-of-a-bar ticks start
const NUMBER_RADIUS = 121; // sixteenth numbers around the scale
const SPOKE_INNER = 31; // spokes, from just outside the centre disc...
const SPOKE_OUTER = 103; // ...to just inside the face
const CENTRE_RADIUS = 30; // the centre disc holding the step number
const HAND_INNER = 32; // the hand starts just outside the centre disc

// The scale.
const TICKS_PER_SIXTEENTH = 4; // 64 ticks per bar
const TICK_COUNT = STEPS_PER_BAR * TICKS_PER_SIXTEENTH; // ticks around the scale
const TICKS_PER_BEAT = TICKS_PER_SIXTEENTH * 4; // every 16th tick falls on a beat
const SCALE_OPACITY = 0.35; // the scale circle's stroke opacity
const HAIRLINE = 0.6; // thin stroke width (SVG units)
const BEAT_TICK_OPACITY = 0.9,
  SIXTEENTH_TICK_OPACITY = 0.5,
  MINOR_TICK_OPACITY = 0.22; // stroke opacities
const BEAT_TICK_WIDTH = 1.4; // the ticks on 1, 5, 9 and 13 (SVG units)
const NUMBER_BASELINE_SHIFT = 2.3; // centres the numbers' cap height on the radius (SVG units)
const BEAT_NUMBER_SIZE = 8,
  OFFBEAT_NUMBER_SIZE = 6; // font sizes (SVG units)
const BEAT_NUMBER_OPACITY = 0.95,
  OFFBEAT_NUMBER_OPACITY = 0.45;
const BEAT_SPOKE_OPACITY = 0.18,
  OFFBEAT_SPOKE_OPACITY = 0.06;
const SPOKE_WIDTH = 0.5; // spokes and voice rings (SVG units)
const OFFBEAT_SPOKE_DASH = '1 2';
const VOICE_RING_OPACITY = 0.18;

// The hand and its trail.
const TRAIL_OPACITY = 0.9;
const TRAIL_PEAK_OPACITY = 0.14; // gradient opacity at the hand's edge
const TRAIL_SIXTEENTHS = 2.5; // how far the trailing sector reaches behind the hand
const HAND_WIDTH = 1.2; // SVG units
const HAND_TIP_RADIUS = 2.4; // SVG units
const CENTRE_OPACITY = 0.4; // the centre disc's outline

// Centre text: y offset and font size (SVG units).
const STEP_NUMBER_Y = 6,
  STEP_NUMBER_SIZE = 20;
const BEAT_LABEL_Y = 17,
  CUE_Y = -12,
  SMALL_TEXT_SIZE = 5.2;
const BEAT_LABEL_OPACITY = 0.55;
const SMALL_TEXT_SPACING = 0.6; // letter spacing (SVG units)

// The fermata over the centre during a cut.
const FERMATA_ARC = 'M-8 -20 A8 8 0 0 1 8 -20'; // arc of radius 8 above the number
const FERMATA_WIDTH = 1.6;
const FERMATA_DOT_Y = -22.5,
  FERMATA_DOT_RADIUS = 1.5;

// Rhythm shapes and dots.
const SHAPE_VOICES = ['agogo', 'answer', 'main'];
const SHAPE_GUIDE_OPACITY = 0.13,
  SHAPE_GUIDE_DASH = '1.5 2'; // the dashed full shape
const SHAPE_LINE_OPACITY = 0.9,
  SHAPE_LINE_WIDTH = 1.1; // the shape drawn so far
const AGOGO_HIGH_SCALE = 0.7; // high bell dots are smaller
const DOT_VELOCITY_FLOOR = 0.65,
  DOT_VELOCITY_SPAN = 0.35; // dot size = floor + span × velocity
const OFFBEAT_RING_GAP = 3.2; // contratempo ring, outside the dot (SVG units)
const OFFBEAT_RING_WIDTH = 0.8,
  OFFBEAT_RING_DASH = '1.2 1.2';
const MUTED_DOT_OPACITY = 0.25; // outline of a voice that is silent this bar

// Centre cue timing.
const CUT_SILENCE_AFTER = 0.06; // fraction of a cut bar before the silence shows
const COUNTDOWN_AFTER = 0.25; // fraction of a cut bar before "VOLTA EM n" replaces "CORTE"
const BEATS_PER_BAR = 4;
const WHISTLE_WINDOW = 1.1; // seconds a whistle keeps the cue
const OFFBEAT_WINDOW = 0.2; // seconds a contratempo hit keeps the cue

// Dot flash on a hit.
const FLASH_WINDOW = 0.6; // seconds after a hit that it can still flash
const FLASH_DECAY = 0.12; // seconds, exponential decay constant
const FLASH_GROWTH = 1.2; // radius grows by up to this fraction
const DOT_REST_OPACITY = 0.72,
  DOT_FLASH_OPACITY = 0.28; // opacity = rest + flash part
const MUTED_DOT_FILL_OPACITY = 0.5;

const angleOf = sixteenth => (sixteenth / STEPS_PER_BAR) * Math.PI * 2 - Math.PI / 2;
const pointAt = (radius, sixteenth) => [radius * Math.cos(angleOf(sixteenth)), radius * Math.sin(angleOf(sixteenth))];

/** The wheel's geometry, for the background that draws around it. */
export const SCOPE_GEOMETRY = Object.freeze({ radius: OUTER, viewBoxRadius: VIEWBOX_RADIUS, angleOf });

function drawScale(svg) {
  const g = svgElement('g', {}, svg);
  svgElement('circle', { r: FACE_RADIUS, fill: TINTS.scopeFace }, g);
  svgElement('circle', { r: OUTER, fill: 'none', stroke: COLORS.fg, 'stroke-opacity': SCALE_OPACITY, 'stroke-width': HAIRLINE }, g);
  for (let i = 0; i < TICK_COUNT; i++) {
    // ticks every 64th of the bar, longer on each sixteenth, strongest on each beat
    const sixteenth = i / TICKS_PER_SIXTEENTH,
      isBeat = i % TICKS_PER_BEAT === 0,
      isSixteenth = i % TICKS_PER_SIXTEENTH === 0;
    const [x1, y1] = pointAt(isSixteenth ? FACE_RADIUS : MINOR_TICK_INNER, sixteenth),
      [x2, y2] = pointAt(OUTER, sixteenth);
    svgElement(
      'line',
      {
        x1: fixed2(x1),
        y1: fixed2(y1),
        x2: fixed2(x2),
        y2: fixed2(y2),
        stroke: COLORS.fg,
        'stroke-opacity': isBeat ? BEAT_TICK_OPACITY : isSixteenth ? SIXTEENTH_TICK_OPACITY : MINOR_TICK_OPACITY,
        'stroke-width': isBeat ? BEAT_TICK_WIDTH : HAIRLINE,
      },
      g,
    );
  }
  for (let sixteenth = 0; sixteenth < STEPS_PER_BAR; sixteenth++) {
    const onBeat = !isOffbeat(sixteenth),
      [x, y] = pointAt(NUMBER_RADIUS, sixteenth);
    svgElement(
      'text',
      {
        x: fixed2(x),
        y: fixed2(y + NUMBER_BASELINE_SHIFT),
        'text-anchor': 'middle',
        fill: COLORS.fg,
        'fill-opacity': onBeat ? BEAT_NUMBER_OPACITY : OFFBEAT_NUMBER_OPACITY,
        'font-family': MONO_FONT,
        'font-size': onBeat ? BEAT_NUMBER_SIZE : OFFBEAT_NUMBER_SIZE,
        'font-weight': onBeat ? 700 : 400,
      },
      g,
    ).textContent = sixteenth + 1;
    const [x1, y1] = pointAt(SPOKE_INNER, sixteenth),
      [x2, y2] = pointAt(SPOKE_OUTER, sixteenth);
    svgElement(
      'line',
      {
        x1: fixed2(x1),
        y1: fixed2(y1),
        x2: fixed2(x2),
        y2: fixed2(y2),
        stroke: COLORS.fg,
        'stroke-opacity': onBeat ? BEAT_SPOKE_OPACITY : OFFBEAT_SPOKE_OPACITY,
        'stroke-width': SPOKE_WIDTH,
        'stroke-dasharray': onBeat ? 'none' : OFFBEAT_SPOKE_DASH,
      },
      g,
    );
  }
  for (const voice of INSTRUMENTS)
    if (voice !== 'stick')
      svgElement(
        'circle',
        { r: VOICES[voice].ring, fill: 'none', stroke: VOICES[voice].color, 'stroke-opacity': VOICE_RING_OPACITY, 'stroke-width': SPOKE_WIDTH },
        g,
      );
}

export function createScope(svg) {
  const side = 2 * VIEWBOX_RADIUS;
  svg.setAttribute('viewBox', `${-VIEWBOX_RADIUS} ${-VIEWBOX_RADIUS} ${side} ${side}`);
  drawScale(svg);
  const shapeLayer = svgElement('g', {}, svg);
  const trail = svgElement('path', { fill: 'url(#trailGradient)', opacity: TRAIL_OPACITY }, svg);
  const gradient = svgElement('linearGradient', { id: 'trailGradient', x1: 0, y1: 0, x2: 1, y2: 0 }, svgElement('defs', {}, svg));
  svgElement('stop', { offset: 0, 'stop-color': COLORS.fg, 'stop-opacity': 0 }, gradient);
  svgElement('stop', { offset: 1, 'stop-color': COLORS.fg, 'stop-opacity': TRAIL_PEAK_OPACITY }, gradient);
  const dotLayer = svgElement('g', {}, svg);
  const hand = svgElement('g', {}, svg);
  svgElement('line', { x1: 0, y1: -HAND_INNER, x2: 0, y2: -(OUTER + 1), stroke: COLORS.fg, 'stroke-width': HAND_WIDTH }, hand);
  svgElement('circle', { cx: 0, cy: -(OUTER + 1), r: HAND_TIP_RADIUS, fill: COLORS.fg }, hand);
  svgElement('circle', { r: CENTRE_RADIUS, fill: COLORS.void, stroke: COLORS.fg, 'stroke-opacity': CENTRE_OPACITY, 'stroke-width': HAIRLINE }, svg);
  const centreText = (y, size, extra) =>
    svgElement('text', { y, 'text-anchor': 'middle', fill: COLORS.fg, 'font-family': MONO_FONT, 'font-size': size, ...extra }, svg);
  const stepNumber = centreText(STEP_NUMBER_Y, STEP_NUMBER_SIZE, { 'font-weight': 700 });
  const beatLabel = centreText(BEAT_LABEL_Y, SMALL_TEXT_SIZE, { 'fill-opacity': BEAT_LABEL_OPACITY, 'letter-spacing': SMALL_TEXT_SPACING });
  const fermata = svgElement('g', {}, svg); // 𝄐 while the band holds the silence after a cut
  fermata.style.opacity = 0;
  svgElement('path', { d: FERMATA_ARC, fill: 'none', stroke: COLORS.fg, 'stroke-width': FERMATA_WIDTH, 'stroke-linecap': 'round' }, fermata);
  svgElement('circle', { cx: 0, cy: FERMATA_DOT_Y, r: FERMATA_DOT_RADIUS, fill: COLORS.fg }, fermata);
  const cue = centreText(CUE_Y, SMALL_TEXT_SIZE, { fill: COLORS.amber, 'letter-spacing': SMALL_TEXT_SPACING });

  let dots = [],
    shapes = [];

  /** Rebuild the dots and shapes for one bar. */
  function build(scene, barInScene) {
    dotLayer.textContent = '';
    shapeLayer.textContent = '';
    dots = [];
    shapes = [];
    const { voices, playing } = barTimeline(scene.start + barInScene),
      active = new Set(playing);
    for (const voice of SHAPE_VOICES) {
      // the shape each rhythm draws on its ring, grown hit by hit
      if (!active.has(voice) || voices[voice].length < 2) continue;
      const { ring, color } = VOICES[voice];
      const positions = voices[voice].map(entry => entry.position);
      const points = positions.map(p => pointAt(ring, p));
      svgElement(
        'path',
        {
          d: `${polylinePath(points)} Z`,
          fill: 'none',
          stroke: color,
          'stroke-opacity': SHAPE_GUIDE_OPACITY,
          'stroke-width': HAIRLINE,
          'stroke-dasharray': SHAPE_GUIDE_DASH,
        },
        shapeLayer,
      );
      const line = svgElement(
        'path',
        {
          d: '',
          fill: 'none',
          stroke: color,
          'stroke-opacity': SHAPE_LINE_OPACITY,
          'stroke-width': SHAPE_LINE_WIDTH,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
        },
        shapeLayer,
      );
      shapes.push({ voice, points, positions, line, drawn: [] });
    }
    for (const voice of VOICE_ORDER) {
      const { ring, size, color } = VOICES[voice];
      if (!ring) continue;
      const on = active.has(voice);
      for (const { hit: h, position } of voices[voice]) {
        const [x, y] = pointAt(ring, position);
        const radius = size * (voice === 'agogo' && h.tone === 'high' ? AGOGO_HIGH_SCALE : 1) * (DOT_VELOCITY_FLOOR + DOT_VELOCITY_SPAN * h.velocity);
        if (on && isAlfaia(voice) && isOffbeat(h.step))
          svgElement(
            'circle',
            {
              cx: fixed2(x),
              cy: fixed2(y),
              r: radius + OFFBEAT_RING_GAP,
              fill: 'none',
              stroke: COLORS.fg,
              'stroke-width': OFFBEAT_RING_WIDTH,
              'stroke-dasharray': OFFBEAT_RING_DASH,
            },
            dotLayer,
          );
        const element = svgElement(
          'circle',
          {
            cx: fixed2(x),
            cy: fixed2(y),
            r: radius,
            fill: on ? color : 'none',
            stroke: color,
            'stroke-width': HAIRLINE,
            'stroke-opacity': on ? 1 : MUTED_DOT_OPACITY,
          },
          dotLayer,
        );
        dots.push({ element, position, radius, on });
      }
    }
  }

  /** The text over the centre number: cues for the special bars, contratempo, or the baque's name. */
  function centreCue(position, scene, mode, inBar) {
    const silence = mode === 'cut' && inBar > CUT_SILENCE_AFTER,
      isEnd = scene.isEnd;
    const whistle = recentHits(position, WHISTLE_WINDOW).some(h => h.voice === 'whistle');
    const offbeat = recentHits(position, OFFBEAT_WINDOW).some(h => isAlfaia(h.voice) && isOffbeat(h.hit.step));
    fermata.style.opacity = silence ? 1 : 0;
    const text =
      silence && !isEnd && inBar >= COUNTDOWN_AFTER
        ? COPY.centre.comeBack(BEATS_PER_BAR - Math.floor(inBar * BEATS_PER_BAR))
        : whistle
          ? COPY.centre.whistle
          : mode === 'roll'
            ? COPY.centre.roll
            : mode === 'break'
              ? COPY.centre.break
              : silence
                ? isEnd
                  ? COPY.centre.end
                  : COPY.centre.cut
                : offbeat
                  ? COPY.centre.offbeat
                  : scene.named
                    ? COPY.patterns[scene.pattern].toUpperCase()
                    : '';
    const loud = offbeat || whistle || mode !== 'normal';
    setText(cue, text);
    setAttr(cue, 'fill', loud ? COLORS.fg : COLORS.amber);
    setAttr(cue, 'font-weight', loud ? 700 : 400);
  }

  /** Per-frame update at `position` (bars); returns the partly drawn shapes. */
  function update(position, scene, barInScene) {
    const inBar = position - Math.floor(position),
      sixteenth = inBar * STEPS_PER_BAR;
    setAttr(hand, 'transform', `rotate(${(inBar * 360).toFixed(2)})`);
    const from = angleOf(sixteenth - TRAIL_SIXTEENTHS),
      to = angleOf(sixteenth); // trailing sector behind the hand
    trail.setAttribute(
      'd',
      `M0 0 L${fixed2(Math.cos(from) * OUTER)} ${fixed2(Math.sin(from) * OUTER)} A${OUTER} ${OUTER} 0 0 1 ${fixed2(Math.cos(to) * OUTER)} ${fixed2(Math.sin(to) * OUTER)} Z`,
    );
    setText(stepNumber, pad2(Math.floor(sixteenth) + 1));
    setText(beatLabel, COPY.centre.beat(Math.floor(inBar * BEATS_PER_BAR) + 1));
    centreCue(position, scene, scene.mode(barInScene), inBar);
    for (const shape of shapes) {
      // grow the shape hit by hit; it closes at the end of the cycle
      const { points, positions } = shape,
        count = points.length,
        drawn = [];
      let i = 0;
      while (i < count && positions[i] <= sixteenth) drawn.push(points[i++]);
      if (i > 0) {
        const a = points[i - 1],
          b = i < count ? points[i] : points[0];
        const p0 = positions[i - 1],
          p1 = i < count ? positions[i] : STEPS_PER_BAR + positions[0];
        const u = Math.min(1, Math.max(0, (sixteenth - p0) / (p1 - p0)));
        drawn.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
      }
      shape.drawn = drawn;
      setAttr(shape.line, 'd', polylinePath(drawn));
    }
    for (const dot of dots) {
      const age = ((sixteenth - dot.position) / STEPS_PER_BAR) * BAR_SECONDS,
        flash = dot.on && age >= 0 && age < FLASH_WINDOW ? Math.exp(-age / FLASH_DECAY) : 0;
      const r = (dot.radius * (1 + FLASH_GROWTH * flash)).toFixed(2),
        opacity = dot.on ? (DOT_REST_OPACITY + DOT_FLASH_OPACITY * flash).toFixed(3) : String(MUTED_DOT_FILL_OPACITY);
      // write only what changed: most dots rest most of the time
      if (dot.r !== r) {
        dot.r = r;
        dot.element.setAttribute('r', r);
      }
      if (dot.opacity !== opacity) {
        dot.opacity = opacity;
        dot.element.style.opacity = opacity;
      }
    }
    return shapes;
  }

  /** Per-frame update; returns the shapes as drawn so far, for the background. */
  return { build, update };
}
