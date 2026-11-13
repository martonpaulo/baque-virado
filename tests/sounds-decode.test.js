import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './support/browser.js';

// #3: the page plays AAC (.m4a). An AAC encoder adds about 1024 priming samples, which the MP4 edit
// list must skip, or every hit would sound 23 ms late. In Chromium, each decoded .m4a must line up
// with its .wav master within 1 ms: the shift with the smallest difference between the two signals,
// searched over ±27 ms, has to be at most 44 samples.
const SAMPLE_RATE = 44100;
const MAX_SHIFT = Math.round(SAMPLE_RATE / 1000); // 1 ms
const SEARCH = 1200; // samples each way, more than the 1024 priming samples
const COMPARED = 8192; // samples from the start that are compared

test('every .m4a decodes in Chromium aligned with its .wav', async () => {
  const { server, browser, close } = await openBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(`${server.url}CREDITS.md`);
    const shifts = await page.evaluate(
      async (sampleRate, search, compared) => {
        const { ALL_SOUND_FILES } = await import('/src/audio.js');
        const context = new OfflineAudioContext(1, 1, sampleRate);
        const decode = async url => (await context.decodeAudioData(await (await fetch(url)).arrayBuffer())).getChannelData(0);
        const result = {};
        for (const name of ALL_SOUND_FILES) {
          const wav = await decode(`/sounds/${name}.wav`),
            m4a = await decode(`/sounds/${name}.m4a`);
          const length = Math.min(wav.length, compared);
          let best = Number.POSITIVE_INFINITY,
            bestShift = 0;
          for (let shift = -search; shift <= search; shift++) {
            let error = 0;
            for (let i = 0; i < length; i++) {
              const j = i + shift;
              error += (wav[i] - (j >= 0 && j < m4a.length ? m4a[j] : 0)) ** 2;
            }
            if (error < best) {
              best = error;
              bestShift = shift;
            }
          }
          result[name] = bestShift;
        }
        return result;
      },
      SAMPLE_RATE,
      SEARCH,
      COMPARED,
    );
    assert.equal(Object.keys(shifts).length, 43);
    assert.deepEqual(
      Object.entries(shifts).filter(([, shift]) => Math.abs(shift) > MAX_SHIFT),
      [],
    );
  } finally {
    await close();
  }
});
