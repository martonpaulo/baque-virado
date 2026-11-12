#!/usr/bin/env node
// Export the animated page (#stage + window.baque contract) to a vertical 1080x1920 MP4.
// Usage: node tools/export-video.mjs <page.html> <out.mp4> [--from SECONDS] [--to SECONDS] [--loudnorm]
//
// The page must expose window.baque = { render(positionInBars), renderAudio() -> Promise<ArrayBuffer WAV>,
// TOTAL (bars), BAR (seconds per bar), audioOffset (seconds of lead-in at the start of the WAV) }.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { startStaticServer } from './static-server.mjs';

const CHROME = '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const FPS = 30,
  WIDTH = 1080,
  HEIGHT = 1920;
const USAGE = 'usage: node tools/export-video.mjs <page.html> <out.mp4> [--from SECONDS] [--to SECONDS] [--loudnorm]';
// The page sizes the stage from the viewport height, so start wide and tall,
// then fit the viewport height until #stage is exactly WIDTH px wide.
const VIEWPORT = { width: WIDTH + 120, height: HEIGHT + 150, deviceScaleFactor: 1 };
// Streaming loudness target: integrated -14 LUFS, true peak -1.5 dBTP, loudness range 11 LU.
const LOUDNESS = 'I=-14:TP=-1.5:LRA=11';

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

async function fitViewport(page) {
  const viewport = { ...VIEWPORT };
  for (let attempt = 0; attempt < 4; attempt++) {
    const width = await page.$eval('#stage', element => element.getBoundingClientRect().width);
    if (Math.abs(width - WIDTH) <= 0.01) return;
    viewport.height = Math.round(viewport.height + ((WIDTH - width) * 16) / 9);
    await page.setViewport(viewport);
    await page.evaluate(nextFrame);
  }
}

function parseArgs(argv) {
  const positional = [],
    options = { loudnorm: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--from' || arg === '--to') {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 0) die(`${arg} needs a non-negative number of seconds`);
      options[arg.slice(2)] = value;
    } else if (arg === '--loudnorm') options.loudnorm = true;
    else if (arg.startsWith('--')) die(`unknown option ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 2) die(USAGE);
  return { page: path.resolve(positional[0]), out: path.resolve(positional[1]), ...options };
}

function die(message) {
  console.error(`export-video: ${message}`);
  process.exit(2);
}

// Runs in the page: drive CSS animations and transitions from the virtual clock instead of wall time.
function installVirtualClock() {
  const born = new WeakMap();
  window.__exportStep = seconds => {
    for (const animation of document.getAnimations()) {
      if (!born.has(animation)) born.set(animation, seconds);
      const elapsed = (seconds - born.get(animation)) * 1000;
      const end = animation.effect ? animation.effect.getComputedTiming().endTime : 0;
      if (elapsed >= end) animation.finish();
      else {
        animation.pause();
        animation.currentTime = elapsed;
      }
    }
  };
}

/** Run ffmpeg to completion; resolves with its stderr. */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', code =>
      code === 0 ? resolve(stderr) : reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim().split('\n').slice(-3).join(' | ')}`)),
    );
  });
}

/**
 * Two-pass EBU R128 loudness normalisation of the lossless WAV segment, then remux it as the
 * video's audio track (AAC 320k, 48 kHz) without re-encoding the video.
 */
