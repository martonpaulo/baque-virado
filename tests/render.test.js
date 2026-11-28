import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installRecordingContext, namedBank } from './support/recording-context.js';

// The offline render schedules its hits a bar at a time while it runs (#58): a browser works on
// every source it holds in each block of samples, so a show scheduled whole before the render
// costs its hits times its length (the coco: 150 s for 103 s of music, 6 s scheduled by the bar).
const LEAD = 0.5;
const SLACK = 0.25; // seconds a hit may sound after its sixteenth: its swing or its player's lean
const line = entry => `${entry.name}|${entry.time.toFixed(6)}|${entry.rate.toFixed(6)}|${entry.level.toFixed(6)}`;

test('the render schedules each hit at most two bars ahead and never late, and plays the hits of a render scheduled whole', async () => {
  const { renderShowWav, DEFAULT_CHOICES } = await import('../src/audio.js');
  const { BAR_SECONDS } = await import('../src/music.js');
  const byTheBar = installRecordingContext();
  await renderShowWav(namedBank, DEFAULT_CHOICES, LEAD);
  const whole = installRecordingContext({ suspendable: false }); // a browser that cannot suspend an offline render
  await renderShowWav(namedBank, DEFAULT_CHOICES, LEAD);
  assert.ok(whole.length > 1000, `only ${whole.length} hits`);
  assert.deepEqual(byTheBar.map(line), whole.map(line));
  assert.ok(whole.every(entry => entry.scheduledAt === 0));
  const ahead = byTheBar.map(entry => entry.time - entry.scheduledAt);
  assert.ok(Math.min(...ahead) > 0, 'a hit scheduled after its own time would be moved to the render time');
  assert.ok(Math.max(...ahead) <= LEAD + 2 * BAR_SECONDS + SLACK, `a hit waits ${Math.max(...ahead).toFixed(2)} s in the render`);
});

test('a range of the show is scheduled by the bar too, and its last bar is not left out', async () => {
  const { renderShowWav, renderSpans, DEFAULT_CHOICES } = await import('../src/audio.js');
  const { STEPS_PER_BAR } = await import('../src/music.js');
  assert.deepEqual(renderSpans(4, 6), []); // two bars: all scheduled before the render starts
  assert.deepEqual(renderSpans(4, 7), [{ atBar: 5, fromStep: 6 * STEPS_PER_BAR, toStep: 7 * STEPS_PER_BAR }]);
  const spans = renderSpans(0, 12);
  assert.equal(spans[0].fromStep, 2 * STEPS_PER_BAR);
  assert.equal(spans.at(-1).toStep, 12 * STEPS_PER_BAR);
  for (const [i, span] of spans.slice(1).entries()) assert.equal(span.fromStep, spans[i].toStep); // no step twice, none skipped
  for (const span of spans) assert.equal(span.atBar, span.fromStep / STEPS_PER_BAR - 1); // each a bar before its first step
  const byTheBar = installRecordingContext();
  await renderShowWav(namedBank, DEFAULT_CHOICES, LEAD, { fromBar: 8, toBar: 13 });
  const whole = installRecordingContext({ suspendable: false });
  await renderShowWav(namedBank, DEFAULT_CHOICES, LEAD, { fromBar: 8, toBar: 13 });
  assert.ok(whole.length > 20);
  assert.deepEqual(byTheBar.map(line), whole.map(line));
});

test('a span that cannot be scheduled fails the render instead of leaving a silent show', async () => {
  const { renderShowWav, DEFAULT_CHOICES } = await import('../src/audio.js');
  installRecordingContext();
  const Context = globalThis.OfflineAudioContext;
  let sources = 0;
  globalThis.OfflineAudioContext = class extends Context {
    createBufferSource() {
      if (this.currentTime > 0 && ++sources > 3) throw new Error('no more sources');
      return super.createBufferSource();
    }
  };
  await assert.rejects(renderShowWav(namedBank, DEFAULT_CHOICES, LEAD), /no more sources/);
});
