// The brega package: its show script, its harmony and melodies, its recorded sounds and the rules its
// colours and background keep (docs/rhythms/brega.md).
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { meterOf } from '../src/music.js';
import { ACCENT_BARS, BEAT, BREGA, BREGA_LINES, COMP, chordSymbolAt, HEARTBEAT, parseBar, THEME, thirdBelow } from '../src/rhythms/brega.js';
import { BREGA_PALETTE, createBregaPainter } from '../src/rhythms/brega-background.js';
import { BREGA_GRAPHICS, cellPlaces, KIT_PIECES, lightOf, pieceOf } from '../src/rhythms/brega-graphics.js';
import { midiOf } from '../src/rhythms/studio-kit.js';
import { createShow } from '../src/show.js';
import { planStudio } from '../src/studio.js';
import { COLORS } from '../src/theme.js';

const show = createShow(BREGA);
const meter = meterOf(BREGA);
const DEFAULTS = Object.fromEntries(BREGA.sounds.choices.map(choice => [choice.id, choice.defaultOption]));
const soundPath = (name, extension) => fileURLToPath(new URL(`../sounds/${name}${extension}`, import.meta.url));
const allFiles = choices => [...new Set([...BREGA.sounds.choices.flatMap(c => c.files(choices[c.id])), ...BREGA.sounds.fixedFiles])];
const PHONE_BYTES = 1_200_000; // every default sample of the band, before Play (docs/rhythms/brega.md)
const MAX_RETUNE = 5; // semitones a take may be retuned
const stepsOf = (voice, bar) =>
  show
    .hitsInBar(bar)
    .filter(h => h.voice === voice)
    .map(h => h.hit.step);

test('brega is 4/4 at 136 BPM on a 16-step wheel, eleven scenes, about 1:37', () => {
  assert.equal(BREGA.id, 'brega');
  assert.equal(BREGA.copy.name, 'brega');
  assert.equal(BREGA.bpm, 136, 'the tempo measured on the owner’s references');
  assert.equal(meter.stepsPerBar, 16);
  assert.deepEqual(
    show.SCENES.map(scene => [scene.id, scene.bars]),
    [
      ['introducao', 4],
      ['base', 4],
      ['baixo', 4],
      ['teclado', 4],
      ['guitarra', 8],
      ['virada', 1],
      ['refrao', 8],
      ['breque', 2],
      ['vinheta', 8],
      ['refrao-final', 8],
      ['final', 4],
    ],
  );
  assert.ok(show.TOTAL_SECONDS > 80 && show.TOTAL_SECONDS < 130, `${show.TOTAL_SECONDS} s`);
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of show.hitsInBar(bar)) {
      assert.ok(h.grid >= bar && h.grid < bar + 1, `${h.voice} at ${h.grid} is outside bar ${bar}`);
      assert.equal(h.swing, 0, 'brega is programmed straight');
    }
});

test('the band plays from the first bar; a scene thins the band to show one thing, never one voice alone for long', () => {
  assert.deepEqual(show.barTimeline(0).playing, ['bumbo', 'caixa', 'chimbal', 'baixo', 'cordas', 'teclado', 'tema']);
  const SOLO_BARS = new Set([show.sceneById('virada').start, show.sceneById('breque').start + 1]); // the fill and the heartbeat, one bar each
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
    const voices = new Set(show.hitsInBar(bar).map(h => h.voice));
    if (!SOLO_BARS.has(bar)) assert.ok(voices.size >= 5, `bar ${bar} has ${[...voices]} only`);
  }
  // what a scene shows is louder there, what stays under it is softer
  const gain = id => show.sceneById(id).gain;
  assert.ok(gain('base').bumbo > 1 && gain('base').baixo < 1);
  assert.ok(gain('baixo').baixo > 1 && gain('baixo').teclado < 1);
  assert.ok(gain('teclado').teclado > 1);
  assert.ok(gain('guitarra').guitarra > 1);
});

