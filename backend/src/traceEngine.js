import { createEvent } from '../../shared/types.js';

const stateKey = ({ i, j }) => `${i},${j}`;

const collectStateCounts = (events) => {
  const stateCounts = new Map();
  for (const event of events ?? []) {
    const state = event.state;
    if (state && Number.isInteger(state.i) && Number.isInteger(state.j)) {
      const key = stateKey(state);
      stateCounts.set(key, (stateCounts.get(key) ?? 0) + 1);
    }
  }
  return stateCounts;
};

const getCallTreeMetrics = (callTree) => {
  let nodeCount = 0;
  let totalDepth = 0;
  let internalNodes = 0;
  let totalChildren = 0;
  let leaves = 0;
  let maxDepth = 0;

  const dfs = (node, depth) => {
    nodeCount += 1;
    totalDepth += depth;
    maxDepth = Math.max(maxDepth, depth);

    if (!node.children.length) {
      leaves += 1;
      return;
    }

    internalNodes += 1;
    totalChildren += node.children.length;
    node.children.forEach((child) => dfs(child, depth + 1));
  };

  const criticalPathLength = (roots) => {
    if (!roots.length) {
      return 0;
    }
    const pathLength = (node) => {
      const criticalChildren = node.children.filter((child) => child.critical);
      if (!criticalChildren.length) {
        return 1;
      }
      return 1 + Math.max(...criticalChildren.map((child) => pathLength(child)));
    };

    return Math.max(...roots.filter((root) => root.critical).map((root) => pathLength(root)), 0);
  };

  (callTree ?? []).forEach((root) => dfs(root, 1));

  return {
    nodeCount,
    maxDepth,
    avgDepth: nodeCount ? Number((totalDepth / nodeCount).toFixed(2)) : 0,
    avgBranching: internalNodes ? Number((totalChildren / internalNodes).toFixed(2)) : 0,
    leaves,
    criticalPathLength: criticalPathLength(callTree ?? []),
  };
};

const buildAnalyticsTimeline = ({ events, possibleStates, algorithm }) => {
  const uniqueStates = new Set();
  const storedStates = new Set();
  let cumulativeCalls = 0;
  let cumulativeMemoHits = 0;
  let currentDepth = 0;

  const calls = [];
  const uniqueStatesSeries = [];
  const memoHitsSeries = [];
  const coverageSeries = [];
  const depthSeries = [];
  const cacheStatesSeries = [];

  for (const event of events ?? []) {
    if (event.type === 'CALL' || event.type === 'DP_CELL') {
      cumulativeCalls += 1;
    }

    if (event.type === 'MEMO_HIT') {
      cumulativeMemoHits += 1;
    }

    if (event.type === 'MEMO_STORE' && event.state) {
      storedStates.add(stateKey(event.state));
    }

    if (event.type === 'CALL') {
      currentDepth += 1;
    }

    if (event.type === 'RETURN') {
      currentDepth = Math.max(0, currentDepth - 1);
    }

    if (event.type === 'DP_CELL' && algorithm === 'bottomup') {
      currentDepth = 1;
    }

    const state = event.state;
    if (state && Number.isInteger(state.i) && Number.isInteger(state.j)) {
      uniqueStates.add(stateKey(state));
    }

    const step = event.step;
    const uniqueValue = uniqueStates.size;
    const coverageValue = possibleStates ? uniqueValue / possibleStates : 0;

    calls.push({ step, value: cumulativeCalls });
    uniqueStatesSeries.push({ step, value: uniqueValue });
    memoHitsSeries.push({ step, value: cumulativeMemoHits });
    coverageSeries.push({ step, value: coverageValue });
    depthSeries.push({ step, value: currentDepth });
    cacheStatesSeries.push({ step, value: storedStates.size });
  }

  return {
    calls,
    uniqueStates: uniqueStatesSeries,
    memoHits: memoHitsSeries,
    coverage: coverageSeries,
    depth: depthSeries,
    storedStates: cacheStatesSeries,
  };
};

