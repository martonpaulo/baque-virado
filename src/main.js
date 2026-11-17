// Wires the reel together: one render function for a position on the timeline, a live loop,
// playback, controls, and the `window.baque` API the video exporter drives.

import { createPlayer, createSampleBank, filesFor, isHeard, renderShowWav } from './audio.js';
import { backgroundAt, createBackground, SCENE_LOOKS } from './background.js';
import { bindKeyboard, createSceneList, createSoundPickers, exportControl, initialChoices, initialVolumes, rhythmSelector } from './controls.js';
import { COPY } from './copy.js';
import { canExportVideo, download, exportVideo } from './export.js';
import { createKey, createLanes } from './lanes.js';
import { BAR_SECONDS, BPM, STEPS_PER_BAR } from './music.js';
import { createReadout } from './readout.js';
import { RHYTHM, ROUTES, redirectFor, rhythmChoices } from './rhythms/index.js';
import { createScope, SCOPE_GEOMETRY } from './scope.js';
import { recentHits, SCENES, sceneAt, sceneIndexAt, TOTAL_BARS, TOTAL_SECONDS } from './show.js';
import { REDUCED_MOTION_QUERY } from './theme.js';
import { createTitle } from './title.js';
import { formatClock, formatPrecise, pad2, setText } from './util.js';

// `?ritmo=<id>` names a rhythm that has its own path, or the path moved (#37): move there, so each
// rhythm has one address
const redirect = redirectFor(location.search, ROUTES, location.pathname);
if (redirect) location.replace(redirect + location.hash);

const $ = id => document.getElementById(id);
const DESKTOP_QUERY = '(min-width: 900px)'; // also where styles.css switches to the side panels
const DESKTOP = window.matchMedia(DESKTOP_QUERY).matches; // at load: which sounds and volumes start
const REDUCED_MOTION = window.matchMedia(REDUCED_MOTION_QUERY);
const AUDIO_LEAD_IN = 0.03; // seconds of silence before the first hit in the offline render
const MIN_VISUAL_SPEED = 0.55; // slowest background speed, as a multiple of real time
const MAX_DPR = 2; // canvases never render above 2× device pixels
const FEEDBACK_DEVICE_SCALE = 0.5; // live, the feedback canvases render at half the device resolution (#8)
const LIVE_MAX_STEP = 0.1; // seconds; a longer frame gap (tab hidden) advances the visuals this much only
const END_EPSILON = 1e-6; // bars; keeps the last position inside the final bar
const REWIND_AT_END = 0.01; // bars from the end where Play starts over
const SCENE_RESTART_BARS = 0.5; // bars into a scene before ← restarts it instead of going back
const RECENT_HITS_WINDOW = 1.2; // seconds of hits the background reacts to
const EXPORT_JUMP = 0.25; // seconds; a bigger jump between exported frames resets the clock
const MS_PER_SECOND = 1000;
// Shader resolution relative to the canvas: full for export, lighter on phones.
const EXPORT_SHADER_SCALE = 1,
  DESKTOP_SHADER_SCALE = 0.5,
  PHONE_SHADER_SCALE = 0.35;

const stage = $('stage');
// The video exports (tools/export-video.mjs, src/export.js) set .video-export: the 9:16 reel alone.
const isVideoExport = () => document.documentElement.classList.contains('video-export');
const volume = initialVolumes(DESKTOP); // each instrument's level: the player, the wheel and the lanes read it
const scope = createScope($('scope'), volume);
$('scope').setAttribute('aria-label', COPY.wheel); // the rhythm's own number of steps
const readout = createReadout($('read'), volume);
const title = createTitle($('head'));
const background = createBackground($('fx'), $('bg'));
const lanes = createLanes($('lanes'), volume);
const key = createKey($('key'), volume);

// ---------- sizes ----------
let measuredSize = ''; // the stage size and the wheel's place the canvases were last sized for
// The wheel's place is part of the key: on a phone the column's padding follows the safe-area inset,
// which changes when the browser's bars hide, and that moves the wheel without resizing the stage.
const sizeKey = (box, wheel) =>
  [box.width, box.height, wheel.left - box.left + wheel.width / 2, wheel.top - box.top + wheel.height / 2].map(value => value.toFixed(2)).join('x');