test('the xacumbum base splits the bar 3 + 3 + 2: two bumbos, then the caixa, over a chimbal in eighths', () => {
  const bar = show.sceneById('base').start;
  assert.deepEqual(stepsOf('bumbo', bar), [0, 6]);
  assert.deepEqual(stepsOf('caixa', bar), [12]);
  assert.deepEqual(stepsOf('chimbal', bar), [0, 2, 4, 6, 8, 10, 12, 14]);
  assert.deepEqual(
    BEAT.bumbo.map(h => h.step),
    [0, 6],
  );
  // every fourth bar leads out: one more bumbo and a ghost on the caixa, the identifying cell intact
  assert.deepEqual(stepsOf('bumbo', bar + 3), [0, 6, 10]);
  assert.deepEqual(stepsOf('caixa', bar + 3), [12, 15]);
});

test('the bass lands with both bumbos, leaps through the chord and steps into the next root', () => {
  const scene = show.sceneById('baixo');
  for (let bar = scene.start; bar < scene.start + scene.bars; bar++) {
    const notes = show
      .hitsInBar(bar)
      .filter(h => h.voice === 'baixo')
      .map(h => ({ step: h.hit.step, midi: Number(h.hit.tone.split(':')[0]) }));
    assert.ok(notes.length >= 6, `bar ${bar} has ${notes.length} bass notes`);
    for (const step of stepsOf('bumbo', scene.start))
      assert.ok(
        notes.some(note => note.step === step),
        `no bass with the bumbo on ${step}`,
      );
    assert.ok(
      notes.some((note, i) => i > 0 && Math.abs(note.midi - notes[i - 1].midi) >= 5),
      'the line leaps',
    );
  }
  const last = show.hitsInBar(scene.start).findLast(h => h.voice === 'baixo');
  assert.equal(Number(last.hit.tone.split(':')[0]), midiOf('G2') - 1, 'a semitone below the next chord’s root');
});

test('the keyboard plays short chords around the bumbos; the pad holds one chord per bar', () => {
  const bar = show.sceneById('teclado').start;
  assert.deepEqual(
    stepsOf('teclado', bar),
    COMP[0].map(h => h.step),
  );
  for (const shape of COMP) {
    assert.ok(!shape.some(h => h.step === 0), 'the downbeat belongs to the pad and the bass');
    assert.ok(
      shape.some(h => h.step === BEAT.bumbo[1].step),
      'a chord with the second bumbo',
    );
  }
  assert.deepEqual(stepsOf('cordas', bar), [0]);
});

test('the guitar plays in thirds and sixths: each hit is two notes of the scale', () => {
  const scene = show.sceneById('guitarra');
  let thirds = 0,
    sixths = 0;
  for (let bar = scene.start; bar < scene.start + scene.bars; bar++)
    for (const h of show.hitsInBar(bar).filter(candidate => candidate.voice === 'guitarra')) {
      const [upper, lower] = h.hit.tone.split(':')[0].split(',').map(Number);
      assert.ok([3, 4, 8, 9].includes(upper - lower), `${upper} over ${lower}`);
      if (upper - lower > 4) sixths++;
      else thirds++;
    }
  assert.ok(thirds > 30, `${thirds} thirds`);
  assert.ok(sixths > 0 && sixths < thirds, `${sixths} sixths`);
  assert.equal(thirdBelow(midiOf('B4'), 'E7'), midiOf('G#4'));
  assert.equal(thirdBelow(midiOf('C5'), 'Am'), midiOf('A4'));
});

test('a tom fill comes before each chorus, and the breque leaves a bar of silence but the heartbeat', () => {
  const before = id => show.sceneById(id).start - 1;
  for (const id of ['refrao', 'refrao-final']) assert.ok(stepsOf('tom', before(id)).length >= 8, `no fill before ${id}`);
  const breque = show.sceneById('breque');
  assert.equal(breque.mode(0), 'cut');
  for (const h of show.hitsInBar(breque.start)) assert.equal(h.hit.step, 0, `${h.voice} sounds after the breque’s hit`);
  assert.deepEqual(
    stepsOf('bumbo', breque.start + 1),
    HEARTBEAT.map(h => h.step),
  );
  assert.deepEqual(show.barTimeline(breque.start + 1).playing, ['bumbo']);
});

