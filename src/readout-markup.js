// Markup pieces of the readout under the wheel, shared by the engine and every rhythm's layouts.

// `data-inst` names the instrument a part shows, so a muted instrument's parts show disabled
const inst = id => (id ? ` data-inst="${id}"` : '');
export const label = (text, color, id) => `<span class="k"${inst(id)}${color ? ` style="color:${color}"` : ''}>${text}</span>`;
export const row = (left, right, id) => `<div class="row"${inst(id)}>${left}<span>${right}</span></div>`;
export const stat = (value, text, color) => `<div><b style="color:${color}">${value}</b>${label(text)}</div>`;
export const stats = (modifier, ...cells) => `<div class="stats ${modifier}">${cells.join('')}</div>`;
