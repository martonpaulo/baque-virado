import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

/** The declarations of the first rule whose selector list is exactly `selector`. */
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`));
  assert.ok(match, `no rule for ${selector}`);
  return match[1];
}

// #4: the labels that carry the lesson never render below the phone floor.
test('stage labels keep the phone font-size floor', () => {
  for (const selector of ['.hud', '.eyebrow', '.read .k', '.notation .n', '.notation.tight .k,\n.notation.tight .n']) {
    assert.match(rule(selector), /font-size: max\(\d+(\.\d+)?cqw, var\(--label-floor\)\);/, selector);
  }
  const phone = css.slice(css.indexOf('@media (max-width: 899px)'));
  assert.match(phone, /--label-floor: 11px;/);
  assert.match(rule(':root'), /--label-floor: 0px;/);
});

// #8: the phone toolbar resizes the dynamic viewport; the stage must follow the small one.
test('the stage is sized from the small viewport height', () => {
  assert.match(rule('.stage'), /100svh/);
  assert.doesNotMatch(css, /100dvh/);
});

// #11: the fonts are served from the site; no page asks another origin for them.
test('no page loads a font from Google', () => {
  for (const file of ['../index.html', '../404.html', '../styles.css']) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /fonts\.(googleapis|gstatic)\.com/, file);
  }
  assert.match(css, /src: url\("fonts\/space-grotesk-latin\.woff2"\)/);
  assert.match(css, /src: url\("fonts\/jetbrains-mono-latin\.woff2"\)/);
  assert.equal((css.match(/font-display: swap;/g) || []).length, 2);
});