async function normaliseLoudness(video, wav, start, duration) {
  const segment = ['-ss', start.toFixed(6), '-t', duration.toFixed(6), '-i', wav];
  const report = await runFfmpeg(['-hide_banner', '-nostats', ...segment, '-af', `loudnorm=${LOUDNESS}:print_format=json`, '-f', 'null', '-']);
  const json = report.slice(report.lastIndexOf('{'), report.lastIndexOf('}') + 1);
  const measured = JSON.parse(json);
  const filter =
    `loudnorm=${LOUDNESS}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}` +
    `:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`;
  const normalised = `${video}.loudnorm.mp4`;
  await runFfmpeg([
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    video,
    ...segment,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-af',
    filter,
    '-c:a',
    'aac',
    '-b:a',
    '320k',
    '-ar',
    '48000',
    '-shortest',
    '-movflags',
    '+faststart',
    normalised,
  ]);
  renameSync(normalised, video);
  console.log(`loudness: ${measured.input_i} LUFS -> -14 LUFS (true peak ${measured.input_tp} dBTP, normalisation ${measured.normalization_type})`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.page)) die(`page not found: ${args.page}`);
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'baque-export-'));
  mkdirSync(path.dirname(args.out), { recursive: true });

  let server, browser, encoder;
  const cleanup = () => {
    if (encoder && encoder.exitCode === null) encoder.kill('SIGKILL');
    if (server) server.close(); // in-process server: closing it stops it
    rmSync(tempDir, { recursive: true, force: true });
  };
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  const startedAt = Date.now();
  try {
    server = await startStaticServer(path.dirname(args.page));
    console.log(`serving at ${server.url}`);
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      defaultViewport: VIEWPORT,
      // WebGL for the background through a software GPU, so it works headless on any machine
      args: [
        '--force-color-profile=srgb',
        '--hide-scrollbars',
        '--autoplay-policy=no-user-gesture-required',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    });
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    page.on('pageerror', error => console.error(`page error: ${error.message}`));
    await page.goto(server.url + encodeURIComponent(path.basename(args.page)), { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => window.baque && typeof window.baque.render === 'function', { timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => [...document.fonts].map(font => `${font.family}:${font.status}`).filter((v, i, all) => all.indexOf(v) === i));
    if (!fonts.some(font => font.endsWith(':loaded'))) console.warn(`warning: no web font loaded (${fonts.join(', ') || 'none'})`);
    // Video frame: square corners (the page rounds the stage for the browser view only).
    await page.addStyleTag({ content: '#stage { border-radius: 0 !important; }' });
    await page.evaluate(installVirtualClock);
    await page.evaluate(nextFrame);

    await fitViewport(page);
    const { TOTAL, BAR, hasAudio, audioOffset } = await page.evaluate(() => ({
      TOTAL: baque.TOTAL,
      BAR: baque.BAR,
      hasAudio: typeof baque.renderAudio === 'function',
      audioOffset: Number(baque.audioOffset) || 0,
    }));
    const duration = TOTAL * BAR;
    const from = args.from ?? 0,
      to = Math.min(args.to ?? duration, duration);
    if (to <= from) throw new Error(`--to (${to}) must be greater than --from (${from}); the show lasts ${duration.toFixed(3)} s`);
    const firstFrame = Math.round(from * FPS),
      endFrame = Math.round(to * FPS); // [firstFrame, endFrame)
    const frameCount = endFrame - firstFrame;
    const audioStart = firstFrame / FPS + audioOffset,
      audioDuration = frameCount / FPS;

    const rect = await page.$eval('#stage', element => {
      const r = element.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    });
    if (Math.abs(rect.width - WIDTH) > 0.5 || Math.abs(rect.height - HEIGHT) > 0.5)
      throw new Error(`#stage is ${rect.width}x${rect.height}, expected ${WIDTH}x${HEIGHT}`);
    const clip = { x: Math.round(rect.x), y: Math.round(rect.y), width: WIDTH, height: HEIGHT, scale: 1 };

    let wav = null;
    if (hasAudio) {
      console.log('rendering audio…');
      const base64 = await page.evaluate(async () => {
        const bytes = new Uint8Array(await window.baque.renderAudio());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(binary);
      });
      wav = path.join(tempDir, 'audio.wav');
      writeFileSync(wav, Buffer.from(base64, 'base64'));
    } else {
      console.warn('warning: window.baque.renderAudio() is missing; the video will have no audio');
    }

    const encoderArgs = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', 'pipe:0'];
    // The WAV has audioOffset s of lead-in: audio at (t + audioOffset) belongs to frame t.
    if (wav) encoderArgs.push('-ss', audioStart.toFixed(6), '-t', String(audioDuration), '-i', wav);
    encoderArgs.push('-map', '0:v:0');
    if (wav) encoderArgs.push('-map', '1:a:0', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest');
    encoderArgs.push(
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '16',
      '-profile:v',
      'high',
      '-level',
      '4.2',
      '-pix_fmt',
      'yuv420p',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-colorspace',
      'bt709',
      '-tag:v',
      'avc1',
      '-r',
      String(FPS),
      '-movflags',
      '+faststart',
      args.out,
    );
    encoder = spawn(FFMPEG, encoderArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
    const encoderDone = new Promise((resolve, reject) => {
      encoder.on('error', reject);
      encoder.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
    });
    encoder.stdin.on('error', () => {}); // surfaced through encoderDone

    const renderAt = (seconds, bars) => {
      window.baque.render(bars);
      window.__exportStep(seconds);
    };
    // Warm-up: play 1 s before --from without capturing, so CSS fades and transitions are mid-flight as in real playback.
    for (let i = Math.max(0, firstFrame - FPS); i < firstFrame; i++) await page.evaluate(renderAt, i / FPS, i / FPS / BAR);

    const cdp = await page.createCDPSession();
    const captureStartedAt = Date.now();
    for (let i = firstFrame; i < endFrame; i++) {
      const seconds = i / FPS;
      await page.evaluate(renderAt, seconds, seconds / BAR);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', clip, optimizeForSpeed: true, captureBeyondViewport: false });
      if (!encoder.stdin.write(Buffer.from(data, 'base64'))) await new Promise(resolve => encoder.stdin.once('drain', resolve));
      const done = i - firstFrame + 1;
      if (done % FPS === 0 || done === frameCount)
        process.stdout.write(`\rframe ${done}/${frameCount} (${((Date.now() - captureStartedAt) / done).toFixed(0)} ms/frame)`);
    }
    process.stdout.write('\n');
    encoder.stdin.end();
    await encoderDone;

    if (args.loudnorm) {
      if (wav) await normaliseLoudness(args.out, wav, audioStart, audioDuration);
      else console.warn('warning: --loudnorm skipped, the video has no audio');
    }
    console.log(
      `wrote ${args.out}: ${frameCount} frames, ${(frameCount / FPS).toFixed(3)} s${wav ? ', with audio' : ', no audio'}; took ${((Date.now() - startedAt) / 1000).toFixed(1)} s`,
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
    cleanup();
  }
}

main().catch(error => {
  console.error(`export-video: ${error.message}`);
  process.exitCode = 1;
});
