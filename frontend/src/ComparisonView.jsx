export default function ComparisonView({ traces }) {
  if (!traces || traces.length === 0) {
    return null;
  }

  const formatPercent = (value) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : 'N/A');
  const formatValue = (value) => (value == null ? 'N/A' : String(value));

  const summary = [];
  const backtracking = traces.find((trace) => trace.algorithm === 'backtracking');
  const memo = traces.find((trace) => trace.algorithm === 'memo');
  if (backtracking && memo) {
    summary.push({
      label: 'Call reduction (vs w/o memo)',
      value: `${backtracking.metrics.calls - memo.metrics.calls} fewer calls`,
    });
    summary.push({
      label: 'Memo hits',
      value: `${memo.metrics.memoHits} memo hits`,
    });
    summary.push({
      label: 'Cache utilization',
      value: `${memo.metrics.uniqueStates ?? 0} / ${memo.metrics.possibleStates ?? 0}`,
    });
    summary.push({
      label: 'Step savings (vs w/o memo)',
      value: `${backtracking.metrics.steps - memo.metrics.steps} fewer steps`,
    });
  }

  const tableFields = [
    { label: 'Calls', field: 'calls' },
    { label: 'Steps', field: 'steps' },
    { label: 'Unique states', field: 'uniqueStates' },
    { label: 'Coverage', field: 'coverage', formatter: formatPercent },
    { label: 'Memo hits', field: 'memoHits' },
    { label: 'Hit rate', field: 'hitRate', formatter: formatPercent },
    { label: 'Reuse factor', field: 'reuseFactor' },
  ];

  const chartMetrics = [
    { key: 'calls', label: 'Calls', variant: 'primary' },
    { key: 'steps', label: 'Steps', variant: 'accent' },
    { key: 'coverage', label: 'Coverage', isPercent: true },
    { key: 'hitRate', label: 'Hit rate', isPercent: true },
  ];

  const maxValues = {
    calls: Math.max(1, ...traces.map((trace) => trace.metrics?.calls ?? 0)),
    steps: Math.max(1, ...traces.map((trace) => trace.metrics?.steps ?? 0)),
  };

  return (
    <div className="comparison-view">
      <h3>Comparison</h3>

      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Metric</th>
              {traces.map((trace) => (
                <th key={trace.algorithm}>{trace.algorithm}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableFields.map(({ label, field, formatter }) => (
              <tr key={field}>
                <td>{label}</td>
                {traces.map((trace) => (
                  <td key={trace.algorithm}>{formatter ? formatter(trace.metrics?.[field]) : formatValue(trace.metrics?.[field])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="comparison-bar-charts">
        {chartMetrics.map(({ key, label, variant, isPercent }) => {
          const topValue = isPercent ? 1 : Math.max(1, ...traces.map((trace) => trace.metrics?.[key] ?? 0));
          return (
            <div key={key} className="chart-card">
              <h4>{label}</h4>
              {traces.map((trace) => {
                const rawValue = trace.metrics?.[key] ?? 0;
                const value = isPercent ? rawValue : rawValue;
                const width = isPercent ? Math.round(rawValue * 100) : Math.round((rawValue / topValue) * 100);
                return (
                  <div key={trace.algorithm} className="bar-row">
                    <span className="bar-label">{trace.algorithm}</span>
                    <div className="bar-track">
                      <div className={`bar-fill${variant === 'accent' ? ' accent' : ''}`} style={{ width: `${width}%` }} />
                    </div>
                    <span className="bar-value">{isPercent ? formatPercent(rawValue) : formatValue(value === 0 ? 0 : rawValue)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="comparison-grid">
        {traces.map((trace) => (
          <div key={trace.algorithm} className="comparison-card">
            <h4>{trace.algorithm}</h4>
            <p><strong>Answer:</strong> {String(trace.finalAnswer)}</p>
            <p><strong>Calls:</strong> {formatValue(trace.metrics?.calls)}</p>
            <p><strong>Memo hits:</strong> {formatValue(trace.metrics?.memoHits ?? 0)}</p>
            <p><strong>Steps:</strong> {formatValue(trace.metrics?.steps)}</p>
            <p><strong>State graph:</strong> {formatValue(trace.stateGraph?.length)}</p>
          </div>
        ))}
      </div>

      {summary.length ? (
        <div className="comparison-summary">
          <h4>Memoization impact</h4>
          <div className="comparison-grid">
            {summary.map((item) => (
              <div key={item.label} className="comparison-card highlight-card">
                <strong>{item.label}</strong>
                <p>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
