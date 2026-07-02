export default function ComparisonView({ traces }) {
  if (!traces || traces.length === 0) {
    return null;
  }

  const backtracking = traces.find((trace) => trace.algorithm === 'backtracking');
  const memo = traces.find((trace) => trace.algorithm === 'memo');
  const bottomup = traces.find((trace) => trace.algorithm === 'bottomup');

  const summary = [];
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
      label: 'Step savings (vs w/o memo)',
      value: `${backtracking.metrics.steps - memo.metrics.steps} fewer steps`,
    });
  }

  return (
    <div className="comparison-view">
      <h3>Comparison</h3>
      <div className="comparison-grid">
        {traces.map((trace) => (
          <div key={trace.algorithm} className="comparison-card">
            <h4>{trace.algorithm}</h4>
            <p><strong>Answer:</strong> {String(trace.finalAnswer)}</p>
            <p><strong>Calls:</strong> {trace.metrics?.calls}</p>
            <p><strong>Memo hits:</strong> {trace.metrics?.memoHits ?? 0}</p>
            <p><strong>Steps:</strong> {trace.metrics?.steps}</p>
            <p><strong>State graph:</strong> {trace.stateGraph?.length}</p>
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