function measure() {
  const device = window.devicePixelRatio || 1,
    dpr = Math.min(MAX_DPR, device);
  // The feedback tunnel is soft, so live it renders at half the device resolution and CSS scales it
  // up; the export keeps full resolution, so its frames do not change.
  const feedback = clock.exporting ? dpr : device * FEEDBACK_DEVICE_SCALE;
  const box = stage.getBoundingClientRect(),
    wheel = $('scopeBox').getBoundingClientRect();
  measuredSize = sizeKey(box, wheel);
  background.resize({
    width: Math.round(box.width * feedback),
    height: Math.round(box.height * feedback),
    dpr: feedback,
    shaderPixelRatio: dpr,
    centreX: (wheel.left - box.left + wheel.width / 2) * feedback,
    centreY: (wheel.top - box.top + wheel.height / 2) * feedback,
    scopeRadius: (wheel.width / 2) * feedback * (SCOPE_GEOMETRY.radius / SCOPE_GEOMETRY.viewBoxRadius),
  });
  lanes.resize(dpr);
  clock.reset();
}

// ---------- visual clock ----------
// Live: wall time, so the background keeps moving while paused, unless the viewer asks for reduced
// motion (then Pause stops it). Export: derived from the position only, so every frame is reproducible.
const speedOf = scene => Math.max(MIN_VISUAL_SPEED, SCENE_LOOKS[scene.id].speed);
const clock = {
  exporting: false,
  lastPosition: null,
  lastWall: null,
  liveTime: 0,
  reset() {
    this.lastPosition = null;
  },
  tick(position, params) {
    if (this.exporting) {
      const step = this.lastPosition === null ? 1 : (position - this.lastPosition) * BAR_SECONDS;
      this.lastPosition = position;
      let time = 0;
      for (const scene of SCENES) {
        const bars = Math.min(scene.bars, Math.max(0, position - scene.start));
        time += bars * BAR_SECONDS * speedOf(scene);
        if (position < scene.start + scene.bars) break;
      }
      return { time, step };
    }
    const now = performance.now() / MS_PER_SECOND,
      step = this.lastWall === null ? 0 : Math.min(LIVE_MAX_STEP, now - this.lastWall);
    this.lastWall = now;
    this.liveTime += step * Math.max(MIN_VISUAL_SPEED, params.speed);
    return { time: this.liveTime, step };
  },
};

// ---------- one frame ----------
let position = 0,
  currentScene = null,
  currentBar = -1,
  renderedAt = null, // the position the foreground was last drawn at
  shapes = []; // the wheel's partly drawn shapes, which the background echoes
const sceneList = createSceneList($('scenes'), scene => seek(scene.start));

function render(at, force = false) {
  const p = Math.max(0, Math.min(TOTAL_BARS - END_EPSILON, at));
  const params = backgroundAt(p, !player.playing && !clock.exporting);
  // a muted instrument does not push the background either
  const heard = recentHits(p, RECENT_HITS_WINDOW).filter(h => isHeard(volume, h.voice));
  const drawBackground = () => background.draw(p, params, heard, clock.tick(p, params), shapes);
  if (p === renderedAt && !force) {
    if (!REDUCED_MOTION.matches) drawBackground(); // paused: only the background moves
    return;
  }
  renderedAt = p;
  const bar = Math.floor(p),
    scene = sceneAt(bar),
    barInScene = bar - scene.start,
    sixteenth = (p - bar) * STEPS_PER_BAR,
    seconds = p * BAR_SECONDS;
  if (scene !== currentScene) {
    currentScene = scene;
    title.build(scene);
    readout.build(scene);
    sceneList.setCurrent(SCENES.indexOf(scene));
  }
  if (bar !== currentBar || force) {
    currentBar = bar;
    scope.build(scene, barInScene);
    readout.onBar(scene, barInScene);
    key.update(bar);
  }
  readout.update(sixteenth, barInScene);
  shapes = scope.update(p, scene, barInScene);
  title.update(p, scene, !player.playing && !clock.exporting);
  setText($('hBar'), COPY.hud.bar(pad2(bar + 1), TOTAL_BARS));
  setText($('hStep'), COPY.hud.step(pad2(Math.floor(sixteenth) + 1)));
  setText($('hTime'), formatPrecise(seconds));
  setText($('tapTime'), `${formatClock(seconds)} / ${formatClock(TOTAL_SECONDS)}`);
  drawBackground();
  lanes.draw(p);
}

