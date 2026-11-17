// The rhythms the site can show, and the one this page load shows. Each route id has its own path
// (`/<id>`, a page tools/build-site.mjs writes at deploy time); `?ritmo=<id>` still picks a rhythm
// and redirects to its path. An unknown or missing id falls back to the first (maracatu), which `/`
// shows. Add a rhythm by adding its package here; a route id with no package yet is a rhythm being
// prepared (`preparing.js`): its path shows the selector and one line, no show.
import { BREGA_FUNK } from './brega-funk.js';
import { COCO_XAMBA } from './coco-xamba.js';
import { FORRO_PE_DE_SERRA } from './forro.js';
import { MARACATU } from './maracatu.js';
import { PREPARING } from './preparing.js';

export const RHYTHMS = [MARACATU, COCO_XAMBA, FORRO_PE_DE_SERRA, BREGA_FUNK];
export const RHYTHM_PARAMETER = 'ritmo';
/** Every public path, in the selector's order: shipped rhythms and rhythms being prepared. */
export const ROUTES = ['maracatu', 'coco', 'frevo', 'forro', 'manguebeat', 'brega-romantico', 'brega-funk'];

/** The route id a location names: its last path segment when that is a route, else `?ritmo=`. */
export function routeIdFor(pathname, search, routes = ROUTES) {
  const segment = pathname
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/\.html$/, '');
  if (routes.includes(segment)) return segment;
  return new URLSearchParams(search).get(RHYTHM_PARAMETER);
}

/** The rhythm a location asks for, or the first one. */
export function rhythmFor(search, rhythms = RHYTHMS, pathname = '/') {
  const id = routeIdFor(pathname, search);
  return rhythms.find(rhythm => rhythm.id === id) || rhythms[0];
}

/** The route ids that have no rhythm package yet. */
export const preparingIds = (rhythms = RHYTHMS, routes = ROUTES) => routes.filter(id => !rhythms.some(rhythm => rhythm.id === id));

/** The path `?ritmo=<id>` moves to (`/<id>`, the rest of the query kept), or null when it names no route. */
export function redirectFor(search, routes = ROUTES) {
  const params = new URLSearchParams(search);
  const id = params.get(RHYTHM_PARAMETER);
  if (!routes.includes(id)) return null;
  params.delete(RHYTHM_PARAMETER);
  const rest = params.toString();
  return `/${id}${rest ? `?${rest}` : ''}`;
}

/**
 * The rhythm selector's entries: one link per route, the current one marked; a rhythm being prepared
 * links to its path too. Empty with fewer than two routes, so the selector is not shown. A chip shows
 * the rhythm's short name (`copy.selector`) when it has one, so it fits on one line in the side column.
 */
export function rhythmChoices(currentId, rhythms = RHYTHMS, routes = ROUTES) {
  const listed = routes.filter(id => rhythms.some(rhythm => rhythm.id === id) || PREPARING[id]);
  if (listed.length < 2) return [];
  return listed.map(id => {
    const rhythm = rhythms.find(candidate => candidate.id === id);
    return {
      id,
      label: rhythm ? rhythm.copy.selector || rhythm.copy.name : PREPARING[id].selector,
      href: `/${id}`,
      current: id === currentId,
    };
  });
}

const LOCATION = globalThis.location; // Node has none: it gets the first rhythm
/** The rhythm this page load shows. */
export const RHYTHM = rhythmFor(LOCATION?.search ?? '', RHYTHMS, LOCATION?.pathname ?? '/');