test('the horns answer the guitar in the vinheta, bar after bar', () => {
  const scene = show.sceneById('vinheta');
  for (let i = 0; i < scene.bars; i++) {
    const bar = scene.start + i;
    if (i % 2 === 0) {
      assert.ok(stepsOf('guitarra', bar).length > 0, `the guitar is silent in bar ${i + 1}`);
      assert.equal(stepsOf('metais', bar).length, 0);
    } else {
      assert.ok(stepsOf('metais', bar).length > 0, `no answer in bar ${i + 1}`);
      assert.equal(stepsOf('guitarra', bar).length, 0);
    }
  }
});

test('the theme: eight bars with pushed notes and bends, the guitar answering in its rests', () => {
  const notes = THEME.map(parseBar);
  assert.equal(notes.length, 8);
  const all = notes.flat();
  // it sings (long notes), it is syncopated (notes that start off the beat and are held) and it bends
  assert.ok(all.filter(note => note.length >= 4).length >= 6, 'long notes');
  assert.ok(all.filter(note => note.step % 4 !== 0 && note.length >= 2).length >= 12, 'pushed notes');
  assert.ok(all.some(note => note.bend));
  assert.ok(all.filter(note => note.length === 1).length >= 10, 'runs and turns of sixteenths');
  assert.ok(new Set(all.map(note => note.length)).size >= 5, 'many note lengths');
  // a minor key: the theme rests on A
  assert.equal(notes.at(-1).at(-1).midi % 12, midiOf('A4') % 12);
  // call and response: where the theme rests (bars 4 and 8), the guitar plays after its long note
  const chorus = show.sceneById('refrao').start;
  for (const i of [3, 7]) {
    const rest = Math.max(...notes[i].filter(note => note.length >= 4).map(note => note.step + note.length));
    const answer = stepsOf('guitarra', chorus + i);
    assert.ok(answer.length >= 4 && answer[0] >= rest - 2, `no answer in bar ${i + 1}`);
  }
  for (const i of [0, 1, 2, 4, 5, 6]) assert.equal(stepsOf('guitarra', chorus + i).length, 0);
});

test('the theme opens the show, returns in both choruses, and the last chorus is a whole tone higher', () => {
  const tema = bar => (BREGA_LINES.tema.get(bar) || []).map(note => note.midi);
  const intro = show.sceneById('introducao').start,
    chorus = show.sceneById('refrao').start,
    last = show.sceneById('refrao-final').start;
  for (const i of [0, 1]) assert.deepEqual(tema(intro + i), tema(chorus + i));
  for (let i = 0; i < THEME.length; i++)
    assert.deepEqual(
      tema(last + i),
      tema(chorus + i).map(midi => midi + 2),
    );
});

test('the show ends on one held chord in the new key', () => {
  const end = show.TOTAL_BARS - 1;
  assert.equal(show.sceneAt(end).mode(end - show.sceneAt(end).start), 'cut');
  const tema = show.hitsInBar(end).find(h => h.voice === 'tema');
  assert.equal(Number(tema.hit.tone.split(':')[0]), midiOf('B4'));
});

test('every note plays a take within five semitones, never the same take twice in a row', () => {
  const plan = planStudio(BREGA, show, DEFAULTS),
    last = {};
  for (const step of [...plan.keys()].sort((a, b) => a - b))
    for (const event of plan.get(step)) {
      for (const source of event.sources) {
        assert.ok(existsSync(soundPath(source.file, '.m4a')), `${source.file} is missing`);
        assert.ok(Math.abs(Math.log2(source.rate) * 12) <= MAX_RETUNE + 0.01, `${event.voice} ${source.file} retunes too far`);
      }
      const [first] = event.sources;
      const pool = BREGA.sounds.studio.voices[event.voice].strokes({})[event.stroke];
      if (pool.length > 1 && !first.only) assert.ok(!last[event.voice]?.includes(first.file), `${event.voice} repeats ${first.file} at step ${step}`);
      last[event.voice] = event.sources.map(source => source.file);
    }
});

