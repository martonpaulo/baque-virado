// Wires the reel together: one render function for a position on the timeline, a live loop,
// playback, controls, and the `window.baque` API the video exporter drives.

import { createPlayer, createSampleBank, filesFor, renderShowWav } from './audio.js';
import { backgroundAt, createBackground, SCENE_LOOKS } from './background.js';
import { bindKeyboard, createSceneChips, createSoundPickers, initialChoices } from './controls.js';
import { COPY } from './copy.js';
import { createLanes } from './lanes.js';
import { BAQUE_ORDER, BAR_SECONDS, BPM, STEPS_PER_BAR } from './music.js';
import { createReadout } from './readout.js';
import { createScope, SCOPE_GEOMETRY } from './scope.js';
import { recentHits, SCENES, sceneAt, sceneIndexAt, TOTAL_BARS, TOTAL_SECONDS } from './show.js';
import { createTitle } from './title.js';
import { formatClock, formatPrecise, pad2, setText } from './util.js';

const $ = id => document.getElementById(id);
const DESKTOP_QUERY = '(min-width: 900px)'; // also where styles.css switches to the side panels
const DESKTOP = window.matchMedia(DESKTOP_QUERY).matches;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
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
const scope = createScope($('scope'));
const readout = createReadout($('read'));
const title = createTitle($('head'));
const background = createBackground($('fx'), $('bg'));
const lanes = createLanes($('lanes'));

// ---------- sizes ----------
function measure() {
  const device = window.devicePixelRatio || 1,
    dpr = Math.min(MAX_DPR, device);
  // The feedback tunnel is soft, so live it renders at half the device resolution and CSS scales it
  // up; the export keeps full resolution, so its frames do not change.
  const feedback = clock.exporting ? dpr : device * FEEDBACK_DEVICE_SCALE;
  const box = stage.getBoundingClientRect(),
    wheel = $('scopeBox').getBoundingClientRect();
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
const sceneChips = createSceneChips($('chips'), scene => seek(scene.start));

function render(at, force = false) {
  const p = Math.max(0, Math.min(TOTAL_BARS - END_EPSILON, at));
  const params = backgroundAt(p, !player.playing && !clock.exporting);
  const drawBackground = () => background.draw(p, params, recentHits(p, RECENT_HITS_WINDOW), clock.tick(p, params), shapes);
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
    sceneChips.setCurrent(SCENES.indexOf(scene));
  }
  if (bar !== currentBar || force) {
    currentBar = bar;
    scope.build(scene, barInScene);
    readout.onBar(scene, barInScene);
  }
  readout.update(sixteenth, barInScene);
  shapes = scope.update(p, scene, barInScene);
  title.update(p, scene, !player.playing && !clock.exporting);
  setText($('hSec'), `[${scene.section}] ${COPY.sections[scene.section]}`);
  setText($('hBar'), COPY.hud.bar(pad2(bar + 1), TOTAL_BARS));
  setText($('hStep'), COPY.hud.step(pad2(Math.floor(sixteenth) + 1)));
  setText($('hTime'), formatPrecise(seconds));
  setText($('clock'), `${formatClock(seconds)} / ${formatClock(TOTAL_SECONDS)}`);
  drawBackground();
  lanes.draw(p);
}

// ---------- playback ----------
const choice = initialChoices(DESKTOP);
const bank = createSampleBank();
bank.prefetch(filesFor(choice));
const player = createPlayer(bank, choice);
const playButton = $('play');

let starting = false; // samples are loading: a second Play, Pause or sound pick waits for it

async function play() {
  if (starting || player.playing) return;
  if (position >= TOTAL_BARS - REWIND_AT_END) position = 0;
  starting = true;
  playButton.disabled = true;
  playButton.textContent = COPY.controls.loading;
  try {
    await player.prepare();
  } catch {
    playButton.textContent = COPY.controls.loadFailed;
    return;
  } finally {
    starting = false;
    playButton.disabled = false;
  }
  player.start(position); // the position read now, so a scene picked while loading is kept
  playButton.textContent = COPY.controls.pause;
}
function pause() {
  const stoppedAt = player.stop();
  if (stoppedAt !== null) position = Math.max(0, stoppedAt);
  renderedAt = null; // redraw once: the title settles
  playButton.textContent = COPY.controls.play;
}
const toggle = () => (player.playing ? pause() : play());
function seek(to) {
  const wasPlaying = player.playing;
  if (wasPlaying) pause();
  position = to;
  currentBar = -1;
  clock.reset();
  render(position);
  if (wasPlaying) play();
}
const stepScene = direction => {
  const index = sceneIndexAt(Math.floor(position));
  const target = direction > 0 ? index + 1 : position - SCENES[index].start > SCENE_RESTART_BARS ? index : index - 1;
  seek(SCENES[Math.max(0, Math.min(SCENES.length - 1, target))].start);
};

playButton.textContent = COPY.controls.play;
playButton.addEventListener('click', toggle);
bindKeyboard({ toggle, previousScene: () => stepScene(-1), nextScene: () => stepScene(1) }, playButton);
if (DESKTOP) {
  createSoundPickers(
    [$('soundsLeft'), $('soundsRight')],
    async (sound, option) => {
      if (starting) return false; // the show is still loading: ignore the click
      const next = { ...choice, [sound.id]: option };
      bank.prefetch(filesFor(next));
      // Decode first, so the instrument never drops out mid-show and a failed load keeps the old
      // sound. Paused, the pick is heard in place: no seek, no Play (#5).
      if (player.playing) await player.prepare(next);
      else await player.preview(next, sound.preview);
      choice[sound.id] = option;
    },
    choice,
  );
}
$('hBpm').textContent = BPM;
$('facts').textContent = COPY.controls.facts(BAQUE_ORDER.length, TOTAL_BARS, formatClock(TOTAL_SECONDS));

// ---------- loop ----------
function loop() {
  if (clock.exporting) return;
  if (player.playing) {
    position = player.position();
    if (position >= TOTAL_BARS) {
      pause();
      position = TOTAL_BARS - END_EPSILON;
    }
  }
  render(position);
  requestAnimationFrame(loop);
}

// ---------- video exporter API ----------
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
  renderAudio: () => renderShowWav(bank, choice, AUDIO_LEAD_IN),
  TOTAL: TOTAL_BARS,
  BAR: BAR_SECONDS,
  audioOffset: AUDIO_LEAD_IN,
};

background.setShaderScale(DESKTOP ? DESKTOP_SHADER_SCALE : PHONE_SHADER_SCALE);
new ResizeObserver(() => {
  measure();
  title.fit();
  render(position, true);
}).observe(stage);
document.fonts?.ready.then(() => title.fit());
measure();
render(0, true);
requestAnimationFrame(loop);
