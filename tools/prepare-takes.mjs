#!/usr/bin/env node
// Cut, trim and normalise the recorded takes of the studio instruments (src/studio.js) from their CC0
// sources, write them as sounds/<group>-<n>.wav masters, and write src/rhythms/recorded-takes.js:
// every group's files, with the measured pitch (MIDI, cents as a fraction) of a pitched take and the
// velocity layer of each. Encode the new masters after: node tools/encode-sounds.mjs <names>.
//
// Usage: node tools/prepare-takes.mjs --library <dir> --vsco <dir> --coco <dir> [group…]
//   --library: the sounds/library folder of the old sound-library branch (Freesound previews)
//   --vsco:    a checkout of github.com/sgossner/VSCO-2-CE
//   --coco:    the sounds/incoming-coco folder of the old coco-sounds branch
// Sources and authors: CREDITS.md. Without group names every group is rebuilt.
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decode, midiOfHz, midiOfLabel, onsets, pitchOf, RATE, SEMITONES, writeWav } from './audio-file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOUNDS = path.join(ROOT, 'sounds');
const OUT_MODULE = path.join(ROOT, 'src', 'rhythms', 'recorded-takes.js');
const PEAK = 0.89; // −1 dBFS, the level the other masters peak near
const FADE_SECONDS = 0.03;
const PRE_ROLL = 0.002;
const SILENCE = 10 ** (-60 / 20);

// group → its takes. `from`: source root and path; `hit`: which hit of a recording with several
// (0 = the first); `length`: the longest the take may last, in seconds; `layer`: velocity layer
// (0 soft … 1 loud); `existing`: a master already in sounds/, listed as it is.
const v = (file, layer, extra = {}) => ({ from: `vsco:${file}`, layer, ...extra });
const lib = (file, extra = {}) => ({ from: `library:${file}`, ...extra });
const files = (folder, names) => names.map(name => lib(`${folder}/${name}.mp3`));
const coco = (file, extra = {}) => ({ from: `coco:${file}`, ...extra });
const rr = (make, ids, layers) => ids.flatMap(id => layers.map(([tag, layer]) => make(id, tag, layer)));
const series = (file, count, extra = {}) => [...Array(count).keys()].map(hit => lib(file, { hit, ...extra }));
// VSCO names some notes an octave below where they sound: `octave` moves the label to the real pitch.
const notes = (dir, prefix, names, layers, suffix, octave = 0) =>
  names.flatMap(name =>
    layers.map(([tag, layer]) => v(`${dir}/${prefix}${name}${tag}${suffix}`, layer, { label: name.slice(0, -1) + (Number(name.slice(-1)) + octave) })),
  );

