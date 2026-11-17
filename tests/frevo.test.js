// The frevo package: its show script, its sounds and the rules its music and colours keep
// (docs/frevo.md).
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { meterOf } from '../src/music.js';
import { CAIXA_CELL, FREVO, FREVO_LINES, MAX_RETUNE, midiOf, nearestSample } from '../src/rhythms/frevo.js';
import { FREVO_PALETTE } from '../src/rhythms/frevo-background.js';
import { createShow } from '../src/show.js';
import { COLORS } from '../src/theme.js';

const show = createShow(FREVO);
const DEFAULTS = Object.fromEntries(FREVO.sounds.choices.map(choice => [choice.id, choice.defaultOption]));
const soundPath = (name, extension) => fileURLToPath(new URL(`../sounds/${name}${extension}`, import.meta.url));
const allFiles = choices => [...FREVO.sounds.choices.flatMap(c => c.files(choices[c.id])), ...FREVO.sounds.fixedFiles];
const PHONE_BYTES = 400_000; // every default sample of the melodic show, before Play (docs/frevo.md)

test('frevo is 2/4 at one tempo on an 8-step wheel, twelve scenes as the script lists them', () => {
  const meter = meterOf(FREVO);
  assert.equal(FREVO.bpm, 140);
  assert.equal(meter.stepsPerBar, 8);
  assert.deepEqual(
    show.SCENES.map(scene => [scene.id, scene.bars]),
    [
      ['introducao', 4],
      ['surdo', 8],
      ['caixa', 8],
      ['pandeiro', 8],
      ['tuba', 8],
      ['metais', 16],
      ['la-e-ca', 16],
      ['ventania', 8],
      ['bambeando', 8],
      ['fotografia', 4],
      ['abafo', 8],
      ['final', 8],
    ],
  );
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of show.hitsInBar(bar)) {
      assert.ok(h.grid >= bar && h.grid < bar + 1, `${h.voice} at ${h.grid} is outside bar ${bar}`);
      assert.equal(h.swing, 0, 'frevo has no swing');
    }
});

test('the parts enter one by one: surdo, caixa, pandeiro, then the tuba', () => {
  const firstBar = voice => {
    for (let bar = FREVO.scenes[0].bars; bar < show.TOTAL_BARS; bar++) if (show.hitsInBar(bar).some(h => h.voice === voice)) return bar;
    return null;
  };
  const order = ['surdo', 'tarol', 'pandeiro', 'tuba', 'trompete', 'sax'].map(firstBar);
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    order,
  );
});

test('the caixa cell is twelve sixteenths, then the rufo, over two bars', () => {
  const tokens = CAIXA_CELL.join(' ').split(' ');
  assert.equal(tokens.filter(token => token === 'X' || token === 'x').length, 12);
  assert.equal(tokens.indexOf('r'), 12);
});

test('every note plays a sample within two semitones of it, and every sample exists', () => {
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const { voice, hit } of show.hitsInBar(bar)) {
      const sample = FREVO.sounds.sampleFor[voice](DEFAULTS, hit.velocity, hit.tone, 0);
      if (!sample) continue;
      assert.ok(existsSync(soundPath(sample[0], '.m4a')), `${sample[0]} is missing`);
      assert.ok(Math.abs(Math.log2(sample[2]) * 12) <= MAX_RETUNE + 1e-9, `${voice} ${hit.tone} retunes too far`);
    }
  assert.deepEqual(nearestSample('trompete', 'bb5').slice(2), [1]);
  assert.equal(midiOf('bb4'), 70);
});

test('every sound option has its files beside their WAV masters; the phone set stays under 400 KB', () => {
  for (const choice of FREVO.sounds.choices)
    for (const [option] of choice.options)
      for (const name of allFiles({ ...DEFAULTS, [choice.id]: option })) {
        assert.ok(existsSync(soundPath(name, '.m4a')), `${name}.m4a`);
        assert.ok(existsSync(soundPath(name, '.wav')), `${name}.wav`);
      }
  const bytes = allFiles(DEFAULTS).reduce((sum, name) => sum + statSync(soundPath(name, '.m4a')).size, 0);
  assert.ok(bytes < PHONE_BYTES, `the default samples weigh ${bytes} bytes`);
});

test('the hook comes in with its pickup, is played three times, varied once and returns unchanged at the end', () => {
  const trumpet = bar => JSON.stringify(FREVO_LINES.trompete.get(bar) || []);
  const metais = show.sceneById('metais').start,
    hook = trumpet(metais);
  const starts = [...Array(show.TOTAL_BARS).keys()].filter(bar => trumpet(bar) === hook && trumpet(bar + 1) === trumpet(metais + 1));
  assert.ok(starts.length >= 3, `the hook plays ${starts.length} times`);
  assert.ok(starts.includes(show.sceneById('final').start), 'the final opens with the hook');
  for (const start of starts)
    assert.ok(
      FREVO_LINES.trompete.get(start - 1)?.some(note => note.step > 4),
      `no pickup before bar ${start + 1}`,
    );
  const laEca = show.sceneById('la-e-ca').start;
  assert.ok(
    [...Array(16).keys()].some(i => trumpet(laEca + i) === hook && trumpet(laEca + i + 1) !== trumpet(metais + 1)),
    'no varied hook in Lá e cá',
  );
});

/** WCAG relative luminance and contrast. */
const luminance = hex => {
  const channel = i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

test('each voice reads at 3:1 on the wheel, and no red passes R/(R+G+B) 0.8', () => {
  for (const [voice, { color }] of Object.entries(FREVO.voices)) assert.ok(contrast(color, COLORS.void) >= 3, `${voice} ${color}`);
  for (const hex of [...Object.values(FREVO_PALETTE), ...Object.values(FREVO.voices).map(v => v.color)]) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(r / (r + g + b) < 0.8, hex);
  }
});
