// Small helpers with no knowledge of the music or the page layout.

const SECONDS_PER_MINUTE = 60;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Smoothstep easing of a 0..1 progress value. */
export const smooth = progress => {
  const u = clamp(progress, 0, 1);
  return u * u * (3 - 2 * u);
};

export const lerp = (from, to, amount) => from + (to - from) * amount;

/**
 * Deterministic pseudo-random number in [0, 1) for an integer seed.
 * Every hit and every glyph uses it, so playback and video export always match.
 * The numbers are the mixing constants of the integer hash; they are the algorithm, not settings.
 */
export const hash = seed => {
  let t = (seed * 9301 + 49297) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const pad2 = n => String(n).padStart(2, '0');

/** Seconds as m:ss. */
export const formatClock = seconds => `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${pad2(Math.floor(seconds % SECONDS_PER_MINUTE))}`;

/** Seconds as mm:ss.mmm. */
export const formatPrecise = seconds => `${pad2(Math.floor(seconds / SECONDS_PER_MINUTE))}:${(seconds % SECONDS_PER_MINUTE).toFixed(3).padStart(6, '0')}`;

export const fixed2 = n => n.toFixed(2);

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Create an SVG element with attributes, optionally appended to a parent. */
export function svgElement(tag, attributes = {}, parent = null) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const name in attributes) element.setAttribute(name, attributes[name]);
  if (parent) parent.appendChild(element);
  return element;
}

/** SVG path data through a list of [x, y] points (open path). */
export const polylinePath = points => points.map(([x, y], i) => `${i ? 'L' : 'M'}${fixed2(x)} ${fixed2(y)}`).join(' ');

/** Restart the short CSS entrance animation on an element. */
export function replayFade(element) {
  element.classList.remove('fade');
  void element.offsetWidth;
  element.classList.add('fade');
}

/** A pill button used for scenes and sound choices. */
export function chipButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}
