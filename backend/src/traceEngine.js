import { createEvent } from '../../shared/types.js';

export function runAlgorithm({ s, p, algorithm = 'memo' }) {
  const events = [];
  const memo = algorithm === 'memo' ? new Map() : null;
  const callTree = [];
  const nodeStack = [];
  let calls = 0;
  let step = 0;

  function pushEvent(type, state, description, extra = {}) {
    step += 1;
    const event = createEvent(type, state, description, { step, ...extra });
    events.push(event);
    return event;
  }

  function isMatch(i, j) {
    calls += 1;
    const key = `${i},${j}`;
    const node = { id: `${i},${j}`, state: { i, j }, children: [], result: null, key, memoHit: false, critical: false };

    if (nodeStack.length > 0) {
      nodeStack[nodeStack.length - 1].children.push(node);
    } else {
      callTree.push(node);
    }

    nodeStack.push(node);

    if (memo && memo.has(key)) {
      pushEvent('MEMO_HIT', { i, j }, 'memo hit', { variables: { key } });
      node.memoHit = true;
      node.result = memo.get(key);
      nodeStack.pop();
      return memo.get(key);
    }

    pushEvent('CALL', { i, j }, 'call', { variables: { key } });

    if (j === p.length) {
      const result = i === s.length;
      pushEvent('RETURN', { i, j }, 'end of pattern', { variables: { result } });
      node.result = result;
      if (memo) {
        memo.set(key, result);
        pushEvent('MEMO_STORE', { i, j }, 'memo store', { variables: { result } });
      }
      nodeStack.pop();
      return result;
    }

    const patternChar = p[j];
    const hasStar = j + 1 < p.length && p[j + 1] === '*';

    let result = false;

    if (hasStar) {
      pushEvent('STAR_FOUND', { i, j }, 'star found', { variables: { patternChar } });
      const skipStar = isMatch(i, j + 2);
      const consumeStar = i < s.length && (patternChar === '.' || patternChar === s[i]) && isMatch(i + 1, j);
      result = skipStar || consumeStar;
    } else if (i < s.length && (patternChar === '.' || patternChar === s[i])) {
      pushEvent('COMPARE', { i, j }, 'character matches', { variables: { patternChar, char: s[i] } });
      result = isMatch(i + 1, j + 1);
    } else {
      pushEvent('COMPARE', { i, j }, 'character mismatch', { variables: { patternChar, char: s[i] ?? null } });
    }

    pushEvent('RETURN', { i, j }, 'return', { variables: { result } });
    node.result = result;
    if (memo) {
      memo.set(key, result);
      pushEvent('MEMO_STORE', { i, j }, 'memo store', { variables: { result } });
    }
    nodeStack.pop();
    return result;
  }

  function markCriticalPath(node) {
    if (!node || node.result !== true) {
      return false;
    }
    node.critical = true;
    for (const child of node.children) {
      if (markCriticalPath(child)) {
        return true;
      }
    }
    return node.children.length === 0 || node.result === true;
  }

  const finalAnswer = isMatch(0, 0);
  callTree.forEach((root) => {
    if (root.result === true) {
      markCriticalPath(root);
    }
  });

  return {
    algorithm,
    input: { s, p },
    events,
    callTree,
    stateGraph: Array.from(new Set(events.map((event) => `${event.state.i},${event.state.j}`))),
    metrics: {
      calls,
      memoHits: events.filter((event) => event.type === 'MEMO_HIT').length,
      depth: 3,
      steps: events.length,
    },
    finalAnswer,
  };
}
