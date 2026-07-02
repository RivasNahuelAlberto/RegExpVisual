import test from 'node:test';
import assert from 'node:assert/strict';
import { runAlgorithm } from '../src/traceEngine.js';

test('runAlgorithm returns a trace with a final answer for a known case', () => {
  const trace = runAlgorithm({ s: 'aa', p: 'a*', algorithm: 'memo' });
  assert.equal(trace.finalAnswer, true);
  assert.ok(Array.isArray(trace.events));
  assert.ok(trace.events.length > 0);
  assert.ok(trace.metrics.calls >= 3);
});

test('backtracking does not emit memo hits', () => {
  const trace = runAlgorithm({ s: 'aa', p: 'a*', algorithm: 'backtracking' });
  assert.equal(trace.finalAnswer, true);
  assert.equal(trace.metrics.memoHits, 0);
  assert.equal(trace.events.some((event) => event.type === 'MEMO_HIT'), false);
});