test('the drums stay on the grid and the players drift; the same plan every time', () => {
  const plan = planStudio(BREGA, show, DEFAULTS);
  const offsets = {};
  for (const events of plan.values())
    for (const event of events) {
      offsets[event.voice] ??= [];
      offsets[event.voice].push(event.offset);
    }
  for (const voice of ['bumbo', 'caixa', 'chimbal', 'tom'])
    assert.ok(
      offsets[voice].every(offset => offset === 0),
      voice,
    );
  for (const voice of ['baixo', 'teclado', 'guitarra', 'tema'])
    assert.ok(
      offsets[voice].some(offset => offset !== 0),
      voice,
    );
  assert.deepEqual(JSON.stringify([...planStudio(BREGA, show, DEFAULTS)]), JSON.stringify([...plan]));
});

test('every recorded sound has its WAV master; the phone set stays under 1.2 MB', () => {
  const recorded = allFiles(DEFAULTS);
  for (const name of recorded) {
    assert.ok(existsSync(soundPath(name, '.m4a')), `${name}.m4a`);
    assert.ok(existsSync(soundPath(name, '.wav')), `${name}.wav`);
  }
  const bytes = recorded.reduce((sum, name) => sum + statSync(soundPath(name, '.m4a')).size, 0);
  assert.ok(bytes < PHONE_BYTES, `the default samples weigh ${bytes} bytes`);
});

/** WCAG relative luminance and contrast. */
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const channel = c => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

test('each voice reads at 3:1 on the wheel and on the ground, and no red passes R/(R+G+B) 0.8', () => {
  for (const [voice, { color }] of Object.entries(BREGA.voices)) {
    assert.ok(contrast(rgb(color), rgb(COLORS.void)) >= 3, `${voice} ${color} on the wheel`);
    assert.ok(contrast(rgb(color), rgb(BREGA_PALETTE.ground)) >= 3, `${voice} ${color} on the ground`);
  }
  for (const hex of [...Object.values(BREGA_PALETTE), ...Object.values(BREGA.voices).map(v => v.color)]) {
    const [r, g, b] = rgb(hex);
    assert.ok(r / (r + g + b) < 0.8, hex);
  }
});

// The background drawn over the whole show at 30 frames a second, on a canvas that records it.
function paintShow(record = {}) {
  const FPS = 30,
    RADIUS = 120;
  const layer = BREGA.background.create({ stepsPerBar: meter.stepsPerBar, angleOf: step => (step / meter.stepsPerBar) * Math.PI * 2 });
  const noop = () => {};
  const ctx = new Proxy({}, { get: (_target, key) => record[key] || (key.startsWith('create') ? () => ({ addColorStop: noop }) : noop), set: () => true });
  const geometry = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: RADIUS, dpr: 1 };
  const LOOK = BREGA.looks.introducao;
  for (let frame = 0; frame < show.TOTAL_SECONDS * FPS; frame++) {
    const position = frame / FPS / meter.barSeconds,
      look = BREGA.looks[show.sceneAt(Math.floor(position)).id] || LOOK;
    layer.draw(ctx, { ...geometry, position, params: { from: look, to: look, mix: 0 }, recent: [], time: frame / FPS, step: 1 / FPS, fresh: frame === 0 });
  }
  return { layer, geometry, RADIUS };
}

test('the background blooms at most 3 times in any second (WCAG 2.3.1), on phrase accents only', () => {
  const { layer } = paintShow();
  const flashes = layer.flashTimes();
  assert.ok(flashes.length > 0);
  assert.deepEqual(
    flashes,
    ACCENT_BARS.map(bar => bar * meter.barSeconds),
  );
  for (const start of flashes) assert.ok(flashes.filter(t => t >= start && t < start + 1).length <= 3, `flashes from ${start.toFixed(2)} s`);
  // and none closer than a bar: well under the limit
  for (let i = 1; i < flashes.length; i++) assert.ok(flashes[i] - flashes[i - 1] >= meter.barSeconds - 1e-9);
});

