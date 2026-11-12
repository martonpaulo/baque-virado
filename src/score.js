/*
 * score.js - one-line percussion notation as an SVG string.
 * ES module, no dependencies. Exports renderScore(opts).
 *
 * svg({ bars: [{ main: [], answer: [], stick: [] }, ...],
 *       colors: { ink, main, answer, stick, dim },
 *       timeSig: bool, repeat: null|number, accentOffbeats: bool, height: 60 })
 *   -> { markup, slotX, width, height }
 *
 * Geometry is built in base units for a 60-unit-tall staff, then scaled to
 * opts.height. slotX holds the notehead x of every sixteenth slot (16 per bar).
 */

const BASE_H = 60;
const L = 42; // staff line y
const SW = 9; // width of one sixteenth slot
const PAD = 8; // bar start to first slot centre
const BAR_W = PAD + 16 * SW;
const STEM_TOP = 18; // all stems end here (horizontal beams)
const STEM_W = 1.2;
const STEM_DX = 3.2; // stem x offset from the notehead centre
const BEAM_H = 3;
const BEAM_GAP = 1.5;
const STUB = 4.6; // partial (secondary) beam length
const HEAD_RX = 3.6,
  HEAD_RY = 2.5,
  HEAD_DY = 3.0,
  X_HALF = 2.9;
const S = 5; // staff space, unit for rest shapes
const THIN = 1.1,
  THICK = 3;
const BAR_TOP = L - 10,
  BAR_BOT = L + 10;
const DOT_R = 1.15;
const ACCENT_Y = 12;

// Low to high: answer in the space below, stick on the line, main above.
const HANDS = [
  { key: 'answer', step: -1 },
  { key: 'stick', step: 0 },
  { key: 'main', step: 1 },
];

function n(v) {
  return String(Math.round(v * 100) / 100);
}

function line(x1, y1, x2, y2, w, color, cap) {
  return (
    '<line x1="' +
    n(x1) +
    '" y1="' +
    n(y1) +
    '" x2="' +
    n(x2) +
    '" y2="' +
    n(y2) +
    '" stroke="' +
    color +
    '" stroke-width="' +
    n(w) +
    '" stroke-linecap="' +
    (cap || 'butt') +
    '"/>'
  );
}
function rect(x, y, w, h, color) {
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${color}"/>`;
}
function circle(cx, cy, r, color) {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${color}"/>`;
}
function strokePath(d, w, color) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
// Point helper for shapes drawn in staff-space units around (cx, cy).
function P(cx, cy, x, y) {
  return `${n(cx + x * S)} ${n(cy + y * S)}`;
}

/* ---------- noteheads, stems, flags ---------- */

function oval(cx, cy, color) {
  return (
    '<ellipse cx="' +
    n(cx) +
    '" cy="' +
    n(cy) +
    '" rx="' +
    HEAD_RX +
    '" ry="' +
    HEAD_RY +
    '" transform="rotate(-20 ' +
    n(cx) +
    ' ' +
    n(cy) +
    ')" fill="' +
    color +
    '"/>'
  );
}
function xhead(cx, cy, color) {
  return (
    line(cx - X_HALF, cy - X_HALF, cx + X_HALF, cy + X_HALF, 1.35, color, 'round') +
    line(cx - X_HALF, cy + X_HALF, cx + X_HALF, cy - X_HALF, 1.35, color, 'round')
  );
}

// All heads of one slot on one up-stem. A head a second above a head on the
// normal side goes to the right of the stem (stem-up rule for seconds).
function chord(cx, present, C) {
  const sx = cx + STEM_DX;
  const heads = [];
  let prev = null;
  HANDS.forEach(h => {
    if (!present[h.key]) return;
    const right = !!(prev && h.step - prev.step === 1 && !prev.right);
    const hd = { key: h.key, step: h.step, right: right };
    heads.push(hd);
    prev = hd;
  });
  let svg = '';
  let bottom = L;
  let maxRight = cx;
  const dotYs = [];
  heads.forEach((hd, i) => {
    const isX = hd.key === 'stick';
    const y = L - hd.step * HEAD_DY;
    const hx = hd.right ? sx + (isX ? X_HALF : STEM_DX) : cx;
    svg += isX ? xhead(hx, y, C.stick) : oval(hx, y, C[hd.key]);
    if (i === 0) bottom = isX ? y - X_HALF : y - 0.7;
    maxRight = Math.max(maxRight, hx + (isX ? X_HALF : 3.5));
    const dy = isX ? L - HEAD_DY : y; // dot of a line note sits in the space above
    if (dotYs.indexOf(dy) < 0) dotYs.push(dy);
  });
  svg += line(sx, bottom, sx, STEM_TOP, STEM_W, C.ink);
  return { svg: svg, sx: sx, maxRight: maxRight, dotYs: dotYs };
}

