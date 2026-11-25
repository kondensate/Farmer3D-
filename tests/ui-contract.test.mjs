import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('all static UI selectors referenced by the game exist in index.html', () => {
  const selectors = [...main.matchAll(/\$\('#([^']+)'\)/g)].map(match => match[1]);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const missing = [...new Set(selectors)].filter(id => !ids.has(id));
  assert.deepEqual(missing, []);
  assert.ok(ids.has('game'));
});

test('HTML contains no duplicate element IDs', () => {
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});
