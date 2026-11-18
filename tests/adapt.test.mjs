import test from 'node:test';
import assert from 'node:assert/strict';
import { retier } from '../tools/lib/adapt.mjs';

const Q = [['A', 0], ['B', 1], ['C', 2], ['D', 3], ['E', 4], ['F', 5, 'alias']];
test('no real data leaves tiers untouched', () => assert.deepEqual(retier(Q, {}), Q));
test('real picks move an obvious-to-players answer down and a never-picked one up, keeping the tier multiset', () => {
  const out = retier(Q, { F: 400, A: 2 }); // players overwhelmingly pick F
  assert.equal(out.find(a => a[0] === 'F')[1], 0);
  assert.deepEqual(out.map(a => a[1]).sort(), Q.map(a => a[1]).sort());
  assert.ok(out.some(a => a[1] === 5));
  assert.deepEqual(out.find(a => a[0] === 'F').slice(2), ['alias']);
});
test('a handful of real picks only nudges the prior (pseudo-count 40)', () => {
  const out = retier(Q, { B: 1 });
  assert.equal(out.find(a => a[0] === 'A')[1], 0 + (out.find(a => a[0] === 'B')[1] === 0 ? 1 : 0));
  assert.deepEqual(out.map(a => a[1]).sort(), [0, 1, 2, 3, 4, 5]);
});