function flag(sx, ty, color) {
  const x = sx - STEM_W / 2;
  const d =
    'M' +
    n(x) +
    ' ' +
    n(ty) +
    ' C' +
    n(x + 0.6) +
    ' ' +
    n(ty + 3.6) +
    ' ' +
    n(x + 6.6) +
    ' ' +
    n(ty + 5.4) +
    ' ' +
    n(x + 4.6) +
    ' ' +
    n(ty + 12.4) +
    ' C' +
    n(x + 5.6) +
    ' ' +
    n(ty + 7.4) +
    ' ' +
    n(x + 1.8) +
    ' ' +
    n(ty + 6.4) +
    ' ' +
    n(x) +
    ' ' +
    n(ty + 4.6) +
    ' Z';
  return `<path d="${d}" fill="${color}"/>`;
}

function accent(x, color) {
  return strokePath(`M${n(x - 2.8)} ${n(ACCENT_Y - 2.1)} L${n(x + 2.8)} ${n(ACCENT_Y)} L${n(x - 2.8)} ${n(ACCENT_Y + 2.1)}`, 1.0, color);
}

/* ---------- rests (drawn shapes, no music font) ---------- */

function quarterRest(cx, c) {
  const y = L;
  return (
    strokePath(`M${P(cx, y, -0.3, -1.5)} L${P(cx, y, 0.34, -0.68)}`, 2.4, c) +
    strokePath(`M${P(cx, y, 0.34, -0.68)} L${P(cx, y, -0.3, 0.06)}`, 0.9, c) +
    strokePath(`M${P(cx, y, -0.3, 0.06)} L${P(cx, y, 0.34, 0.82)}`, 2.4, c) +
    strokePath(`M${P(cx, y, 0.34, 0.82)} C${P(cx, y, -0.2, 0.52)} ${P(cx, y, -0.75, 0.9)} ${P(cx, y, -0.02, 1.55)}`, 1.15, c)
  );
}
function eighthRest(cx, c) {
  const y = L;
  return (
    circle(cx - 0.4 * S, y - 0.52 * S, 0.3 * S, c) +
    strokePath(`M${P(cx, y, -0.42, -0.3)} Q${P(cx, y, 0.04, -0.2)} ${P(cx, y, 0.44, -0.78)}`, 0.75, c) +
    strokePath(`M${P(cx, y, 0.44, -0.78)} L${P(cx, y, -0.06, 1.0)}`, 0.85, c)
  );
}
function sixteenthRest(cx, c) {
  const y = L;
  // Stem from (0.55,-1.3) to (-0.15,1.3); second flag meets it at y=-0.3.
  const x2 = 0.55 - 0.7 * (1.0 / 2.6);
  return (
    circle(cx - 0.26 * S, y - 1.02 * S, 0.29 * S, c) +
    strokePath(`M${P(cx, y, -0.28, -0.8)} Q${P(cx, y, 0.15, -0.7)} ${P(cx, y, 0.55, -1.3)}`, 0.75, c) +
    circle(cx - 0.52 * S, y - 0.02 * S, 0.29 * S, c) +
    strokePath(`M${P(cx, y, -0.54, 0.2)} Q${P(cx, y, -0.1, 0.3)} ${P(cx, y, x2, -0.3)}`, 0.75, c) +
    strokePath(`M${P(cx, y, 0.55, -1.3)} L${P(cx, y, -0.15, 1.3)}`, 0.85, c)
  );
}
function halfRest(cx, c) {
  return rect(cx - 3.2, L - 2.7, 6.4, 2.7, c);
} // sits on the line
function wholeRest(cx, c) {
  return rect(cx - 3.2, L, 6.4, 2.7, c);
} // hangs from the line

