export default function ComparisonView({ traces }) {
  if (!traces || traces.length === 0) {
    return null;
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
          </div>
        ))}
      </div>
    </div>
  );
}