export const GROUPS = {
  // ---- forró ----
  'zabumba-aberto': {
    length: 0.9,
    takes: [
      ...rr(
        (n, tag, layer) => v(`Percussion/BDrumNewhit_v${tag}_rr${n}_Sum.wav`, layer),
        [1, 2],
        [
          ['4', 0.5],
          ['6', 0.8],
          ['7', 1],
        ],
      ),
      lib('zabumba/alfaia-hit.mp3', { layer: 0.9 }),
      lib('zabumba/alfaia-hit-combined.mp3', { layer: 0.9 }),
    ],
  },
  'zabumba-abafada': {
    length: 0.45,
    takes: [
      lib('zabumba/bassdrum-muted-mf.mp3', { layer: 0.5 }),
      lib('zabumba/bassdrum-muted-ff.mp3', { layer: 0.9 }),
      lib('zabumba/alfaia-hit-stick.mp3', { layer: 0.9 }),
      lib('surdo/surdo-short.mp3', { layer: 0.7 }),
      { existing: 'alfaia-dry-body-answer', layer: 0.7 },
    ],
  },
  bacalhau: {
    length: 0.35,
    takes: [...files('bacalhau', ['alfaia-rim', 'ethnic-stick-rimshot', 'rimclick-dw-01', 'rimclick-dw-02', 'side-stick']), { existing: 'stick' }],
  },
  'triangulo-aberto': {
    length: 1.6,
    takes: rr(
      (n, tag, layer) => v(`Percussion/Triangle${n}-Hit_v${tag[0]}_rr${tag[1]}_Sum.wav`, layer),
      [3, 6],
      [
        ['11', 0.5],
        ['12', 0.5],
        ['21', 0.9],
        ['22', 0.9],
      ],
    ),
  },
  'triangulo-fechado': {
    length: 0.3,
    takes: rr(
      (n, tag, layer) => v(`Percussion/Triangle${n}-HitM_v${tag[0]}_rr${tag[1]}_Sum.wav`, layer),
      [3, 6],
      [
        ['11', 0.5],
        ['12', 0.5],
        ['21', 0.9],
        ['22', 0.9],
      ],
    ),
  },
  sanfona: {
    pitched: true,
    length: 1.2,
    takes: ['C3', 'E3', 'G3', 'A3', 'C4', 'E4', 'G4', 'C5', 'E5'].map(note => lib(`accordion/accordion-${note}.mp3`, { label: note })),
  },
  'sanfona-baixo': {
    pitched: true,
    length: 1.4,
    takes: [
      lib('accordion/accordion-bass-C.mp3', { label: 'C3' }),
      lib('accordion/accordion-bass-F.mp3', { label: 'F3' }),
      lib('accordion/accordion-bass-G.mp3', { label: 'G3' }),
    ],
  },
  'rabeca-arco': {
    pitched: true,
    length: 2,
    takes: notes(
      'Strings/Solo Violin/Arco Vib',
      'LLVln_ArcoVib_',
      ['G3', 'C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'G5', 'A5', 'C6'],
      [
        ['_p', 0.5],
        ['_f', 0.9],
      ],
      '.wav',
    ),
  },
  'rabeca-spic': {
    pitched: true,
    length: 0.5,
    takes: notes(
      'Strings/Solo Violin/spic',
      'LLVln_spic_',
      ['G3', 'C4', 'E4', 'G4', 'A4', 'C5'],
      [
        ['_v1_rr1', 0.5],
        ['_v2_rr1', 0.9],
        ['_v2_rr2', 0.9],
      ],
      '.wav',
      1,
    ),
  },
  bandolim: {
    pitched: true,
    length: 0.7,
    takes: [
      lib('mandolin/mandolin-cue-20.mp3', { hit: 3 }),
      lib('mandolin/mandolin-cue-21.mp3', { hit: 1 }),
      lib('mandolin/mandolin-cue-21.mp3', { hit: 3 }),
      lib('mandolin/mandolin-cue-21.mp3', { hit: 4 }),
      lib('mandolin/mandolin-cue-22.mp3', { hit: 0 }),
      lib('mandolin/mandolin-cue-22.mp3', { hit: 1 }),
      lib('mandolin/mandolin-cue-22.mp3', { hit: 2 }),
      lib('mandolin/mandolin-cue-22.mp3', { hit: 3 }),
      lib('mandolin/mandolin-tremolo.mp3', { hit: 0 }),
      lib('mandolin/mandolin-tremolo.mp3', { hit: 1 }),
      lib('mandolin/mandolin-tremolo.mp3', { hit: 4 }),
      lib('mandolin/mandolin-tremolo.mp3', { hit: 7 }),
      lib('mandolin/mandolin-tremolo.mp3', { hit: 9 }),
    ],
  },
  'cavaquinho-c': { length: 0.45, takes: [lib('cavaquinho-ukulele/ukulele-C6-fast.mp3')] },
  'cavaquinho-f': { length: 0.45, takes: [lib('cavaquinho-ukulele/ukulele-F-fast.mp3')] },
  'cavaquinho-g': { length: 0.45, takes: [lib('cavaquinho-ukulele/ukulele-G-fast.mp3')] },
  baixo: {
    pitched: true,
    length: 1.2,
    takes: [
      ...['E1', 'F#1', 'G1', 'A1', 'B1', 'C2', 'D2', 'E2'].map(note => lib(`electric-bass/bass-picked-${note}.mp3`)),
      ...files('electric-bass', ['bass-finger-G1', 'bass-finger-D1', 'bass-finger-A2', 'bass-finger-G-precision']),
    ],
  },
  // ---- coco ----
  caixa: {
    length: 0.5,
    takes: rr(
      (n, tag, layer) => v(`Percussion/Snare2-HitSN_v${tag}_rr${n}_Sum.wav`, layer),
      [1, 2],
      [
        ['1', 0.2],
        ['3', 0.4],
        ['5', 0.6],
        ['7', 0.8],
        ['9', 1],
      ],
    ),
  },
  'pandeiro-grave': { length: 0.45, takes: [coco('pandeiro-grave.wav'), coco('pandeiro-couro.wav'), coco('pandeiro-seco.wav')] },
  'pandeiro-platinela': {
    length: 0.4,
    takes: [
      coco('pandeiro-platinela.wav', { layer: 0.8 }),
      ...rr(
        (n, tag, layer) => v(`Percussion/Tamb1-Hit_v${tag}_rr${n}_Sum.wav`, layer),
        [1, 2],
        [
          ['1', 0.5],
          ['2', 0.9],
        ],
      ),
    ],
  },
  palmas: {
    length: 0.35,
    takes: [
      coco('palmas-uma.wav'),
      coco('palmas-roda.wav'),
      coco('palmas-abafada.wav'),
      coco('palmas-pulseira.wav'),
      lib('snare-clap/clap-anu-01.mp3'),
      lib('snare-clap/clap-anu-08.mp3'),
    ],
  },
  // ---- brega funk ----
  bumbo: { length: 0.8, takes: [lib('808/808-kick-short.mp3'), lib('808/808-kick-smooth.mp3'), lib('808/808-kick-tr808.mp3')] },
  grave808: {
    pitched: true,
    length: 1.6,
    takes: [...series('808/808-sub-sine-C.mp3', 3, { label: 'C1' }), lib('808/808-sub-fort.mp3'), lib('808/808-sub-boom-C.mp3', { label: 'C1' })],
  },
  lata: {
    length: 0.4,
    takes: [
      ...files('lata', ['lata-bucket-hit', 'lata-coffee-can', 'lata-peanut-can', 'lata-pot-fingertap', 'lata-pot-slap']),
      ...series('lata/lata-bucket-stick.mp3', 3),
      ...series('lata/lata-garbage-can-spoon.mp3', 2),
    ],
  },
  'chimbal-fechado': {
    length: 0.25,
    takes: ['01', '02', '03', '04'].map(n => lib(`hihat/hihat-closed-${n}.mp3`)),
  },
  'chimbal-aberto': { length: 0.9, takes: ['01', '02'].map(n => lib(`hihat/hihat-open-${n}.mp3`)) },
  piano: {
    pitched: true,
    length: 1.6,
    takes: ['C3', 'G3', 'C4', 'G4', 'C5'].flatMap(note =>
      [
        ['mf', 0.5],
        ['f', 0.9],
      ].flatMap(([dynamic, layer]) => [1, 2].map(n => v(`Keys/Upright Nr1/UR1_${note}_${dynamic}_RR${n}.wav`, layer))),
    ),
  },
  'trompete-sus': {
    pitched: true,
    length: 1.4,
    takes: notes(
      'Brass/Trumpet/susvib',
      'Sum_SHTrumpet_susvib_',
      ['G3', 'A#3', 'D4', 'F4', 'A4', 'C5'],
      [
        ['_v1_rr1', 0.5],
        ['_v2_rr1', 0.9],
      ],
      '.wav',
      1,
    ),
  },
  'trompete-stac': {
    pitched: true,
    length: 0.6,
    takes: notes(
      'Brass/Trumpet/stac',
      'Sum_SHTrumpet_stac_',
      ['G3', 'A#3', 'D4', 'F4', 'A4', 'C5'],
      [
        ['_v2_rr1', 0.6],
        ['_v3_rr1', 0.9],
        ['_v3_rr2', 0.9],
      ],
      '.wav',
      1,
    ),
  },
  'trombone-stac': {
    pitched: true,
    length: 0.6,
    takes: notes(
      'Brass/Tenor Trombone/stac',
      'tenortbn_stac_',
      ['F2', 'A#2', 'D3', 'F3'],
      [
        ['_v3_rr1', 0.7],
        ['_v3_rr2', 0.7],
        ['_v4_rr1', 0.9],
      ],
      '.wav',
      1,
    ),
  },
  'atabaque-grave': {
    length: 0.7,
    takes: [
      ...rr(
        (n, tag, layer) => v(`Percussion/Conga-HitN_v${tag}_rr${n}_Sum.wav`, layer),
        [1, 2],
        [
          ['1', 0.4],
          ['2', 0.7],
          ['3', 1],
        ],
      ),
      coco('atabaque-rum.wav', { layer: 0.9 }),
    ],
  },
  'atabaque-agudo': {
    length: 0.5,
    takes: [
      ...rr(
        (n, tag, layer) => v(`Percussion/Quinto-HitN_v${tag}_rr${n}_Sum.wav`, layer),
        [1, 2],
        [
          ['1', 0.4],
          ['2', 0.7],
          ['3', 1],
        ],
      ),
      coco('atabaque-rumpi.wav', { layer: 0.9 }),
      coco('atabaque-le.wav', { layer: 0.9 }),
    ],
  },
  // ---- the rooms ----
  'sala-pequena': { length: 2.5, room: true, takes: [lib('reverb-ir/ir-room-01.mp3')] },
  'sala-viva': { length: 1.1, room: true, takes: [lib('reverb-ir/ir-living-room.mp3')] },
};

/** The samples of one take: from its hit, trimmed of the silence after it, faded and normalised. */
function cut(samples, spec, group) {
  const starts = spec.hit === undefined ? [0] : onsets(samples, spec.ratio ? { ratio: spec.ratio } : undefined);
  if (spec.hit !== undefined && spec.hit >= starts.length) throw new Error(`only ${starts.length} hits in ${spec.from}`);
  const startHit = spec.hit === undefined ? 0 : starts[spec.hit];
  const from = Math.max(0, group.room ? 0 : startHit - Math.round(PRE_ROLL * RATE));
  const nextHit = spec.hit === undefined ? Number.POSITIVE_INFINITY : (starts[spec.hit + 1] ?? Number.POSITIVE_INFINITY);
  let to = Math.min(samples.length, from + Math.round(group.length * RATE), nextHit - Math.round(PRE_ROLL * RATE));
  let peak = 0;
  for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(samples[i]));
  while (to > from + 1 && Math.abs(samples[to - 1]) < peak * SILENCE) to--;
  const out = samples.slice(from, to),
    fade = Math.min(out.length, Math.round(FADE_SECONDS * RATE));
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  const scale = PEAK / (peak || 1);
  for (let i = 0; i < out.length; i++) out[i] *= scale;
  return { out, startHit: startHit - from };
}

