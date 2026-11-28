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

/** Set an element's text only when it differs, so a per-frame update causes no needless DOM work. */
export const setText = (element, text) => {
  const value = String(text);
  if (element.textContent !== value) element.textContent = value;
};

const writtenStyles = new WeakMap(); // element → the inline values setStyle last wrote
/**
 * Set an inline style property only when it differs from the value this function last wrote, so a
 * per-frame update writes no unchanged style. It compares with its own record, not `element.style`,
 * because the browser rewrites some values on reading (a text-shadow's colour moves first).
 */
export const setStyle = (element, name, value) => {
  const text = String(value);
  if (!writtenStyles.has(element)) writtenStyles.set(element, {});
  const written = writtenStyles.get(element);
  if (written[name] === text) return;
  written[name] = text;
  element.style[name] = text;
};

/** Set an attribute only when it differs. */
export const setAttr = (element, name, value) => {
  const text = String(value);
  if (element.getAttribute(name) !== text) element.setAttribute(name, text);
};

/**
 * Pause the show while the page is hidden, as a video does, and resume it where it stopped when the
 * page is shown again (#45, D35). A hidden page's timers are throttled, so the look-ahead scheduler
 * would drop most hits; pausing never plays wrong. A show paused before it was hidden stays paused.
 * `show` has `playing()`, `pause()` and `play()`. Returns a function that removes the listener.
 */
export function pauseWhileHidden(doc, show) {
  let pausedByHiding = false;
  const onChange = () => {
    if (doc.hidden) {
      if (!show.playing()) return;
      pausedByHiding = true;
      show.pause();
    } else if (pausedByHiding) {
      pausedByHiding = false;
      show.play();
    }
  };
  doc.addEventListener('visibilitychange', onChange);
  return () => doc.removeEventListener('visibilitychange', onChange);
}

/** Whether this browser has the encoders the video export needs at all (a quick check, no download). */
export const canExportVideo = () => typeof VideoEncoder === 'function' && typeof AudioEncoder === 'function';
