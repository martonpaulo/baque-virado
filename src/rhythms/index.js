// The rhythms the site can show, and the one this page load shows: `?ritmo=<id>` picks it, and an
// unknown or missing id falls back to the first (maracatu). Add a rhythm by adding its package here.
import { BREGA_FUNK } from './brega-funk.js';
import { COCO_XAMBA } from './coco-xamba.js';
import { FORRO_PE_DE_SERRA } from './forro.js';
import { MARACATU } from './maracatu.js';

export const RHYTHMS = [MARACATU, COCO_XAMBA, FORRO_PE_DE_SERRA, BREGA_FUNK];
export const RHYTHM_PARAMETER = 'ritmo';

/** The rhythm a query string (`location.search`) asks for, or the first one. */
export function rhythmFor(search, rhythms = RHYTHMS) {
  const id = new URLSearchParams(search).get(RHYTHM_PARAMETER);
  return rhythms.find(rhythm => rhythm.id === id) || rhythms[0];
}

/**
 * The rhythm selector's entries: one link per rhythm, the current one marked. Empty while there is
 * only one rhythm, so the selector is not shown. A chip shows the rhythm's short name (`copy.selector`)
 * when it has one, so it fits on one line in the side column.
 */
export function rhythmChoices(current, rhythms = RHYTHMS) {
  if (rhythms.length < 2) return [];
  return rhythms.map(rhythm => ({
    id: rhythm.id,
    label: rhythm.copy.selector || rhythm.copy.name,
    href: `?${RHYTHM_PARAMETER}=${rhythm.id}`,
    current: rhythm === current,
  }));
}

/** The rhythm this page load shows (Node, which has no location, gets the first). */
export const RHYTHM = rhythmFor(globalThis.location?.search ?? '');