const computeBranchingActivity = (callTree) => {
  const branchByLevel = new Map();

  const dfs = (node, level = 1) => {
    if (node.children.length) {
      branchByLevel.set(level, (branchByLevel.get(level) ?? 0) + node.children.length);
      node.children.forEach((child) => dfs(child, level + 1));
    }
  };

  (callTree ?? []).forEach((root) => dfs(root, 1));

  return Array.from(branchByLevel.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, children]) => ({ level, children }));
};

const createPatternDifficulty = (pattern) => {
  const starCount = (pattern.match(/\*/g) || []).length;
  const dotCount = (pattern.match(/\./g) || []).length;
  const branchingPoints = starCount;

  return {
    starCount,
    dotCount,
    patternLength: pattern.length,
    branchingPoints,
  };
};

const computeTraceMetrics = ({ events, callTree, sLength, pLength, calls, memoHits, algorithm, pattern }) => {
  const stateCounts = collectStateCounts(events);
  const uniqueStates = stateCounts.size;
  const totalStateVisits = Array.from(stateCounts.values()).reduce((sum, value) => sum + value, 0);
  const repeatedVisits = Math.max(0, totalStateVisits - uniqueStates);
  const repeatedStates = Array.from(stateCounts.entries())
    .map(([state, count]) => ({ state, count }))
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const possibleStates = (sLength + 1) * (pLength + 1);
  const coverage = possibleStates ? uniqueStates / possibleStates : 0;
  const memoMisses = Math.max(0, calls - memoHits);
  const hitRate = calls ? memoHits / calls : 0;
  const reuseFactor = uniqueStates ? Number((totalStateVisits / uniqueStates).toFixed(2)) : 0;
  const cacheUtilization = possibleStates ? uniqueStates / possibleStates : 0;
  const treeMetrics = algorithm === 'bottomup' ? null : getCallTreeMetrics(callTree);
  const analyticsTimeline = buildAnalyticsTimeline({ events, possibleStates, algorithm });
  const branchingActivity = algorithm === 'bottomup' ? [] : computeBranchingActivity(callTree);
  const patternDifficulty = createPatternDifficulty(pattern);

  return {
    calls,
    steps: events.length,
    depth: treeMetrics?.maxDepth ?? 1,
    memoHits,
    memoMisses,
    hitRate,
    reuseFactor,
    cacheUtilization,
    uniqueStates,
    totalStateVisits,
    repeatedVisits,
    repeatedStates,
    possibleStates,
    coverage,
    maxDepth: treeMetrics?.maxDepth ?? 1,
    avgDepth: treeMetrics?.avgDepth ?? 1,
    avgBranching: treeMetrics?.avgBranching ?? 0,
    leaves: treeMetrics?.leaves ?? 0,
    criticalPathLength: treeMetrics?.criticalPathLength ?? 0,
    analytics: {
      timeline: analyticsTimeline,
      branchingActivity,
      patternDifficulty,
    },
  };
};

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
    if (!node) {
      return false;
    }

    let childCritical = false;
    for (const child of node.children) {
      if (markCriticalPath(child)) {
        childCritical = true;
      }
    }

    const isLeafSuccess = node.children.length === 0 && node.result === true;
    const isCritical = childCritical || isLeafSuccess;
    node.critical = isCritical;
    return isCritical;
  }

  const finalAnswer = isMatch(0, 0);
  callTree.forEach((root) => {
    markCriticalPath(root);
  });

  const memoHits = events.filter((event) => event.type === 'MEMO_HIT').length;
  const metrics = computeTraceMetrics({
    events,
    callTree,
    sLength: s.length,
    pLength: p.length,
    calls,
    memoHits,
    algorithm,
  });

  return {
    algorithm,
    input: { s, p },
    events,
    callTree,
    stateGraph: Array.from(new Set(events.map((event) => `${event.state.i},${event.state.j}`))),
    metrics,
    finalAnswer,
  };
}
