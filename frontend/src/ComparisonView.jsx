import { useMemo, useState } from 'react';

const formatPercent = (value) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : 'N/A');
const formatValue = (value) => (value == null ? 'N/A' : String(value));

const metricOptions = [
  { value: 'calls', label: 'Calls' },
  { value: 'steps', label: 'Steps' },
  { value: 'uniqueStates', label: 'Unique states' },
  { value: 'totalStateVisits', label: 'Total state visits' },
  { value: 'repeatedVisits', label: 'Repeated visits' },
  { value: 'coverage', label: 'Coverage' },
  { value: 'resolvedStates', label: 'Resolved states' },
  { value: 'reusePercentage', label: 'Reuse percentage' },
  { value: 'hitRate', label: 'Hit rate' },
  { value: 'maxDepth', label: 'Max depth' },
];

export default function ComparisonView({ traces }) {
  const [selectedMetric, setSelectedMetric] = useState('calls');

  const tableFields = [
    { label: 'Calls', field: 'calls' },
    { label: 'Steps', field: 'steps' },
    { label: 'Unique states', field: 'uniqueStates' },
    { label: 'Total state visits', field: 'totalStateVisits' },
    { label: 'Repeated visits', field: 'repeatedVisits' },
    { label: 'Coverage', field: 'coverage', formatter: formatPercent },
    { label: 'Memo hits', field: 'memoHits' },
    { label: 'Resolved states', field: 'resolvedStates' },
    { label: 'Reuse percentage', field: 'reusePercentage', formatter: formatPercent },
    { label: 'Hit rate', field: 'hitRate', formatter: formatPercent },
    { label: 'Reuse factor', field: 'reuseFactor' },
    { label: 'Max depth', field: 'maxDepth' },
  ];

  const backtracking = traces?.find((trace) => trace.algorithm === 'backtracking');
  const memo = traces?.find((trace) => trace.algorithm === 'memo');

  const comparisonStats = useMemo(() => {
    if (!backtracking || !memo) return [];

    return [
      {
        label: 'Call reduction (vs w/o memo)',
        value: `${Math.max(0, backtracking.metrics?.calls - memo.metrics?.calls)} fewer calls`,
      },
      {
        label: 'Memo hits',
        value: `${memo.metrics?.memoHits ?? 0} memo hits`,
      },
      {
        label: 'Resolved states',
        value: `${memo.metrics?.resolvedStates ?? 0} states actually solved`,
      },
      {
        label: 'Reuse percentage',
        value: `${formatPercent(memo.metrics?.reusePercentage ?? 0)} of resolved states reused`,
      },
      {
        label: 'Cache utilization',
        value: `${memo.metrics?.uniqueStates ?? 0} / ${memo.metrics?.possibleStates ?? 0}`,
      },
      {
        label: 'Step savings (vs w/o memo)',
        value: `${Math.max(0, backtracking.metrics?.steps - memo.metrics?.steps)} fewer steps`,
      },
    ];
  }, [backtracking, memo]);

  if (!traces || traces.length === 0) {
    return null;
  }

  const selectedMetricMax = Math.max(1, ...traces.map((trace) => {
    const value = trace.metrics?.[selectedMetric];
    return typeof value === 'number' ? Math.abs(value) : 0;
  }));

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
                  <td key={`${trace.algorithm}-${field}`}>
                    {formatter ? formatter(trace.metrics?.[field]) : formatValue(trace.metrics?.[field])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="metric-selector">
        <label>
          Compare metric
          <select value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value)}>
            {metricOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="comparison-chart">
        {traces.map((trace) => {
          const rawValue = trace.metrics?.[selectedMetric] ?? 0;
          const width = selectedMetric === 'coverage' || selectedMetric === 'hitRate'
            ? Math.round((rawValue ?? 0) * 100)
            : Math.round((Math.abs(rawValue) / selectedMetricMax) * 100);
          return (
            <div key={trace.algorithm} className="bar-row">
              <span className="bar-label">{trace.algorithm}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${width}%` }} />
              </div>
              <span className="bar-value">
                {selectedMetric === 'coverage' || selectedMetric === 'hitRate' ? formatPercent(rawValue) : formatValue(rawValue)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="comparison-grid">
        {traces.map((trace) => (
          <div key={trace.algorithm} className="comparison-card">
            <h4>{trace.algorithm}</h4>
            <p><strong>Answer:</strong> {String(trace.finalAnswer)}</p>
            <p><strong>State graph:</strong> {formatValue(trace.stateGraph?.length)}</p>
          </div>
        ))}
      </div>

      {comparisonStats.length ? (
        <div className="comparison-summary">
          <h4>Memoization impact</h4>
          <div className="comparison-grid">
            {comparisonStats.map((item) => (
              <div key={item.label} className="comparison-card highlight-card">
                <strong>{item.label}</strong>
                <p>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {memo ? (
        <div className="comparison-summary">
          <h4>Top repeated states</h4>
          <div className="comparison-grid">
            {(memo.metrics.repeatedStates ?? []).map((entry) => (
              <div key={entry.state} className="comparison-card">
                <strong>{entry.state}</strong>
                <p>{entry.count} visits</p>
              </div>
            ))}
            {!(memo.metrics.repeatedStates?.length) ? (
              <div className="comparison-card">
                <p>No repeated states recorded.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