// ---------- playback ----------
const choice = initialChoices(DESKTOP);
const bank = createSampleBank();
bank.prefetch(filesFor(choice));
const player = createPlayer(bank, choice, volume);
const waveSound = () => choice[RHYTHM.waves?.sound] ?? null; // the option of the sound whose waves the readout shows
readout.setWaveSound(waveSound());
const tapButton = $('tap');
/** The playback state on the stage, which is the Play and Pause button on every screen. */
function showState(state) {
  const text = COPY.controls[state];
  setText($('tapLabel'), text);
  tapButton.dataset.state = state;
  tapButton.setAttribute('aria-label', text); // its text hides while playing
}

let starting = false; // samples are loading: a second Play, Pause or sound pick waits for it

async function play() {
  if (starting || player.playing) return;
  if (position >= TOTAL_BARS - REWIND_AT_END) position = 0;
  starting = true;
  showState('loading');
  try {
    await player.prepare();
  } catch {
    showState('loadFailed');
    return;
  } finally {
    starting = false;
  }
  player.start(position); // the position read now, so a scene picked while loading is kept
  showState('pause');
}
function pause() {
  const stoppedAt = player.stop();
  if (stoppedAt !== null) position = Math.max(0, stoppedAt);
  renderedAt = null; // redraw once: the title settles
  showIdle();
}
/** Paused: «Tocar» at the start, «Continuar» in the middle, «Tocar de novo» at the end. */
const showIdle = () => showState(position >= TOTAL_BARS - REWIND_AT_END ? 'replay' : position > 0 ? 'resume' : 'play');
const toggle = () => (player.playing ? pause() : play());
function seek(to) {
  const wasPlaying = player.playing;
  if (wasPlaying) pause();
  position = to;
  currentBar = -1;
  clock.reset();
  render(position);
  if (wasPlaying) play();
  else showIdle();
}
const stepScene = direction => {
  const index = sceneIndexAt(Math.floor(position));
  const target = direction > 0 ? index + 1 : position - SCENES[index].start > SCENE_RESTART_BARS ? index : index - 1;
  seek(SCENES[Math.max(0, Math.min(SCENES.length - 1, target))].start);
};

showState('play');
tapButton.addEventListener('click', toggle);
// With two or more rhythms, a selector at the bottom of the left column, under the Roteiro (desktop),
// and under Play (phones, stopped); a link opens the rhythm's path. With one rhythm nothing is added.
const rhythms = rhythmChoices(RHYTHM.id);
if (rhythms.length) {
  $('scenes').parentElement.after(rhythmSelector(rhythms, 'block rhythms-side'));
  tapButton.after(rhythmSelector(rhythms, 'rhythms-stage'));
}
// Desktop: «Exportar vídeo» in the middle of the left column, between the Roteiro and the selector
// (owner, 2026-11-17, #19). The export runs in a hidden copy of this page (src/export.js).
if (DESKTOP && !isVideoExport()) {
  $('scenes').parentElement.after(
    exportControl({
      supported: canExportVideo(),
      run: async ({ onProgress, signal }) => {
        const { blob, format } = await exportVideo({ onProgress, signal });
        const name = `${RHYTHM.id}.${format.id}`;
        download(blob, name);
        return { name, format: format.label };
      },
    }),
  );
}
bindKeyboard({ toggle, previousScene: () => stepScene(-1), nextScene: () => stepScene(1) });
if (DESKTOP) {
  createSoundPickers(
    $('sounds'),
    async (sound, option) => {
      if (starting) return false; // the show is still loading: ignore the click
      const next = { ...choice, [sound.id]: option };
      bank.prefetch(filesFor(next));
      // Decode first, so the instrument never drops out mid-show and a failed load keeps the old
      // sound. Paused, the pick is heard in place: no seek, no Play (#5).
      if (player.playing) await player.prepare(next);
      else await player.preview(next, sound.preview);
      choice[sound.id] = option;
      readout.setWaveSound(waveSound());
    },
    choice,
    volume,
    () => {
      // redraw only the wheel's dots and the lanes at the new strength: a full render would also
      // step the background's feedback, and the picture would change on every click
      if (renderedAt === null) return;
      const bar = Math.floor(renderedAt),
        scene = sceneAt(bar);
      scope.build(scene, bar - scene.start);
      shapes = scope.update(renderedAt, scene, bar - scene.start);
      lanes.draw(renderedAt);
      key.update(bar);
      readout.showVolume();
      readout.onBar(scene, bar - scene.start);
    },
  );
}
$('hBpm').textContent = BPM;