const HALF_OCTAVE = SEMITONES / 2;
const CENTS = 100;
/** The measured pitch, folded to the labelled octave when the label is known (reeds sound in octaves). */
function rootOf(samples, startHit, label) {
  const hz = pitchOf(samples, startHit);
  if (!hz) return label ? midiOfLabel(label) : null; // a note with no clear pitch is left out
  let midi = midiOfHz(hz);
  if (label) {
    const expected = midiOfLabel(label);
    while (midi - expected > HALF_OCTAVE) midi -= SEMITONES;
    while (expected - midi > HALF_OCTAVE) midi += SEMITONES;
  }
  return Math.round(midi * CENTS) / CENTS;
}

async function main() {
  const args = process.argv.slice(2),
    roots = {},
    only = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) roots[args[i].slice(2)] = args[++i];
    else only.push(args[i]);
  }
  const previous = existsSync(OUT_MODULE) ? (await import(pathToFileURL(OUT_MODULE).href)).TAKES : {};
  const table = { ...previous };
  for (const [id, group] of Object.entries(GROUPS)) {
    if (only.length && !only.includes(id)) continue;
    table[id] = group.takes
      .map((spec, i) => {
        let samples, startHit, file;
        if (spec.existing) {
          file = spec.existing;
          samples = decode(path.join(SOUNDS, `${file}.wav`));
          startHit = 0;
        } else {
          const [rootName, rel] = spec.from.split(/:(.*)/s);
          if (!roots[rootName]) throw new Error(`pass --${rootName} <dir> for ${spec.from}`);
          const cutTake = cut(decode(path.join(roots[rootName], rel)), spec, group);
          file = group.takes.length === 1 ? id : `${id}-${i + 1}`;
          writeWav(path.join(SOUNDS, `${file}.wav`), cutTake.out);
          samples = cutTake.out;
          startHit = cutTake.startHit;
        }
        const take = { file };
        if (group.pitched) take.root = rootOf(samples, startHit, spec.label);
        if (take.root === null) {
          console.warn(`${file}: no pitch found, left out`);
          return null;
        }
        if (spec.layer !== undefined) take.layer = spec.layer;
        return take;
      })
      .filter(Boolean);
    console.log(`${id}: ${table[id].map(take => (take.root ? `${take.file}@${take.root}` : take.file)).join(' ')}`);
  }
  const body = JSON.stringify(table, null, 2);
  writeFileSync(
    OUT_MODULE,
    `// Written by tools/prepare-takes.mjs: every recorded take of the studio instruments, by group, with\n// the measured pitch (MIDI) of a pitched take and the velocity layer (0 soft, 1 loud) of each.\nexport const TAKES = ${body};\n`,
  );
  // the module is source: format it as the gate expects
  spawnSync(path.join(ROOT, 'node_modules', '.bin', 'biome'), ['format', '--write', OUT_MODULE], { stdio: 'inherit' });
}
await main();
