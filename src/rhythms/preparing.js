// The words of the rhythms that have a path but no show yet (a route in index.js with no package).
// tools/build-site.mjs writes their pages; remove a rhythm's entry when its package lands.

/** Each rhythm being prepared: its selector chip and the name its page title shows. */
export const PREPARING = {
  manguebeat: { selector: 'manguebeat', name: 'Manguebeat' },
  brega: { selector: 'brega', name: 'Brega' },
};

/** The one line a rhythm being prepared shows in place of its show. */
export const preparingLine = rhythm => `O show de ${rhythm.selector} está sendo preparado.`;
