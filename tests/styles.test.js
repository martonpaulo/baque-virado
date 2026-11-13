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
    assert.match(rule(selector), /font-size: max\(var\(--stage-[a-z-]+\), var\(--label-floor\)\);/, selector);
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

// #10: the palette has one owner, src/theme.js; the CSS custom properties mirror it.
test('the :root colours of styles.css equal the palette of src/theme.js', async () => {
  const { COLORS, ROLES } = await import('../src/theme.js');
  const root = rule(':root');
  const hex = Object.fromEntries([...root.matchAll(/--([a-z-]+): (#[0-9a-f]{6});/g)].map(([, name, value]) => [name, value]));
  assert.ok(Object.keys(hex).length >= 6, 'the palette is in :root');
  for (const [name, value] of Object.entries(hex)) assert.equal(value, COLORS[name], `--${name}`);
  // every translucent colour is built from a palette colour's channels
  const channels = new Set(Object.values(COLORS).map(value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).join(', ')));
  for (const [, name, value] of root.matchAll(/--([a-z-]+): rgba\((\d+, \d+, \d+), [\d.]+\);/g))
    assert.ok(channels.has(value), `--${name}: rgba(${value}) is not a palette colour`);
  // roles point at the palette
  const roles = { accent: 'accent', 'main-hand': 'mainHand', 'answer-hand': 'answerHand' };
  for (const [css, js] of Object.entries(roles)) {
    const target = root.match(new RegExp(`--${css}: var\\(--([a-z]+)\\);`));
    assert.ok(target, `--${css} points at a palette colour`);
    assert.equal(COLORS[target[1]], ROLES[js], `--${css}`);
  }
});

test('the mono stack is spelled once, the same in CSS and JavaScript', async () => {
  const { MONO_FONT } = await import('../src/theme.js');
  assert.equal(rule(':root').match(/--f-mono: ([^;]+);/)[1], MONO_FONT);
});

test('the stage uses at most five cqw text sizes, all tokens', () => {
  const sizes = new Set([...css.matchAll(/font-size: ([^;]+);/g)].map(([, value]) => value).filter(value => value.includes('cqw')));
  assert.deepEqual(
    [...sizes].filter(value => /\d(\.\d+)?cqw/.test(value)),
    [],
    'a literal cqw font size',
  );
  const steps = [...rule(':root').matchAll(/--stage-[a-z-]+: [\d.]+cqw;/g)];
  assert.ok(steps.length <= 5, `${steps.length} stage text steps`);
});

test('controls use rem tokens for space, text and radius', () => {
  const controls = css.slice(css.indexOf('/* ---------- controls'), css.indexOf('@media (max-width: 899px)'));
  const literal = [...controls.matchAll(/(gap|padding[a-z-]*|margin[a-z-]*|font-size|border-radius|outline-offset): ([^;]+);/g)]
    .filter(([, , value]) => /\d+px/.test(value))
    .map(([declaration]) => declaration);
  assert.deepEqual(literal, []);
});
