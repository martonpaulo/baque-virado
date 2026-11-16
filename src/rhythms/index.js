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

/** The rhythm this page load shows (Node, which has no location, gets the first). */
export const RHYTHM = rhythmFor(globalThis.location?.search ?? '');