function restFor(dur, cx, c) {
  if (dur === 1) return sixteenthRest(cx, c);
  if (dur === 2) return eighthRest(cx, c);
  if (dur === 3) return eighthRest(cx, c) + circle(cx + 5.2, L - 2.5, DOT_R, c);
  return quarterRest(cx, c);
}

/* ---------- one beat (4 sixteenth slots) ---------- */

function drawBeat(occ, base, X, C, accents) {
  let out = '';
  const notes = [];
  for (let p = 0; p < 4; p++) if (occ[base + p].any) notes.push({ p: p, slot: base + p });
  notes.forEach((nt, i) => {
    nt.dur = (i + 1 < notes.length ? notes[i + 1].p : 4) - nt.p;
  });
  const lead = notes.length ? notes[0].p : 4;
  if (lead) out += restFor(lead, X(base), C.ink);
  if (!notes.length) return out;

  const ch = notes.map(nt => chord(X(nt.slot), occ[nt.slot], C));
  ch.forEach(c => {
    out += c.svg;
  });

  if (notes.length === 1) {
    const d = notes[0].dur;
    if (d <= 3) out += flag(ch[0].sx, STEM_TOP, C.ink);
    if (d === 1) out += flag(ch[0].sx, STEM_TOP + 4.4, C.ink);
  } else {
    const x0 = ch[0].sx - STEM_W / 2;
    const x1 = ch[ch.length - 1].sx + STEM_W / 2;
    out += rect(x0, STEM_TOP, x1 - x0, BEAM_H, C.ink);
    const y2 = STEM_TOP + BEAM_H + BEAM_GAP;
    // Runs of consecutive sixteenths share a secondary beam; a lone one gets a stub
    // pointing into the group (right on the first note, left on the last).
    let i = 0;
    while (i < notes.length) {
      if (notes[i].dur !== 1) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < notes.length && notes[j + 1].dur === 1) j++;
      if (j > i) {
        out += rect(ch[i].sx - STEM_W / 2, y2, ch[j].sx - ch[i].sx + STEM_W, BEAM_H, C.ink);
      } else {
        const left = i === notes.length - 1 ? true : i === 0 ? false : notes[i].p % 2 === 1;
        const sx = ch[i].sx;
        out += left ? rect(sx - STUB, y2, STUB + STEM_W / 2, BEAM_H, C.ink) : rect(sx - STEM_W / 2, y2, STUB + STEM_W / 2, BEAM_H, C.ink);
      }
      i = j + 1;
    }
  }
  notes.forEach((nt, k) => {
    if (nt.dur === 3) {
      ch[k].dotYs.forEach(dy => {
        out += circle(ch[k].maxRight + 2.3, dy, DOT_R, C.ink);
      });
    }
    if (accents && nt.slot % 4 !== 0) out += accent(ch[k].sx, C.ink);
  });
  return out;
}

/* ---------- barlines, clef, time signature ---------- */

function barline(x, c) {
  return rect(x - THIN / 2, BAR_TOP, THIN, BAR_BOT - BAR_TOP, c);
}
function thickBar(x, c) {
  return rect(x, BAR_TOP, THICK, BAR_BOT - BAR_TOP, c);
}
function repeatDots(x, c) {
  return circle(x, L - 2.6, 1.25, c) + circle(x, L + 2.6, 1.25, c);
}

function four(x, top, c) {
  // Bold lining "4", 7.6 wide and 10 tall, drawn as a path so no font is needed.
  function q(px, py) {
    return `${n(x + px)} ${n(top + py)}`;
  }
  const d =
    'M' +
    q(4.4, 0) +
    ' L' +
    q(6.7, 0) +
    ' L' +
    q(6.7, 6.7) +
    ' L' +
    q(7.6, 6.7) +
    ' L' +
    q(7.6, 7.9) +
    ' L' +
    q(6.7, 7.9) +
    ' L' +
    q(6.7, 10) +
    ' L' +
    q(4.6, 10) +
    ' L' +
    q(4.6, 7.9) +
    ' L' +
    q(0, 7.9) +
    ' L' +
    q(0, 6.8) +
    ' Z M' +
    q(4.6, 2.3) +
    ' L' +
    q(1.4, 6.7) +
    ' L' +
    q(4.6, 6.7) +
    ' Z';
  return `<path d="${d}" fill="${c}" fill-rule="evenodd"/>`;
}

