// Controls outside the reel: the scene timeline, keyboard, and (desktop only) sound choices.

import { DEFAULT_VOLUME, SOUND_CHOICES, VOLUME_LEVELS } from './audio.js';
import { COPY } from './copy.js';
import { BAR_SECONDS } from './music.js';
import { SCENES } from './show.js';
import { chipButton, formatClock } from './util.js';

const STORAGE_PREFIX = 'baque-virado:';
const readStored = key => {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
};
const writeStored = (key, value) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    /* private mode */
  }
};

/** The sound options in effect. Phones always use the defaults; desktops remember the last pick. */
export function initialChoices(canChoose) {
  const choice = {};
  for (const sound of SOUND_CHOICES) {
    const stored = canChoose ? readStored(sound.id) : null;
    choice[sound.id] = sound.options.some(([option]) => option === stored) ? stored : sound.defaultOption;
  }
  return choice;
}

/** Each instrument's volume level: the remembered one on desktop, normal on phones. */
export function initialVolumes(canChoose) {
  const volume = {};
  for (const sound of SOUND_CHOICES) {
    const stored = canChoose ? readStored(`volume-${sound.id}`) : null;
    volume[sound.id] = VOLUME_LEVELS.some(([level]) => level === stored) ? stored : DEFAULT_VOLUME;
  }
  return volume;
}

/**
 * An instrument's volume: a four-step slider after its name, mute at the left, then low, normal and
 * loud (VOLUME_LEVELS order). A muted instrument's whole group shows disabled.
 */
function volumeSlider(sound, volume, group, onVolume) {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'volume';
  slider.min = '0';
  slider.max = String(VOLUME_LEVELS.length - 1);
  slider.step = '1';
  slider.setAttribute('aria-label', COPY.controls.volumeGroup(sound.label));
  const show = level => {
    slider.value = String(VOLUME_LEVELS.findIndex(([name]) => name === level));
    slider.setAttribute('aria-valuetext', COPY.controls.volumeLevel[level]);
    slider.title = COPY.controls.volumeLevel[level];
    group.classList.toggle('muted', level === 'mute');
  };
  const set = level => {
    volume[sound.id] = level;
    writeStored(`volume-${sound.id}`, level);
    show(level);
    onVolume?.();
  };
  slider.addEventListener('input', () => set(VOLUME_LEVELS[Number(slider.value)][0]));
  show(volume[sound.id]);
  return { slider, set };
}

/** The scenes as one timeline, in show order, each row with its start time. */
export function createSceneList(list, onSelect) {
  const buttons = SCENES.map(scene => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'step';
    button.innerHTML = `<span class="at"></span><span class="name"></span>`;
    button.firstElementChild.textContent = formatClock(scene.start * BAR_SECONDS);
    button.lastElementChild.textContent = COPY.scenes[scene.id].chip;
    button.addEventListener('click', () => onSelect(scene));
    item.appendChild(button);
    list.appendChild(item);
    return button;
  });
  return {
    setCurrent: index => {
      buttons.forEach((button, i) => {
        button.setAttribute('aria-current', String(i === index));
      });
    },
  };
}

/**
 * One row of option chips per sound, in one container. `apply(sound, option)` makes
 * the change: it resolves `false` to ignore the click, and rejects when the sound did not load. Only a
 * change it accepted is shown as picked and remembered.
 */
export function createSoundPickers(container, apply, choice, volume, onVolume) {
  const resets = [];
  // the reset is enabled only while something differs from the defaults
  const isDefault = () => SOUND_CHOICES.every(sound => choice[sound.id] === sound.defaultOption && volume[sound.id] === DEFAULT_VOLUME);
  const reset = chipButton(COPY.controls.restoreDefaults, async () => {
    for (const restore of resets) await restore();
    refresh();
  });
  reset.classList.add('reset');
  const refresh = () => {
    reset.disabled = isDefault();
  };
  const changed = () => {
    onVolume?.();
    refresh();
  };
  for (const sound of SOUND_CHOICES) {
    const group = document.createElement('div');
    group.className = 'sound';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', COPY.controls.soundGroup(sound.label));
    group.innerHTML = `<span class="lbl">${COPY.controls.soundOf(sound.label)}</span><span class="chips"></span>`;
    const label = group.firstElementChild,
      list = group.lastElementChild;
    const showPicked = picked => {
      buttons.forEach((b, j) => {
        b.setAttribute('aria-pressed', String(sound.options[j][0] === picked));
      });
    };
    const buttons = sound.options.map(([option, text]) =>
      chipButton(text, async () => {
        try {
          if ((await apply(sound, option)) === false) return;
        } catch {
          label.textContent = COPY.controls.soundFailed(sound.label);
          return;
        }
        label.textContent = COPY.controls.soundOf(sound.label);
        writeStored(sound.id, option);
        showPicked(option);
        refresh();
      }),
    );
    for (const button of buttons) list.appendChild(button);
    showPicked(choice[sound.id]);
    const head = document.createElement('div');
    head.className = 'sound-head';
    label.replaceWith(head);
    const volumeControl = volumeSlider(sound, volume, group, changed);
    head.append(label, volumeControl.slider); // one line: name, then its volume
    container.appendChild(group);
    resets.push(async () => {
      if (volume[sound.id] !== DEFAULT_VOLUME) volumeControl.set(DEFAULT_VOLUME);
      // the default is listed first; its click loads it as a pick would
      if (choice[sound.id] !== sound.defaultOption) await buttons[0].click();
    });
  }
  container.appendChild(reset);
  refresh();
}

/**
 * Space toggles playback anywhere, so a chip or the stage that keeps focus after a click does not
 * catch it; ← → move between scenes.
 */
export function bindKeyboard({ toggle, previousScene, nextScene }) {
  const isSpace = event => event.code === 'Space';
  document.addEventListener('keydown', event => {
    if (isSpace(event)) {
      event.preventDefault();
      if (!event.repeat) toggle();
    }
    if (event.code === 'ArrowRight') nextScene();
    if (event.code === 'ArrowLeft') previousScene();
  });
  // a focused button activates on Space's keyup: stop that too
  document.addEventListener('keyup', event => {
    if (isSpace(event)) event.preventDefault();
  });
}

/**
 * The rhythm selector: one link per rhythm (`rhythmChoices`), the current one marked. `className`
 * places it: the left column on desktop, the stopped stage on phones (styles.css .rhythms).
 */
export function rhythmSelector(choices, className) {
  const nav = document.createElement('nav');
  nav.className = `rhythms ${className}`;
  nav.setAttribute('aria-label', COPY.controls.rhythm);
  for (const choice of choices) {
    const link = document.createElement('a');
    link.className = 'chip';
    link.href = choice.href;
    link.textContent = choice.label;
    if (choice.current) link.setAttribute('aria-current', 'true');
    nav.appendChild(link);
  }
  return nav;
}
