// The rhythms the site can show, and the one this page load shows: `?ritmo=<id>` picks it, and an
// unknown or missing id falls back to the first (maracatu). Add a rhythm by adding its package here.
import { MARACATU } from './maracatu.js';

export const RHYTHMS = [MARACATU];
export const RHYTHM_PARAMETER = 'ritmo';

/** The rhythm a query string (`location.search`) asks for, or the first one. */
export function rhythmFor(search, rhythms = RHYTHMS) {
  const id = new URLSearchParams(search).get(RHYTHM_PARAMETER);
  return rhythms.find(rhythm => rhythm.id === id) || rhythms[0];
}

/**
 * The rhythm selector's entries: one link per rhythm, the current one marked. Empty while there is
 * only one rhythm, so the selector is not shown.
 */
export function rhythmChoices(current, rhythms = RHYTHMS) {
  if (rhythms.length < 2) return [];
  return rhythms.map(rhythm => ({ id: rhythm.id, label: rhythm.copy.name, href: `?${RHYTHM_PARAMETER}=${rhythm.id}`, current: rhythm === current }));
}

/** The rhythm this page load shows (Node, which has no location, gets the first). */
export const RHYTHM = rhythmFor(globalThis.location?.search ?? '');
