// Controls outside the reel: play button, clock, scene chips, keyboard, and (desktop only) sound choices.

import { SOUND_CHOICES } from './audio.js';
import { COPY } from './copy.js';
import { SCENES } from './show.js';
import { chipButton } from './util.js';

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

export function createSceneChips(nav, onSelect) {
  const buttons = SCENES.map(scene => {
    const button = chipButton(COPY.scenes[scene.id].chip, () => onSelect(scene));
    nav.appendChild(button);
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

/** One row of option chips per sound, split across the given containers. */
export function createSoundPickers(containers, choice, onChange) {
  SOUND_CHOICES.forEach((sound, i) => {
    const group = document.createElement('div');
    group.className = 'sound';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', COPY.controls.soundGroup(sound.label));
    group.innerHTML = `<span class="lbl">${COPY.controls.soundOf(sound.label)}</span><span class="chips"></span>`;
    const list = group.lastElementChild;
    const buttons = sound.options.map(([option, label]) => {
      const button = chipButton(label, () => {
        choice[sound.id] = option;
        writeStored(sound.id, option);
        buttons.forEach((b, j) => {
          b.setAttribute('aria-pressed', String(sound.options[j][0] === option));
        });
        onChange(sound);
      });
      button.setAttribute('aria-pressed', String(option === choice[sound.id]));
      list.appendChild(button);
      return button;
    });
    const half = Math.ceil(SOUND_CHOICES.length / containers.length);
    containers[Math.min(containers.length - 1, Math.floor(i / half))].appendChild(group);
  });
}

/** Space toggles playback; ← → move between scenes. */
export function bindKeyboard({ toggle, previousScene, nextScene }) {
  document.addEventListener('keydown', event => {
    if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      toggle();
    }
    if (event.code === 'ArrowRight') nextScene();
    if (event.code === 'ArrowLeft') previousScene();
  });
}
