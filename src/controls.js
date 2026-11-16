// Controls outside the reel: play button, clock, the scene timeline, keyboard, and (desktop only) sound choices.

import { SOUND_CHOICES } from './audio.js';
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
export function createSoundPickers(container, apply, choice) {
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
      }),
    );
    for (const button of buttons) list.appendChild(button);
    showPicked(choice[sound.id]);
    container.appendChild(group);
  }
}

/**
 * Space toggles playback anywhere but on the Play button itself (which toggles on its own click), so
 * a chip that keeps focus after a click does not catch it; ← → move between scenes.
 */
export function bindKeyboard({ toggle, previousScene, nextScene }, playButton) {
  const isSpaceForPage = event => event.code === 'Space' && event.target !== playButton;
  document.addEventListener('keydown', event => {
    if (isSpaceForPage(event)) {
      event.preventDefault();
      if (!event.repeat) toggle();
    }
    if (event.code === 'ArrowRight') nextScene();
    if (event.code === 'ArrowLeft') previousScene();
  });
  // a focused button activates on Space's keyup: stop that too
  document.addEventListener('keyup', event => {
    if (isSpaceForPage(event)) event.preventDefault();
  });
}