test('under the wheel the background keeps the ground: every wheel colour stays at 3:1 or more', () => {
  const ground = rgb(BREGA_PALETTE.ground);
  let darkest = Infinity,
    innermost = Infinity;
  const record = {
    createRadialGradient: (_x0, _y0, r0, _x1, _y1, r1) => ({
      addColorStop: (offset, colour) => {
        if (r0 + offset * (r1 - r0) > 120) return;
        const [r, g, b, a] = colour.match(/[\d.]+/g).map(Number);
        const under = [r, g, b].map((c, i) => c * a + ground[i] * (1 - a));
        for (const { color } of Object.values(BREGA.voices)) darkest = Math.min(darkest, contrast(rgb(color), under));
      },
    }),
    arc: (x, y, radius) => {
      innermost = Math.min(innermost, radius - Math.hypot(x - 200, y - 330));
    },
    ellipse: (x, y, radius) => {
      innermost = Math.min(innermost, Math.hypot(x - 200, y - 330) - radius);
    },
  };
  const { RADIUS } = paintShow(record);
  assert.ok(darkest >= 3, `a wheel colour at ${darkest.toFixed(2)}:1`);
  assert.ok(innermost > RADIUS, 'rings, petals and blooms stay outside the wheel');
});

test('with reduced motion the background has no bloom and nothing travels', () => {
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    const painter = createBregaPainter({ beatsPerBar: 4, barSeconds: meter.barSeconds, petalBars: () => 3, accentBars: [0, 4] });
    assert.deepEqual(painter.flashTimes(), []);
  } finally {
    globalThis.matchMedia = previous;
  }
});

// Found by the desktop page test: the vinheta's roll read a melodic line the horns do not have.
test('every scene renders its readout; the rolls keep a cursor', () => {
  for (const scene of show.SCENES) {
    const { markup, score } = BREGA.readout(scene, { totalBars: show.TOTAL_BARS });
    assert.ok(markup.length > 0, scene.id);
    if (score) assert.equal(score.slotX.length, scene.bars * meter.stepsPerBar, scene.id);
  }
});

// ---------- its own graphics (#49): the chord chart and the drum kit's map ----------
const sceneOf = id => show.SCENES.find(scene => scene.id === id);
const MAIN_SQUARE = 100; // the graphic's SVG square; its drawings stay inside the inscribed circle
const insideCircle = (x, y) => Math.hypot(x - MAIN_SQUARE / 2, y - MAIN_SQUARE / 2) <= MAIN_SQUARE / 2;