// ---------- loop ----------
function loop() {
  if (clock.exporting) return;
  if (player.playing) {
    position = player.position();
    if (position >= TOTAL_BARS) {
      pause();
      position = TOTAL_BARS - END_EPSILON;
      showIdle(); // the label reads the end position, set after pause()
    }
  }
  render(position);
  requestAnimationFrame(loop);
}

// ---------- video exporter API ----------
// The exports drive CSS animations and transitions from the show clock instead of wall time.
const animationBirth = new WeakMap();
function stepAnimations(seconds) {
  for (const animation of document.getAnimations()) {
    if (!animationBirth.has(animation)) animationBirth.set(animation, seconds);
    const elapsed = (seconds - animationBirth.get(animation)) * MS_PER_SECOND;
    const end = animation.effect ? animation.effect.getComputedTiming().endTime : 0;
    if (elapsed >= end) animation.finish();
    else {
      animation.pause();
      animation.currentTime = elapsed;
    }
  }
}
window.baque = {
  render(at) {
    if (!clock.exporting) {
      clock.exporting = true;
      background.setShaderScale(EXPORT_SHADER_SCALE);
      background.filterEveryFrame();
      measure();
    }
    const jumped = clock.lastPosition === null || Math.abs(at - clock.lastPosition) * BAR_SECONDS > EXPORT_JUMP;
    if (jumped) {
      clock.reset();
      currentBar = -1; // the wheel is rebuilt on a new bar or after a jump only (#8)
    }
    position = at;
    renderedAt = null;
    render(at);
  },
  /** One video frame at `seconds`: the show, and the CSS animations on the same virtual clock. */
  frame(seconds) {
    this.render(seconds / BAR_SECONDS);
    stepAnimations(seconds);
  },
  renderAudio: options => renderShowWav(bank, choice, AUDIO_LEAD_IN, options),
  TOTAL: TOTAL_BARS,
  BAR: BAR_SECONDS,
  audioOffset: AUDIO_LEAD_IN,
};

background.setShaderScale(DESKTOP ? DESKTOP_SHADER_SCALE : PHONE_SHADER_SCALE);
// Resizing a canvas clears it, so only a real new size re-measures: a stage that blips to 0x0 and
// back (a hidden page, a screenshot under load) keeps its canvases and the export its trail (#15).
// Desktop lays the stage out at a phone's size and zooms it to its column (mobile first): every
// size inside is the phone's, scaled. The width matches styles.css .stage on desktop.
// The query is read on every fit, not once: a window or tablet that crosses 900px keeps the layout
// styles.css shows (no zoom on a phone layout, the column's zoom on the desktop one).
const PHONE_STAGE_WIDTH = 393;
const DESKTOP_LAYOUT = window.matchMedia(DESKTOP_QUERY);
// The video export (tools/export-video.mjs sets .video-export) draws the 9:16 reel at its own size:
// no zoom there.
const fitStage = () => {
  stage.style.zoom = DESKTOP_LAYOUT.matches && !isVideoExport() ? String(stage.parentElement.clientWidth / PHONE_STAGE_WIDTH) : '';
};
fitStage();
const stageColumn = stage.querySelector('.inner');
const stageObserver = new ResizeObserver(() => {
  fitStage();
  const box = stage.getBoundingClientRect();
  if (!box.width || !box.height || sizeKey(box, $('scopeBox').getBoundingClientRect()) === measuredSize) return;
  measure();
  title.fit();
  render(position, true);
});
stageObserver.observe(stage.parentElement);
stageObserver.observe(stageColumn); // its content box changes with its padding
document.fonts?.ready.then(() => title.fit());
measure();
render(0, true);
document.documentElement.classList.add('ready'); // the controls have their text: show them
requestAnimationFrame(loop);
