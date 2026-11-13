import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COPY } from '../src/copy.js';
import { SCENES } from '../src/show.js';

// #6: during a scene the HUD shows its section's name; when that name is also the chip of a scene
// the viewer is not in ("[E] FINAL" during Resumo, beside the "Final" chip), they cannot tell where
// they are. A section with one scene may share that scene's name (Abertura).
test('no section is named like a scene that is not its only scene', () => {
  const clashes = [];
  for (const [section, name] of Object.entries(COPY.sections)) {
    const own = SCENES.filter(scene => scene.section === section);
    for (const scene of SCENES) {
      const sameName = COPY.scenes[scene.id].chip.toLowerCase() === name.toLowerCase();
      if (sameName && !(own.length === 1 && own[0] === scene)) clashes.push(`[${section}] ${name} / ${scene.id}`);
    }
  }
  assert.deepEqual(clashes, []);
});
