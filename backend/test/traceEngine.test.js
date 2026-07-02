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

test('memoized call tree nodes include memoHit and critical flags', () => {
  const memoized = runAlgorithm({ s: 'aaa', p: 'a*a*', algorithm: 'memo' });
  const visited = [];

  const walk = (nodes) => {
    nodes.forEach((node) => {
      visited.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    });
  };

  walk(memoized.callTree);
  assert.ok(visited.some((node) => node.memoHit === true), 'Expected at least one memo hit node in the call tree');
  assert.ok(visited.some((node) => node.critical === true), 'Expected at least one critical path node in the call tree');
});
