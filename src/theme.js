// Palette shared by the canvas, the SVG wheel and the score. The one owner of each colour: the
// custom properties of styles.css mirror it, and tests/styles.test.js keeps them equal.
export const COLORS = {
  void: '#07060b',
  fg: '#ece8ff',
  amber: '#ffc53d',
  ember: '#ff5a36',
  bone: '#f2efe6', // stick
  ice: '#3fd7ff', // caixa
  magenta: '#ff4fa3', // agbê
  violet: '#9b7bff', // ganzá
  acid: '#39f2a5', // agogô
  white: '#ffffff', // whistle
};

/** What a colour means, pointing at the palette (styles.css: --accent, --main-hand, --answer-hand). */
export const ROLES = {
  accent: COLORS.amber, // the interface's highlight: Play, the picked chip, the eyebrow, the wheel's cue
  mainHand: COLORS.amber, // the alfaia's main hand
  answerHand: COLORS.ember, // the alfaia's answer hand
};

/** `rgba(r,g,b,alpha)` builder for a palette hex colour; the alpha is written exactly as given. */
const rgbaOf = hex => {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
  return alpha => `rgba(${channels},${alpha})`;
};

/** Foreground colour at a given opacity. */
export const fgAlpha = rgbaOf(COLORS.fg);

/** Background colour at a given opacity. */
export const voidAlpha = rgbaOf(COLORS.void);

/** Stick colour at a given opacity. */
export const boneAlpha = rgbaOf(COLORS.bone);

const iceAlpha = rgbaOf(COLORS.ice),
  magentaAlpha = rgbaOf(COLORS.magenta);

/** Fixed translucent colours for the canvas, SVG and inline styles (styles.css keeps its own --split-* for the brand heading). */
export const TINTS = {
  scopeFace: voidAlpha('.72'), // the wheel's dark disc behind the scale
  swingRing: iceAlpha('.16'), // the swung ring set of the moiré
  titleSplitLeft: magentaAlpha('.8'), // title's left chromatic split
  titleSplitRight: iceAlpha('.8'), // title's right chromatic split
};

/** The mono stack, as styles.css --f-mono spells it; SVG attributes and canvas `font` strings take it as is. */
export const MONO_FONT = '"JetBrains Mono", ui-monospace, Menlo, monospace';
