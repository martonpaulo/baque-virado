// The video export in the browser (#19): the show as a 9:16 video with its sound, made on the
// viewer's machine. A hidden frame loads this same page as the reel (html.video-export) and is
// driven through `window.baque`, the contract tools/export-video.mjs also drives, so the page the
// viewer watches does not change. The sound is the offline render the exporter uses; each video
// frame is drawn from the show position alone, then encoded with WebCodecs and written into an MP4
// (H.264 and AAC) or, when the browser cannot encode those, a WebM (VP9 or VP8 and Opus) by
// Mediabunny (vendor/, MPL-2.0).

import { createStageCapture } from './stage-capture.js';

export const VIDEO = { fps: 30, width: 1080, height: 1920 };
// the frame starts wider and taller than the reel, then fits (as the exporter)
const FRAME_WIDTH_PAD = 120;
const FRAME_HEIGHT_PAD = 150;
const FIT_ATTEMPTS = 4;
const FIT_TOLERANCE = 0.01; // px
const OUTPUT_SAMPLE_RATE = 48000;
const WARM_UP_SECONDS = 4; // as tools/export-video.mjs: the background trail settles before a late start
const LOAD_TIMEOUT_MS = 30000;
const DOWNLOAD_URL_LIFETIME_MS = 60000; // the browser reads the file before the link is dropped
const FORMATS = [
  { id: 'mp4', label: 'MP4', mime: 'video/mp4', video: ['avc'], audio: ['aac'] },
  { id: 'webm', label: 'WebM', mime: 'video/webm', video: ['vp9', 'vp8'], audio: ['opus'] },
];

const loadMediabunny = () => import('../vendor/mediabunny.min.mjs');
const nextFrame = win => new Promise(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve)));

/** Whether this browser has the encoders the export needs at all (a quick check, no download). */
export const canExportVideo = () => typeof VideoEncoder === 'function' && typeof AudioEncoder === 'function';

/** The first format whose video and audio codecs this browser encodes, or null. */
export async function pickFormat(mediabunny = null) {
  const { getFirstEncodableVideoCodec, getFirstEncodableAudioCodec } = mediabunny ?? (await loadMediabunny());
  for (const format of FORMATS) {
    const video = await getFirstEncodableVideoCodec(format.video, { width: VIDEO.width, height: VIDEO.height });
    const audio = await getFirstEncodableAudioCodec(format.audio, { numberOfChannels: 2, sampleRate: OUTPUT_SAMPLE_RATE });
    if (video && audio) return { ...format, videoCodec: video, audioCodec: audio };
  }
  return null;
}

function abortError() {
  return new DOMException('export cancelled', 'AbortError');
}

/** `promise`, or an AbortError as soon as `signal` aborts, so a long step does not hold up Cancel. */
function untilAborted(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/** Load `url` as the reel in a hidden frame whose stage is exactly VIDEO.width wide. */
async function openReel(url, signal) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.title = '';
  // off screen, not display:none: the reel must lay out and draw at its full size
  frame.style.cssText = `position:fixed;left:-${VIDEO.width * 4}px;top:0;border:0;pointer-events:none;width:${VIDEO.width + FRAME_WIDTH_PAD}px;height:${VIDEO.height + FRAME_HEIGHT_PAD}px;`;
  const loaded = new Promise((resolve, reject) => {
    frame.addEventListener('load', resolve, { once: true });
    frame.addEventListener('error', () => reject(new Error('the export frame did not load')), { once: true });
  });
  frame.src = url;
  document.body.appendChild(frame);
  try {
    await loaded;
    const win = frame.contentWindow,
      doc = frame.contentDocument;
    const started = performance.now();
    while (!win.baque?.frame) {
      if (signal?.aborted) throw abortError();
      if (performance.now() - started > LOAD_TIMEOUT_MS) throw new Error('the export frame has no window.baque');
      await nextFrame(win);
    }
    doc.documentElement.classList.add('video-export');
    await nextFrame(win);
    // the reel's stage is sized from the window height: fit the frame until the stage is VIDEO.width wide
    let height = VIDEO.height + FRAME_HEIGHT_PAD;
    for (let attempt = 0; attempt < FIT_ATTEMPTS; attempt++) {
      const stageWidth = doc.getElementById('stage').getBoundingClientRect().width;
      if (Math.abs(stageWidth - VIDEO.width) <= FIT_TOLERANCE) break;
      height = Math.round(height + ((VIDEO.width - stageWidth) * VIDEO.height) / VIDEO.width);
      frame.style.height = `${height}px`;
      await nextFrame(win);
    }
    return { frame, win, doc };
  } catch (error) {
    frame.remove();
    throw error;
  }
}