function toSet(arr) {
  const s = {};
  (arr || []).forEach(v => {
    const k = Math.round(Number(v));
    if (k >= 0 && k <= 15) s[k] = true;
  });
  return s;
}

function svg(opts) {
  opts = opts || {};
  const col = opts.colors || {};
  const ink = col.ink || '#000';
  const C = {
    ink: ink,
    main: col.main || ink,
    answer: col.answer || ink,
    stick: col.stick || ink,
    dim: col.dim || ink,
  };
  const bars = opts.bars?.length ? opts.bars : [{}];
  const repeat = opts.repeat == null || opts.repeat === false ? null : opts.repeat;
  const height = Number(opts.height) > 0 ? Number(opts.height) : BASE_H;
  const k = height / BASE_H;

  let body = '';
  const slotX = [];
  let x = 2;
  const staffStart = x;

  if (opts.timeSig) {
    body += rect(x + 2, L - 5.5, 2.2, 11, C.ink) + rect(x + 6.2, L - 5.5, 2.2, 11, C.ink);
    x += 13;
    body += four(x, L - 10.6, C.ink) + four(x, L + 0.6, C.ink);
    x += 11;
  }
  if (repeat != null) {
    body += thickBar(x, C.ink) + barline(x + 5, C.ink) + repeatDots(x + 7.9, C.ink);
    x += 9.5;
  }

  bars.forEach((bar, bi) => {
    const barStart = x;
    const sets = { main: toSet(bar.main), answer: toSet(bar.answer), stick: toSet(bar.stick) };
    const occ = [];
    for (let s = 0; s < 16; s++) {
      const o = { main: !!sets.main[s], answer: !!sets.answer[s], stick: !!sets.stick[s] };
      o.any = o.main || o.answer || o.stick;
      occ.push(o);
      slotX.push((barStart + PAD + s * SW) * k);
    }
    const X = slot => barStart + PAD + slot * SW;
    const empty = [0, 1, 2, 3].map(b => !(occ[4 * b].any || occ[4 * b + 1].any || occ[4 * b + 2].any || occ[4 * b + 3].any));
    if (empty[0] && empty[1] && empty[2] && empty[3]) {
      body += wholeRest(barStart + BAR_W / 2, C.ink);
    } else {
      for (let b = 0; b < 4; b++) {
        // Two empty beats on the same half of the bar read as one half rest.
        if (b % 2 === 0 && empty[b] && empty[b + 1]) {
          body += halfRest(X(4 * b), C.ink);
          b++;
          continue;
        }
        body += drawBeat(occ, 4 * b, X, C, !!opts.accentOffbeats);
      }
    }
    x = barStart + BAR_W;
    if (bi < bars.length - 1) body += barline(x, C.ink);
  });

  let end;
  if (repeat != null) {
    body += repeatDots(x + 1.6, C.ink) + barline(x + 4.6, C.ink) + thickBar(x + 6.7, C.ink);
    end = x + 6.7 + THICK;
    body +=
      '<text x="' +
      n(end) +
      '" y="8.6" text-anchor="end" font-size="10" font-weight="700" ' +
      'font-family="system-ui, -apple-system, Helvetica, Arial, sans-serif" fill="' +
      C.ink +
      '">×' +
      String(repeat).replace(/[<>&"]/g, '') +
      '</text>';
  } else {
    body += barline(x, C.ink) + thickBar(x + 2.2, C.ink);
    end = x + 2.2 + THICK;
  }

  const staff = line(staffStart, L, end, L, 0.9, C.dim);
  const W = end + 2;
  const vw = W * k,
    vh = height;
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    n(vw) +
    ' ' +
    n(vh) +
    '" role="img" aria-label="Percussion notation"><g transform="scale(' +
    Math.round(k * 10000) / 10000 +
    ')">' +
    staff +
    body +
    '</g></svg>';
  return {
    markup: markup,
    slotX: slotX.map(v => Math.round(v * 100) / 100),
    width: vw,
    height: vh,
  };
}

export { svg as renderScore };
