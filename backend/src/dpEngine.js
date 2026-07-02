export function runBottomUp({ s, p }) {
  const events = [];
  const m = s.length;
  const n = p.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
  let step = 0;

  function pushEvent(type, state, description, extra = {}) {
    step += 1;
    events.push({
      id: `${type}-${step}`,
      step,
      type,
      timestamp: new Date().toISOString(),
      state,
      description,
      variables: {},
      codeReference: null,
      ...extra,
    });
  }

  dp[m][n] = true;
  pushEvent('DP_START', { i: m, j: n }, 'initialize base case', { variables: { value: true } });

  for (let i = m; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      const firstMatch = i < m && (s[i] === p[j] || p[j] === '.');
      pushEvent('DP_CELL', { i, j }, 'process cell', { variables: { firstMatch } });

      if (j + 1 < n && p[j + 1] === '*') {
        pushEvent('STAR_FOUND', { i, j }, 'star transition', { variables: { dependency: [`${i},${j + 2}`, `${i + 1},${j}`] } });
        dp[i][j] = dp[i][j + 2] || (firstMatch && dp[i + 1][j]);
      } else {
        pushEvent('COMPARE', { i, j }, 'plain transition', { variables: { dependency: [`${i + 1},${j + 1}`] } });
        dp[i][j] = firstMatch && dp[i + 1][j + 1];
      }

      pushEvent('DP_CELL_RESULT', { i, j }, 'cell result', { variables: { value: dp[i][j] } });
    }
  }

  pushEvent('DP_FINISH', { i: 0, j: 0 }, 'dp finished', { variables: { value: dp[0][0] } });

  return {
    algorithm: 'bottomup',
    input: { s, p },
    events,
    dp,
    metrics: {
      calls: events.length,
      steps: events.length,
      depth: Math.max(m, n),
    },
    finalAnswer: dp[0][0],
  };
}