/** The show's sound from `start` for `duration` seconds, at the output rate, in this window's realm. */
async function audioSpan(wav, start, duration) {
  const decoder = new OfflineAudioContext(2, 1, OUTPUT_SAMPLE_RATE);
  const full = await decoder.decodeAudioData(wav);
  const context = new OfflineAudioContext(2, Math.max(1, Math.round(duration * OUTPUT_SAMPLE_RATE)), OUTPUT_SAMPLE_RATE);
  const source = context.createBufferSource();
  source.buffer = full;
  source.connect(context.destination);
  source.start(0, start, duration);
  return context.startRendering();
}

/**
 * Export the show at `url` (this page by default) from `from` to `to` seconds (the whole show by
 * default). `onProgress({ phase, done, total })` reports the phases `audio` and `video`; `signal`
 * cancels. Resolves with `{ blob, format }`; rejects with an AbortError when cancelled.
 */
export async function exportVideo({ url = location.href, from = 0, to = null, onProgress = () => {}, signal = null } = {}) {
  const check = () => {
    if (signal?.aborted) throw abortError();
  };
  const mediabunny = await loadMediabunny();
  const format = await pickFormat(mediabunny);
  if (!format) throw new Error('this browser cannot encode video');
  const { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioBufferSource, QUALITY_HIGH } = mediabunny;
  check();
  const reel = await openReel(url, signal);
  let output = null;
  try {
    const { win, doc } = reel;
    const { TOTAL, BAR, audioOffset } = win.baque;
    const showSeconds = TOTAL * BAR;
    const end = Math.min(to ?? showSeconds, showSeconds);
    if (!(end > from)) throw new RangeError(`the span ${from}–${end} s is empty`);
    const firstFrame = Math.round(from * VIDEO.fps),
      endFrame = Math.round(end * VIDEO.fps),
      total = endFrame - firstFrame;

    onProgress({ phase: 'audio', done: 0, total, format: format.label });
    const wav = await untilAborted(win.baque.renderAudio(), signal);
    const sound = await untilAborted(audioSpan(wav, firstFrame / VIDEO.fps + (Number(audioOffset) || 0), total / VIDEO.fps), signal);

    const canvas = document.createElement('canvas');
    canvas.width = VIDEO.width;
    canvas.height = VIDEO.height;
    const capture = await createStageCapture(doc, canvas);
    output = new Output({
      format: format.id === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
      target: new BufferTarget(),
    });
    const video = new CanvasSource(canvas, { codec: format.videoCodec, bitrate: QUALITY_HIGH });
    const audio = new AudioBufferSource({ codec: format.audioCodec, bitrate: QUALITY_HIGH });
    output.addVideoTrack(video, { frameRate: VIDEO.fps });
    output.addAudioTrack(audio);
    await output.start();
    await audio.add(sound);

    for (let i = Math.max(0, firstFrame - WARM_UP_SECONDS * VIDEO.fps); i < firstFrame; i++) win.baque.frame(i / VIDEO.fps);
    for (let i = firstFrame; i < endFrame; i++) {
      check();
      win.baque.frame(i / VIDEO.fps);
      await capture();
      await video.add((i - firstFrame) / VIDEO.fps, 1 / VIDEO.fps);
      onProgress({ phase: 'video', done: i - firstFrame + 1, total, format: format.label });
    }
    check();
    await output.finalize();
    return { blob: new Blob([output.target.buffer], { type: format.mime }), format };
  } catch (error) {
    if (output && output.state !== 'finalized') await output.cancel().catch(() => {});
    throw error;
  } finally {
    reel.frame.remove();
  }
}

/** Offer `blob` as a download named `name`. */
export function download(blob, name) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), DOWNLOAD_URL_LIFETIME_MS);
}
