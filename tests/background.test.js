import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backgroundAt, SCENE_LOOKS } from '../src/background.js';
import { SCENES } from '../src/show.js';

// #8: paused at a scene start the crossfade sits at 0.5, where the shader computes two looks per
// pixel; settled, it shows the scene's own look alone.
test('a settled background at a scene start shows that scene alone', () => {
  for (const scene of SCENES.slice(1)) {
    assert.ok(backgroundAt(scene.start).mix > 0, `${scene.id}: playing, the crossfade runs`);
    const settled = backgroundAt(scene.start, true);
    assert.equal(settled.mix, 0, scene.id);
    assert.equal(settled.from, SCENE_LOOKS[scene.id]);
    assert.equal(settled.to, SCENE_LOOKS[scene.id]);
  }
});
