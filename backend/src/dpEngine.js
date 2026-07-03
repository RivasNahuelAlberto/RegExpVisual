export function runBottomUp({ s, p, stream = false, onEvent = null, shouldAbort = null }) {
  const events = stream ? null : [];
  const m = s.length;
  const n = p.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
  const dependencyMap = {};
  const orderMap = {};
  const stateCounts = new Map();
  let step = 0;

  function pushEvent(type, state, description, extra = {}) {
    if (typeof shouldAbort === 'function' && shouldAbort()) {
      throw new Error('Client disconnected');
    }

    step += 1;
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

    if (events) {
      events.push(event);
    }

    if (typeof onEvent === 'function') {
      onEvent(event);
    }

    if (state && Number.isInteger(state.i) && Number.isInteger(state.j)) {
      const key = `${state.i},${state.j}`;
      stateCounts.set(key, (stateCounts.get(key) ?? 0) + 1);
    }
  }

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

  const result = {
    algorithm: 'bottomup',
    input: { s, p },
    dp,
    dependencies: dependencyMap,
    order: orderMap,
    metrics: {
      calls: 1,
      steps: step,
      depth: Math.max(m, n),
      uniqueStates,
      totalStateVisits,
      repeatedVisits,
      repeatedStates,
      possibleStates,
      coverage,
      reuseFactor,
    },
    finalAnswer: dp[0][0],
  };

  if (!stream) {
    result.events = events;
  }

  return result;
}
