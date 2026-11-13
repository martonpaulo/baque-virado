// Scene title and eyebrow. The old title dissolves into glyphs, the new one decodes letter by
// letter — a pure function of the position, so the video export matches playback. Paused, it rests.

import { COPY } from './copy.js';
import { SCENES } from './show.js';
import { TINTS } from './theme.js';
import { hash } from './util.js';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
const DECODE_BARS = 0.12,
  DISSOLVE_BARS = 0.06; // ≈0.25 s in, ≈0.12 s out
const GLYPH_RATE = 48; // glyph changes per bar
const EMPTY_EYEBROW = '\u00a0'; // no-break space keeps the eyebrow's line height
const GLYPH_SEED_INDEX = 131,
  GLYPH_SEED_TIME = 7; // hash seed weights for letter index and glyph tick
const DECODE_SALT = 1,
  DISSOLVE_SALT = 2; // keep the two scrambles from showing the same glyphs
const DECODE_LEAD = 3; // letters' worth of pure noise before the first one decodes
const EYEBROW_SPEED = 1.6; // the eyebrow types out this much faster than the decode

// Title size (cqw): start large, shrink until it fits.
const TITLE_MAX_SIZE = 14,
  TITLE_MIN_SIZE = 6,
  TITLE_SIZE_STEP = 0.5;

// Glitch look; `glitch` runs 0..1.
const SPLIT_REST = 0.45; // cqw of chromatic split at rest...
const SPLIT_GLITCH = 1.6; // ...plus this much at full glitch
const JITTER = 2.4; // cqw, peak-to-peak horizontal shake at full glitch
const SKEW = 6; // degrees at full glitch
const GLITCH_FADE = 0.25; // opacity lost at full glitch

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

const scramble = (text, revealed, position, salt) =>
  [...text]
    .map((ch, i) =>
      ch === ' '
        ? ' '
        : i < revealed
          ? ch
          : GLYPHS[Math.floor(hash(i * GLYPH_SEED_INDEX + Math.floor(position * GLYPH_RATE) * GLYPH_SEED_TIME + salt) * GLYPHS.length)],
    )
    .join('');

export function createTitle(head) {
  let eyebrowEl = null,
    titleEl = null;

  /** Shrink the title until it fits the width (the head's height is fixed so the wheel never moves). */
  function fit() {
    if (!titleEl) return;
    let size = TITLE_MAX_SIZE;
    titleEl.style.fontSize = `${size}cqw`;
    while (size > TITLE_MIN_SIZE && titleEl.scrollWidth > head.clientWidth) {
      size -= TITLE_SIZE_STEP;
      titleEl.style.fontSize = `${size}cqw`;
    }
  }

  function build(scene) {
    const { eyebrow, title } = COPY.scenes[scene.id];
    head.innerHTML = `<div class="eyebrow">${eyebrow}</div><div class="title">${title}</div>`;
    eyebrowEl = head.firstElementChild;
    titleEl = head.lastElementChild;
    fit();
  }

  /** `settled`: the show is paused (live), so the title rests fully decoded instead of mid-glitch. */
  function update(position, scene, settled = false) {
    if (!titleEl) return;
    const { eyebrow, title } = COPY.scenes[scene.id],
      index = SCENES.indexOf(scene);
    const sinceStart = position - scene.start,
      untilEnd = scene.start + scene.bars - position;
    const full = title.toUpperCase(),
      length = full.length;
    let shownTitle = full,
      shownEyebrow = eyebrow,
      glitch = 0;
    if (!settled && index > 0 && sinceStart < DECODE_BARS) {
      const u = sinceStart / DECODE_BARS;
      shownTitle = scramble(full, Math.max(0, Math.floor(u * (length + DECODE_LEAD)) - DECODE_LEAD), position, DECODE_SALT);
      shownEyebrow = eyebrow.slice(0, Math.floor(Math.min(1, u * EYEBROW_SPEED) * eyebrow.length));
      glitch = 1 - u;
    } else if (!settled && index < SCENES.length - 1 && untilEnd < DISSOLVE_BARS) {
      const u = 1 - untilEnd / DISSOLVE_BARS;
      shownTitle = scramble(full, Math.ceil((1 - u) * length), position, DISSOLVE_SALT);
      shownEyebrow = eyebrow.slice(0, Math.ceil((1 - u) * eyebrow.length));
      glitch = u;
    }
    if (titleEl.textContent !== shownTitle) titleEl.textContent = shownTitle;
    const eyebrowText = shownEyebrow || EMPTY_EYEBROW;
    if (eyebrowEl.textContent !== eyebrowText) eyebrowEl.textContent = eyebrowText;
    const split = (SPLIT_REST + glitch * SPLIT_GLITCH).toFixed(2),
      jitter = glitch ? ((hash(Math.floor(position * GLYPH_RATE)) - 0.5) * JITTER * glitch).toFixed(2) : 0;
    titleEl.style.textShadow = `-${split}cqw 0 0 ${TINTS.titleSplitLeft}, ${split}cqw 0 0 ${TINTS.titleSplitRight}`;
    // reduced motion keeps the letter scramble and the fade, without the shake and skew
    titleEl.style.transform = glitch && !REDUCED_MOTION.matches ? `translateX(${jitter}cqw) skewX(${(-glitch * SKEW).toFixed(1)}deg)` : '';
    titleEl.style.opacity = (1 - glitch * GLITCH_FADE).toFixed(2);
  }

  return { build, fit, update };
}
