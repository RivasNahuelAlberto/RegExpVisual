import { ensureExecutionBudget, ExecutionBudgetExceededError } from './guardrails.js';

const logDpEvent = (message, details = {}) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[regex-dp] ${message}`, details);
    return;
  }
  console.log(`[regex-dp] ${message}`, JSON.stringify(details));
};

const createPatternDifficulty = (pattern) => {
  const safePattern = typeof pattern === 'string' ? pattern : String(pattern ?? '');
  const starCount = (safePattern.match(/\*/g) || []).length;
  const dotCount = (safePattern.match(/\./g) || []).length;
  return {
    starCount,
    dotCount,
    patternLength: safePattern.length,
    branchingPoints: starCount,
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

    if (event.type === 'MEMO_HIT') {
      cumulativeMemoHits += 1;
    }

    if (event.type === 'MEMO_STORE' && event.state) {
      storedStates.add(`${event.state.i},${event.state.j}`);
    }

    if (event.type === 'DP_CELL' && algorithm === 'bottomup') {
      currentDepth = 1;
    }

    if (event.state && Number.isInteger(event.state.i) && Number.isInteger(event.state.j)) {
      uniqueStates.add(`${event.state.i},${event.state.j}`);
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

export function runBottomUp({ s, p, stream = false, onEvent = null, onSnapshot = null, shouldAbort = null }) {
  const events = [];
  const m = s.length;
  const n = p.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
  const dependencyMap = {};
  const orderMap = {};
  const stateCounts = new Map();
  const MAX_STREAM_EVENTS = 200;
  let step = 0;
  let maxDepthReached = 0;
  let calls = 0;
  const timelineAccumulators = {
    uniqueStates: new Set(),
    storedStates: new Set(),
    cumulativeCalls: 0,
    cumulativeMemoHits: 0,
    currentDepth: 0,
    possibleStates: (m + 1) * (n + 1),
  };
  const analyticsTimeline = {
    calls: [],
    uniqueStates: [],
    memoHits: [],
    coverage: [],
    depth: [],
    storedStates: [],
  };

  const appendTimelinePoint = (event) => {
    if (event.type === 'DP_CELL') {
      calls += 1;
      timelineAccumulators.cumulativeCalls += 1;
    }

    if (event.type === 'MEMO_HIT') {
      timelineAccumulators.cumulativeMemoHits += 1;
    }

    if (event.type === 'MEMO_STORE' && event.state) {
      timelineAccumulators.storedStates.add(`${event.state.i},${event.state.j}`);
    }

    if (event.type === 'DP_CELL' && event.state && Number.isInteger(event.state.i) && Number.isInteger(event.state.j)) {
      timelineAccumulators.currentDepth = 1;
    }

    if (event.state && Number.isInteger(event.state.i) && Number.isInteger(event.state.j)) {
      timelineAccumulators.uniqueStates.add(`${event.state.i},${event.state.j}`);
    }

    const uniqueValue = timelineAccumulators.uniqueStates.size;
    const coverageValue = timelineAccumulators.possibleStates ? uniqueValue / timelineAccumulators.possibleStates : 0;

    analyticsTimeline.calls.push({ step: event.step, value: timelineAccumulators.cumulativeCalls });
    analyticsTimeline.uniqueStates.push({ step: event.step, value: uniqueValue });
    analyticsTimeline.memoHits.push({ step: event.step, value: timelineAccumulators.cumulativeMemoHits });
    analyticsTimeline.coverage.push({ step: event.step, value: coverageValue });
    analyticsTimeline.depth.push({ step: event.step, value: timelineAccumulators.currentDepth });
    analyticsTimeline.storedStates.push({ step: event.step, value: timelineAccumulators.storedStates.size });
  };

  const buildSnapshot = (finalAnswerValue = null, completed = false) => {
    const possibleStates = (m + 1) * (n + 1);
    const analytics = {
      timeline: analyticsTimeline,
      branchingActivity: [],
      patternDifficulty: createPatternDifficulty(p),
    };

    return {
      algorithm: 'bottomup',
      input: { s, p },
      events: events.slice(0, MAX_STREAM_EVENTS),
      dp,
      dependencies: dependencyMap,
      order: orderMap,
      metrics: {
        calls,
        steps: step,
        depth: Math.max(m, n),
        uniqueStates: stateCounts.size,
        totalStateVisits: Array.from(stateCounts.values()).reduce((sum, value) => sum + value, 0),
        repeatedVisits: Math.max(0, Array.from(stateCounts.values()).reduce((sum, value) => sum + value, 0) - stateCounts.size),
        repeatedStates: Array.from(stateCounts.entries())
          .map(([state, count]) => ({ state, count }))
          .filter((entry) => entry.count > 1)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        possibleStates,
        coverage: stateCounts.size / possibleStates,
        reuseFactor: stateCounts.size ? Number((Array.from(stateCounts.values()).reduce((sum, value) => sum + value, 0) / stateCounts.size).toFixed(2)) : 0,
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
    maxDepthReached = Math.max(maxDepthReached, 1);
    ensureExecutionBudget({ s, p, algorithm: 'bottomup', calls: 1, step, depth: maxDepthReached, dpCells: (m + 1) * (n + 1) });
    const event = {
      id: `${type}-${step}`,
      step,
      type,
      timestamp: new Date().toISOString(),
      state,
      description,
      variables: {},
      codeReference: null,
      ...extra,
    };

    if (events.length >= MAX_STREAM_EVENTS) {
      events.shift();
    }
    events.push(event);

    if (typeof onEvent === 'function') {
      onEvent(event);
    }

    appendTimelinePoint(event);
    emitSnapshot();

    if (state && Number.isInteger(state.i) && Number.isInteger(state.j)) {
      const key = `${state.i},${state.j}`;
      stateCounts.set(key, (stateCounts.get(key) ?? 0) + 1);
    }
  }

  try {
    dp[m][n] = true;
  pushEvent('DP_START', { i: m, j: n }, 'initialize base case', { variables: { value: true } });

  for (let i = m; i >= 0; i -= 1) {
    if (typeof shouldAbort === 'function' && shouldAbort()) {
      throw new Error('Client disconnected');
    }
    for (let j = n - 1; j >= 0; j -= 1) {
      if (typeof shouldAbort === 'function' && shouldAbort()) {
        throw new Error('Client disconnected');
      }
      const firstMatch = i < m && (s[i] === p[j] || p[j] === '.');
      orderMap[`${i},${j}`] = step + 1;
      pushEvent('DP_CELL', { i, j }, 'process cell', { variables: { firstMatch } });

      if (j + 1 < n && p[j + 1] === '*') {
        const dependencies = [`${i},${j + 2}`, `${i + 1},${j}`];
        dependencyMap[`${i},${j}`] = dependencies;
        pushEvent('STAR_FOUND', { i, j }, 'star transition', { variables: { dependency: dependencies } });
        dp[i][j] = dp[i][j + 2] || (firstMatch && dp[i + 1][j]);
      } else {
        const dependencies = [`${i + 1},${j + 1}`];
        dependencyMap[`${i},${j}`] = dependencies;
        pushEvent('COMPARE', { i, j }, 'plain transition', { variables: { dependency: dependencies } });
        dp[i][j] = firstMatch && dp[i + 1][j + 1];
      }

      pushEvent('DP_CELL_RESULT', { i, j }, 'cell result', { variables: { value: dp[i][j] } });
    }
  }

    pushEvent('DP_FINISH', { i: 0, j: 0 }, 'dp finished', { variables: { value: dp[0][0] } });
  } catch (error) {
    if (error instanceof ExecutionBudgetExceededError) {
      logDpEvent('execution-budget-exceeded', {
        algorithm: 'bottomup',
        input: { s, p },
        details: error.details,
      });
      throw error;
    }
    throw error;
  }

  logDpEvent('dp-completed', {
    algorithm: 'bottomup',
    input: { s: s.length, p: p.length },
    steps: step,
    maxDepthReached,
    eventCount: events.length,
  });

  const uniqueStates = stateCounts.size;
  const totalStateVisits = Array.from(stateCounts.values()).reduce((sum, value) => sum + value, 0);
  const repeatedVisits = Math.max(0, totalStateVisits - uniqueStates);
  const possibleStates = (m + 1) * (n + 1);
  const coverage = possibleStates ? uniqueStates / possibleStates : 0;
  const repeatedStates = Array.from(stateCounts.entries())
    .map(([state, count]) => ({ state, count }))
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const reuseFactor = uniqueStates ? Number((totalStateVisits / uniqueStates).toFixed(2)) : 0;
  const analytics = {
    timeline: analyticsTimeline,
    branchingActivity: [],
    patternDifficulty: createPatternDifficulty(p),
  };

  const result = {
    algorithm: 'bottomup',
    input: { s, p },
    dp,
    dependencies: dependencyMap,
    order: orderMap,
    metrics: {
      calls,
      steps: step,
      depth: Math.max(m, n),
      uniqueStates,
      totalStateVisits,
      repeatedVisits,
      repeatedStates,
      possibleStates,
      coverage,
      reuseFactor,
      analytics,
    },
    finalAnswer: dp[0][0],
    events,
  };

  emitSnapshot(dp[0][0], true);

  return result;
}
