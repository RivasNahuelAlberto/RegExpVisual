import { createEvent } from '../../shared/types.js';
import { ensureExecutionBudget, ExecutionBudgetExceededError } from './guardrails.js';

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

const buildAnalyticsTimeline = ({ events, possibleStates, algorithm, incremental = null }) => {
  if (incremental) {
    return incremental;
  }

  const uniqueStates = new Set();
  const storedStates = new Set();
  let cumulativeCalls = 0;
  let cumulativeMemoHits = 0;
  let currentDepth = 0;
  let maxDepthReached = 0;

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
      maxDepthReached = Math.max(maxDepthReached, currentDepth);
    }

    if (event.type === 'RETURN') {
      currentDepth = Math.max(0, currentDepth - 1);
    }

    if (event.type === 'DP_CELL' && algorithm === 'bottomup') {
      currentDepth = 1;
      maxDepthReached = Math.max(maxDepthReached, currentDepth);
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
    depthSeries.push({ step, value: algorithm === 'bottomup' ? currentDepth : maxDepthReached });
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

const buildCoreMetrics = ({ calls, steps, memoHits, stateCounts, resolvedStateCount = 0, possibleStates = 0, maxDepth = 1, depth = maxDepth, algorithm = 'backtracking' }) => {
  const uniqueStates = stateCounts?.size ?? 0;
  const totalStateVisits = Array.from(stateCounts?.values?.() ?? []).reduce((sum, value) => sum + value, 0);
  const repeatedVisits = Math.max(0, totalStateVisits - uniqueStates);
  const memoMisses = Math.max(0, calls - memoHits);
  const hitRate = algorithm === 'memo' && calls ? memoHits / calls : 0;
  const reuseFactor = uniqueStates ? Number((totalStateVisits / uniqueStates).toFixed(2)) : 0;
  const coverage = possibleStates ? uniqueStates / possibleStates : 0;
  const reusePercentage = algorithm === 'memo' && resolvedStateCount ? memoHits / resolvedStateCount : 0;

  return {
    calls,
    steps,
    memoHits,
    memoMisses,
    hitRate,
    reuseFactor,
    uniqueStates,
    totalStateVisits,
    repeatedVisits,
    possibleStates,
    coverage,
    resolvedStates: resolvedStateCount,
    reusePercentage,
    maxDepth,
    depth,
  };
};

const createPatternDifficulty = (pattern) => {
  const safePattern = typeof pattern === 'string' ? pattern : String(pattern ?? '');
  const starCount = (safePattern.match(/\*/g) || []).length;
  const dotCount = (safePattern.match(/\./g) || []).length;
  const branchingPoints = starCount;

  return {
    starCount,
    dotCount,
    patternLength: safePattern.length,
    branchingPoints,
  };
};

const computeTraceMetrics = ({ events, stateCounts, analyticsTimeline, callTree, sLength, pLength, calls, memoHits, algorithm, pattern, resolvedStateCount = 0, totalSteps = 0 }) => {
  const mergedStateCounts = stateCounts || collectStateCounts(events);
  const repeatedStates = Array.from(mergedStateCounts.entries())
    .map(([state, count]) => ({ state, count }))
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const possibleStates = (sLength + 1) * (pLength + 1);
  const cacheUtilization = algorithm === 'memo' ? ((mergedStateCounts.size || 0) / possibleStates) : 0;
  const treeMetrics = algorithm === 'bottomup' ? null : getCallTreeMetrics(callTree);
  const finalAnalyticsTimeline = analyticsTimeline || buildAnalyticsTimeline({ events, possibleStates, algorithm });
  const branchingActivity = algorithm === 'bottomup' ? [] : computeBranchingActivity(callTree);
  const patternDifficulty = createPatternDifficulty(pattern);
  const baseMetrics = buildCoreMetrics({
    calls,
    steps: typeof totalSteps === 'number' && totalSteps > 0 ? totalSteps : (events ? events.length : finalAnalyticsTimeline.calls.length),
    memoHits,
    stateCounts: mergedStateCounts,
    resolvedStateCount: algorithm === 'memo' ? resolvedStateCount : 0,
    possibleStates,
    maxDepth: treeMetrics?.maxDepth ?? 1,
    depth: treeMetrics?.maxDepth ?? 1,
    algorithm,
  });

  return {
    ...baseMetrics,
    reuseFactor: baseMetrics.reuseFactor,
    cacheUtilization,
    repeatedStates,
    avgDepth: treeMetrics?.avgDepth ?? 1,
    avgBranching: treeMetrics?.avgBranching ?? 0,
    leaves: treeMetrics?.leaves ?? 0,
    criticalPathLength: treeMetrics?.criticalPathLength ?? 0,
    analytics: {
      timeline: finalAnalyticsTimeline,
      branchingActivity,
      patternDifficulty,
    },
  };
};

const logTraceEvent = (message, details = {}) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[regex-trace] ${message}`, details);
    return;
  }
  console.log(`[regex-trace] ${message}`, JSON.stringify(details));
};

export function runAlgorithm({ s, p, algorithm = 'memo', stream = false, onEvent = null, onSnapshot = null, shouldAbort = null }) {
  const events = [];
  const memo = algorithm === 'memo' ? new Map() : null;
  const callTree = [];
  const nodeStack = [];
  const stateCounts = new Map();
  const resolvedStates = new Set();
  const MAX_STREAM_EVENTS = 200;
  const MAX_CALL_TREE_NODES = 1500;
  let calls = 0;
  let step = 0;
  let memoHitCount = 0;
  let maxDepthReached = 0;
  
  // Accumulators for analytics timeline (not subject to MAX_STREAM_EVENTS truncation)
  const timelineAccumulators = {
    uniqueStates: new Set(),
    storedStates: new Set(),
    cumulativeCalls: 0,
    cumulativeMemoHits: 0,
    currentDepth: 0,
    maxDepthReached: 0,
    possibleStates: (s.length + 1) * (p.length + 1),
  };
  
  const analyticsTimeline = {
    calls: [],
    uniqueStates: [],
    memoHits: [],
    coverage: [],
    depth: [],
    storedStates: [],
  };

  const buildSnapshot = (finalAnswerValue = null, completed = false) => {
    const currentEvents = events.slice(-MAX_STREAM_EVENTS);
    const uniqueStates = stateCounts.size;
    const resolvedStateCount = algorithm === 'memo' ? resolvedStates.size : 0;
    const totalStateVisits = Array.from(stateCounts.values()).reduce((sum, value) => sum + value, 0);
    const repeatedVisits = Math.max(0, totalStateVisits - uniqueStates);
    const possibleStates = (s.length + 1) * (p.length + 1);
    const metrics = buildCoreMetrics({
      calls,
      steps: step,
      memoHits: memoHitCount,
      stateCounts: new Map(Array.from(stateCounts.entries())),
      resolvedStateCount,
      possibleStates,
      maxDepth: maxDepthReached,
      depth: maxDepthReached,
      algorithm,
    });
    const stateGraph = Array.from(new Set(currentEvents.map((event) => `${event.state?.i ?? ''},${event.state?.j ?? ''}`).filter(Boolean)));
    const analytics = {
      timeline: analyticsTimeline,
      branchingActivity: algorithm === 'bottomup' ? [] : computeBranchingActivity(callTree),
      patternDifficulty: createPatternDifficulty(p),
    };
    return {
      algorithm,
      input: { s, p },
      events: currentEvents,
      callTree: completed ? callTree : [],
      stateGraph,
      metrics: {
        ...metrics,
        analytics,
      },
      finalAnswer: finalAnswerValue,
      streaming: {
        completed,
        truncated: events.length > MAX_STREAM_EVENTS,
      },
    };
  };

  const emitSnapshot = (finalAnswerValue = null, completed = false) => {
    if (typeof onSnapshot === 'function') {
      onSnapshot(buildSnapshot(finalAnswerValue, completed));
    }
  };

  function pushEvent(type, state, description, extra = {}) {
    if (typeof shouldAbort === 'function' && shouldAbort()) {
      throw new Error('Client disconnected');
    }

    step += 1;
    const nextDepth = nodeStack.length + 1;
    maxDepthReached = Math.max(maxDepthReached, nextDepth);
    ensureExecutionBudget({ s, p, algorithm, calls, step, depth: nextDepth });
    const event = createEvent(type, state, description, { step, ...extra });

    if (events.length >= MAX_STREAM_EVENTS) {
      events.shift();
    }
    events.push(event);

    // Update timeline accumulators
    if (type === 'CALL' || type === 'DP_CELL') {
      timelineAccumulators.cumulativeCalls += 1;
    }
    if (type === 'MEMO_HIT') {
      timelineAccumulators.cumulativeMemoHits += 1;
    }
    if (type === 'MEMO_STORE' && state) {
      timelineAccumulators.storedStates.add(stateKey(state));
    }
    if (type === 'CALL') {
      timelineAccumulators.currentDepth += 1;
      timelineAccumulators.maxDepthReached = Math.max(timelineAccumulators.maxDepthReached, timelineAccumulators.currentDepth);
    }
    if (type === 'RETURN') {
      timelineAccumulators.currentDepth = Math.max(0, timelineAccumulators.currentDepth - 1);
    }
    if (type === 'DP_CELL' && algorithm === 'bottomup') {
      timelineAccumulators.currentDepth = 1;
      timelineAccumulators.maxDepthReached = Math.max(timelineAccumulators.maxDepthReached, timelineAccumulators.currentDepth);
    }

    // Add state to unique states set
    if (state && Number.isInteger(state.i) && Number.isInteger(state.j)) {
      timelineAccumulators.uniqueStates.add(stateKey(state));
    }

    // Push to timeline series
    const uniqueValue = timelineAccumulators.uniqueStates.size;
    const coverageValue = timelineAccumulators.possibleStates ? uniqueValue / timelineAccumulators.possibleStates : 0;

    analyticsTimeline.calls.push({ step, value: timelineAccumulators.cumulativeCalls });
    analyticsTimeline.uniqueStates.push({ step, value: uniqueValue });
    analyticsTimeline.memoHits.push({ step, value: timelineAccumulators.cumulativeMemoHits });
    analyticsTimeline.coverage.push({ step, value: coverageValue });
    analyticsTimeline.depth.push({ step, value: algorithm === 'bottomup' ? timelineAccumulators.currentDepth : timelineAccumulators.maxDepthReached });
    analyticsTimeline.storedStates.push({ step, value: timelineAccumulators.storedStates.size });

    if (typeof onEvent === 'function') {
      onEvent(event);
    }

    emitSnapshot();

    if (state && Number.isInteger(state.i) && Number.isInteger(state.j)) {
      const key = `${state.i},${state.j}`;
      stateCounts.set(key, (stateCounts.get(key) ?? 0) + 1);
    }

    return event;
  }

  function isMatch(i, j) {
    calls += 1;
    ensureExecutionBudget({ s, p, algorithm, calls, step, depth: nodeStack.length + 1 });
    const key = `${i},${j}`;
    const node = { id: `${i},${j}`, state: { i, j }, children: [], result: null, key, memoHit: false, critical: false };

    if (nodeStack.length > 0) {
      maxDepthReached = Math.max(maxDepthReached, nodeStack.length + 1);
      nodeStack[nodeStack.length - 1].children.push(node);
    } else {
      if (callTree.length >= MAX_CALL_TREE_NODES) {
        throw new ExecutionBudgetExceededError('Call tree exceeded configured budget', {
          reason: 'call-tree',
          callTreeSize: callTree.length,
          maxCallTreeNodes: MAX_CALL_TREE_NODES,
        });
      }
      callTree.push(node);
    }

    nodeStack.push(node);

    if (memo && memo.has(key)) {
      memoHitCount += 1;
      pushEvent('MEMO_HIT', { i, j }, 'memo hit', { variables: { key } });
      node.memoHit = true;
      node.result = memo.get(key);
      nodeStack.pop();
      return memo.get(key);
    }

    pushEvent('CALL', { i, j }, 'call', { variables: { key } });
    if (memo) {
      resolvedStates.add(key);
    }

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
      //const skipStar = isMatch(i, j + 2);
      //const consumeStar = i < s.length && (patternChar === '.' || patternChar === s[i]) && isMatch(i + 1, j);
      result = isMatch(i, j + 2) || (i < s.length && (patternChar === '.' || patternChar === s[i]) && isMatch(i + 1, j));
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

  let finalAnswer;
  try {
    finalAnswer = isMatch(0, 0);
  } catch (error) {
    if (error instanceof ExecutionBudgetExceededError) {
      logTraceEvent('execution-budget-exceeded', {
        algorithm,
        input: { s, p },
        details: error.details,
      });
      throw error;
    }
    throw error;
  }
  callTree.forEach((root) => {
    markCriticalPath(root);
  });

  logTraceEvent('trace-completed', {
    algorithm,
    input: { s: s.length, p: p.length },
    calls,
    steps: step,
    maxDepthReached,
    eventCount: events.length,
  });

  const metrics = computeTraceMetrics({
    events,
    stateCounts,
    analyticsTimeline,
    callTree,
    sLength: s.length,
    pLength: p.length,
    calls,
    memoHits: memoHitCount,
    algorithm,
    pattern: p,
    resolvedStateCount: algorithm === 'memo' ? resolvedStates.size : 0,
    totalSteps: step,
  });

  const result = {
    algorithm,
    input: { s, p },
    callTree,
    stateGraph: Array.from(new Set(events.map((event) => `${event.state?.i ?? ''},${event.state?.j ?? ''}`).filter(Boolean))),
    metrics,
    finalAnswer,
    events,
  };

  emitSnapshot(finalAnswer, true);

  return result;
}
