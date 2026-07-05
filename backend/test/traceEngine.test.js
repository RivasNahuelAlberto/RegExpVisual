import test from 'node:test';
import assert from 'node:assert/strict';
import { runAlgorithm } from '../src/traceEngine.js';
import { ExecutionBudgetExceededError } from '../src/guardrails.js';

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

test('builds a concrete call tree for backtracking and memoization', () => {
  const backtracking = runAlgorithm({ s: 'aa', p: 'a*', algorithm: 'backtracking' });
  const memoized = runAlgorithm({ s: 'aa', p: 'a*', algorithm: 'memo' });

  assert.ok(Array.isArray(backtracking.callTree));
  assert.ok(backtracking.callTree.length > 0);
  assert.ok(Array.isArray(memoized.callTree));
  assert.ok(memoized.callTree.length > 0);

  const countNodes = (nodes) => nodes.reduce((total, node) => total + 1 + countNodes(node.children ?? []), 0);

  assert.ok(countNodes(backtracking.callTree) > 0);
  assert.ok(countNodes(memoized.callTree) > 0);
  assert.ok(countNodes(backtracking.callTree) >= countNodes(memoized.callTree));
});

test('memoized runs expose reuse in the metrics payload', () => {
  const memoized = runAlgorithm({ s: 'aaa', p: 'a*a*', algorithm: 'memo' });
  assert.ok(memoized.metrics.reuseFactor > 1, 'Expected memoized runs to show repeated-state reuse');
  assert.ok(memoized.metrics.repeatedVisits > 0, 'Expected memoized runs to record repeated state visits');
  assert.ok(memoized.metrics.resolvedStates > 0, 'Expected memoized runs to report states actually solved');
  assert.ok(memoized.metrics.reusePercentage >= 0, 'Expected memoized runs to report reuse percentage');
});

test('streaming snapshots include incremental metrics and call tree state', () => {
  const snapshots = [];
  const trace = runAlgorithm({
    s: 'aa',
    p: 'a*',
    algorithm: 'memo',
    stream: true,
    onSnapshot: (snapshot) => snapshots.push(snapshot),
  });

  assert.ok(snapshots.length > 0, 'Expected at least one streaming snapshot');
  assert.ok(trace.finalAnswer === true);
  assert.ok(snapshots[0].metrics);
  assert.ok(Array.isArray(snapshots[0].callTree));
  assert.ok(Number.isInteger(snapshots[0].metrics.steps));
});

test('large inputs are rejected by the execution guardrails', () => {
  assert.throws(
    () => runAlgorithm({ s: 'a'.repeat(500), p: 'a'.repeat(500), algorithm: 'memo' }),
    (error) => error instanceof ExecutionBudgetExceededError,
  );
});

test('streaming snapshots keep the event history bounded', () => {
  const snapshots = [];
  runAlgorithm({
    s: 'aaaaaaaaaaaaaaaa',
    p: '.*a.*a.*a.*a.*a.*a.*a.*a.*a.*a.*a.*a.*a.*a.*a.*',
    algorithm: 'memo',
    onSnapshot: (snapshot) => snapshots.push(snapshot),
  });

  const lastSnapshot = snapshots.at(-1);
  assert.ok(lastSnapshot);
  assert.ok(lastSnapshot.events.length <= 200);
  assert.ok(lastSnapshot.streaming.truncated === true || lastSnapshot.events.length <= 200);
});

test('memo hit metrics remain accurate when the event buffer is truncated', () => {
  const trace = runAlgorithm({
    s: 'aaaaaaaaabbbbbbaaaaab',
    p: 'a*a*a*a*b*b*a*a*a*a*b',
    algorithm: 'memo',
  });

  assert.ok(trace.metrics.memoHits > 0, 'Expected memo hits to be counted even when many events are emitted');
  assert.ok(trace.metrics.reusePercentage > 0, 'Expected reuse percentage to reflect memo hits');
});