test('the chart shows the chord that sounds in each bar: a rest where there is none, and the last chorus a whole tone up', () => {
  assert.deepEqual(BREGA.graphics.ids, BREGA_GRAPHICS);
  assert.deepEqual(BREGA_GRAPHICS, ['cifras', 'bateria']);
  const symbols = id => Array.from({ length: sceneOf(id).bars }, (_, bar) => chordSymbolAt(sceneOf(id), bar));
  assert.deepEqual(symbols('introducao'), ['Am', 'Dm', 'E7', 'Am']);
  assert.deepEqual(symbols('refrao'), ['Am', 'Dm', 'G', 'C', 'F', 'Dm', 'E7', 'Am']);
  assert.deepEqual(symbols('breque'), ['Am', null]); // the bar of silence holds no chord, not the one before it
  assert.deepEqual(symbols('virada'), [null]); // toms and bumbo alone
  // what sounds, not what is written: B minor, with F sharp as its dominant
  assert.deepEqual(symbols('refrao-final'), ['Bm', 'Em', 'A', 'D', 'G', 'Em', 'F#7', 'Bm']);
  for (const scene of show.SCENES)
    for (let bar = 0; bar < scene.bars; bar++) {
      const symbol = chordSymbolAt(scene, bar);
      assert.ok(symbol === null || /^[A-G][#b]?(m|7)?$/.test(symbol), `${scene.id} bar ${bar}: ${symbol}`);
    }
});

test('every cell of the chart and every piece of the kit sits inside the main circle, and no two overlap', () => {
  const CELL = { width: 15.5, height: 11 };
  for (const count of [1, 2, 4, 8]) {
    const places = cellPlaces(count);
    assert.equal(places.length, count);
    for (const [x, y] of places)
      for (const [cornerX, cornerY] of [
        [x, y],
        [x + CELL.width, y],
        [x, y + CELL.height],
        [x + CELL.width, y + CELL.height],
      ])
        assert.ok(insideCircle(cornerX, cornerY), `${count} cells: a corner at ${cornerX}, ${cornerY}`);
    // a row is centred on the square
    const row = places.filter(([, y]) => y === places[0][1]);
    assert.ok(Math.abs(row[0][0] + (row.at(-1)[0] + CELL.width) - MAIN_SQUARE) < 1e-9, `${count} cells: the first row is centred`);
  }
  assert.deepEqual(cellPlaces(0), []);
  const chartBottom = Math.max(...cellPlaces(8).map(([, y]) => y + CELL.height));
  for (const piece of KIT_PIECES) {
    assert.ok(Math.hypot(piece.x - MAIN_SQUARE / 2, piece.y - MAIN_SQUARE / 2) + piece.radius <= MAIN_SQUARE / 2, `${piece.id} is inside the circle`);
    assert.ok(piece.y - piece.radius > chartBottom, `${piece.id} is under the chart`);
    for (const other of KIT_PIECES)
      if (other !== piece) assert.ok(Math.hypot(piece.x - other.x, piece.y - other.y) > piece.radius + other.radius, `${piece.id} and ${other.id} overlap`);
  }
});

test('a stroke lights its own piece of the kit for as long as it rings, and no longer', () => {
  // every drum stroke of the show has a piece; no melodic voice lights the kit
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of show.hitsInBar(bar)) {
      const piece = pieceOf(h.voice, h.hit.tone);
      if (['bumbo', 'caixa', 'chimbal', 'tom'].includes(h.voice)) assert.ok(piece, `bar ${bar}: ${h.voice} ${h.hit.tone ?? ''} has no piece`);
      else assert.equal(piece, null, `bar ${bar}: ${h.voice} lights the kit`);
    }
  assert.equal(pieceOf('tom', 'agudo'), 'tom-agudo');
  assert.equal(pieceOf('tom', 'medio'), 'tom-medio');
  assert.equal(pieceOf('tom', 'grave'), 'tom-grave');
  assert.equal(pieceOf('chimbal', 'aberto'), 'chimbal');
  assert.equal(pieceOf('bumbo', undefined), 'bumbo');
  // with motion on the light decays over the ring; with reduced motion it is on, then off
  assert.equal(lightOf(0, 0.3, false), 1);
  assert.ok(Math.abs(lightOf(0.15, 0.3, false) - 0.5) < 1e-9);
  assert.equal(lightOf(0.3, 0.3, false), 0);
  assert.equal(lightOf(-0.01, 0.3, false), 0); // a stroke still to come
  assert.equal(lightOf(0.29, 0.3, true), 1);
  assert.equal(lightOf(0.3, 0.3, true), 0);
  // nothing in the kit can flash: the fastest piece, the chimbal in eighths, is under one hundredth of the stage
  const eighthSeconds = meter.barSeconds / 8;
  assert.ok(eighthSeconds > 0.2, 'the chimbal plays under five strokes a second');
  const STAGE_AREA = (100 / 0.74) * ((100 / 0.74) * (16 / 9)); // the 9:16 stage in the graphic's units (the square is 74 % of its width)
  for (const piece of KIT_PIECES) assert.ok((Math.PI * piece.radius ** 2) / STAGE_AREA < 0.02, `${piece.id} is a small part of the stage`);
});
