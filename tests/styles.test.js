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
