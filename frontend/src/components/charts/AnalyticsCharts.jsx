import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';

const palette = {
  calls: '#60a5fa',
  uniqueStates: '#34d399',
  memoHits: '#f97316',
  coverage: '#22d3ee',
  depth: '#8b5cf6',
  storedStates: '#facc15',
  branching: '#a78bfa',
  difficulty: '#38bdf8',
  stars: '#f97316',
  dots: '#38bdf8',
  length: '#7c3aed',
  branchingPoints: '#2dd4bf',
};

const normalizeToPercent = (value, maxValue) => {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((value / maxValue) * 100)));
};

const invertToPercent = (value, maxValue) => {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) {
    return 0;
  }
  const normalized = Math.min(1, Math.max(0, value / maxValue));
  return Math.min(100, Math.max(0, Math.round((1 - normalized) * 100)));
};

const chartHelpKeyMap = {
  'Recursive Calls Evolution': 'recursiveCallsEvolution',
  'Unique States Discovery': 'uniqueStatesDiscovery',
  'Memoization Efficiency': 'memoizationEfficiency',
  'State Coverage': 'stateCoverage',
  'Recursion Depth': 'recursionDepth',
  'Branching Activity': 'branchingActivity',
  'Calls vs Unique States': 'callsVsUniqueStates',
  'Calls vs Memo Hits': 'callsVsMemoHits',
  'Algorithm Comparison': 'algorithmComparison',
  'Analytics Radar': 'analyticsRadar',
  'Cache Utilization': 'cacheUtilization',
  'Pattern Difficulty Breakdown': 'patternDifficultyBreakdown',
};

const renderCommonChart = ({ title, children, onHelpClick }) => (
  <div className="analytics-chart-card">
    <div className="analytics-chart-header">
      <h4>{title}</h4>
      {onHelpClick && <button type="button" className="chart-help-trigger" onClick={() => onHelpClick(chartHelpKeyMap[title] ?? title)}>Help</button>}
    </div>
    <div className="analytics-chart-shell">{children}</div>
  </div>
);

const timelineToData = (series) => series?.map(({ step, value }) => ({ step, value })) ?? [];

export default function AnalyticsCharts({ analytics, algorithm, comparison, onHelpClick }) {
  const callsData = timelineToData(analytics.timeline.calls);
  const uniqueStatesData = timelineToData(analytics.timeline.uniqueStates);
  const memoHitsData = timelineToData(analytics.timeline.memoHits);
  const coverageData = timelineToData(analytics.timeline.coverage);
  const depthData = timelineToData(analytics.timeline.depth);
  const storedStatesData = timelineToData(analytics.timeline.storedStates);
  const branchingData = (analytics.branchingActivity || []).map((entry) => ({ level: entry.level, children: entry.children }));

  const comparisonMetrics = comparison?.map((trace) => ({
    algorithm: trace.algorithm,
    calls: trace.metrics?.calls ?? 0,
    steps: trace.metrics?.steps ?? 0,
    uniqueStates: trace.metrics?.uniqueStates ?? 0,
    maxDepth: trace.metrics?.maxDepth ?? 0,
    coverage: trace.metrics?.coverage ?? 0,
    memoEfficiency: trace.metrics?.hitRate ?? 0,
    redundancy: trace.metrics?.repeatedVisits ?? 0,
    memory: trace.algorithm === 'memo' ? (trace.metrics?.reusePercentage ?? 0) : 0,
  })) ?? [];

  const radarData = [
    { metric: 'Calls (lower is better)', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Steps (lower is better)', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Redundancy (lower is better)', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Coverage (higher is better)', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Memory reuse (higher is better)', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Efficiency (higher is better)', backtracking: 0, memo: 0, bottomup: 0 },
  ];

  if (comparisonMetrics.length) {
    const byAlgorithm = comparisonMetrics.reduce((acc, trace) => {
      acc[trace.algorithm] = trace;
      return acc;
    }, {});
    
    const maxCalls = Math.max(...comparisonMetrics.map((t) => t.calls || 0), 1);
    const maxSteps = Math.max(...comparisonMetrics.map((t) => t.steps || 0), 1);
    const maxRedundancy = Math.max(...comparisonMetrics.map((t) => t.redundancy || 0), 1);
    const maxMemory = Math.max(...comparisonMetrics.map((t) => t.memory || 0), 1);

    radarData[0].backtracking = invertToPercent(byAlgorithm.backtracking?.calls ?? 0, maxCalls);
    radarData[0].memo = invertToPercent(byAlgorithm.memo?.calls ?? 0, maxCalls);
    radarData[0].bottomup = invertToPercent(byAlgorithm.bottomup?.calls ?? 0, maxCalls);

    radarData[1].backtracking = invertToPercent(byAlgorithm.backtracking?.steps ?? 0, maxSteps);
    radarData[1].memo = invertToPercent(byAlgorithm.memo?.steps ?? 0, maxSteps);
    radarData[1].bottomup = invertToPercent(byAlgorithm.bottomup?.steps ?? 0, maxSteps);

    radarData[2].backtracking = invertToPercent(byAlgorithm.backtracking?.redundancy ?? 0, maxRedundancy);
    radarData[2].memo = invertToPercent(byAlgorithm.memo?.redundancy ?? 0, maxRedundancy);
    radarData[2].bottomup = invertToPercent(byAlgorithm.bottomup?.redundancy ?? 0, maxRedundancy);

    radarData[3].backtracking = Math.round(Math.min(100, Math.max(0, (byAlgorithm.backtracking?.coverage ?? 0) * 100)));
    radarData[3].memo = Math.round(Math.min(100, Math.max(0, (byAlgorithm.memo?.coverage ?? 0) * 100)));
    radarData[3].bottomup = Math.round(Math.min(100, Math.max(0, (byAlgorithm.bottomup?.coverage ?? 0) * 100)));

    radarData[4].backtracking = normalizeToPercent(byAlgorithm.backtracking?.memory ?? 0, maxMemory);
    radarData[4].memo = normalizeToPercent(byAlgorithm.memo?.memory ?? 0, maxMemory);
    radarData[4].bottomup = normalizeToPercent(byAlgorithm.bottomup?.memory ?? 0, maxMemory);

    radarData[5].backtracking = Math.round(Math.min(100, Math.max(0, (byAlgorithm.backtracking?.memoEfficiency ?? 0) * 100)));
    radarData[5].memo = Math.round(Math.min(100, Math.max(0, (byAlgorithm.memo?.memoEfficiency ?? 0) * 100)));
    radarData[5].bottomup = Math.round(Math.min(100, Math.max(0, (byAlgorithm.bottomup?.memoEfficiency ?? 0) * 100)));
  }

  const patternDifficultyData = [
    { label: '* count', value: analytics.patternDifficulty.starCount ?? 0, fill: palette.stars },
    { label: '. count', value: analytics.patternDifficulty.dotCount ?? 0, fill: palette.dots },
    { label: 'length', value: analytics.patternDifficulty.patternLength ?? 0, fill: palette.length },
    { label: 'branching', value: analytics.patternDifficulty.branchingPoints ?? 0, fill: palette.branchingPoints },
  ];

  return (
    <div className="analytics-charts-grid">
      {renderCommonChart({
        title: 'Recursive Calls Evolution',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={callsData}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="step" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Line type="monotone" dataKey="value" stroke={palette.calls} strokeWidth={2} dot={false} name="Calls" />
            </LineChart>
          </ResponsiveContainer>
        ),
      })}

      {renderCommonChart({
        title: 'Unique States Discovery',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={uniqueStatesData}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="step" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Line type="monotone" dataKey="value" stroke={palette.uniqueStates} strokeWidth={2} dot={false} name="Unique States" />
            </LineChart>
          </ResponsiveContainer>
        ),
      })}

      {algorithm === 'memo' ? renderCommonChart({
        title: 'Memoization Efficiency',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={memoHitsData}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="step" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Line type="monotone" dataKey="value" stroke={palette.memoHits} strokeWidth={2} dot={false} name="Memo Hits" />
            </LineChart>
          </ResponsiveContainer>
        ),
      }) : null}

      {renderCommonChart({
        title: 'State Coverage',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={coverageData}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="step" stroke="#cbd5e1" />
              <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} formatter={(value) => `${Math.round(value * 100)}%`} />
              <Area type="monotone" dataKey="value" stroke={palette.coverage} fill={palette.coverage} name="Coverage" />
            </AreaChart>
          </ResponsiveContainer>
        ),
      })}

      {renderCommonChart({
        title: 'Recursion Depth',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={depthData}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="step" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Line type="monotone" dataKey="value" stroke={palette.depth} strokeWidth={2} dot={false} name="Depth" />
              <Line type="monotone" data={depthData.map((entry) => ({ ...entry, max: Math.max(...depthData.map((item) => item.value)) }))} dataKey="max" stroke="#a78bfa" strokeDasharray="4 3" dot={false} name="Max depth" />
            </LineChart>
          </ResponsiveContainer>
        ),
      })}

      {renderCommonChart({
        title: 'Branching Activity',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={branchingData}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="level" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Bar dataKey="children" fill={palette.branching} name="Children" />
            </BarChart>
          </ResponsiveContainer>
        ),
      })}

      {renderCommonChart({
        title: 'Calls vs Unique States',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={callsData.map((entry, index) => ({
              step: entry.step,
              calls: entry.value,
              uniqueStates: uniqueStatesData[index]?.value ?? 0,
            }))}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="step" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Line type="monotone" dataKey="calls" stroke={palette.calls} strokeWidth={2} dot={false} name="Calls" />
              <Line type="monotone" dataKey="uniqueStates" stroke={palette.uniqueStates} strokeWidth={2} dot={false} name="Unique States" />
            </LineChart>
          </ResponsiveContainer>
        ),
      })}

      {algorithm === 'memo' ? renderCommonChart({
        title: 'Calls vs Memo Hits',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={callsData.map((entry, index) => ({
              step: entry.step,
              calls: entry.value,
              memoHits: memoHitsData[index]?.value ?? 0,
            }))}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="step" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Line type="monotone" dataKey="calls" stroke={palette.calls} strokeWidth={2} dot={false} name="Calls" />
              <Line type="monotone" dataKey="memoHits" stroke={palette.memoHits} strokeWidth={2} dot={false} name="Memo Hits" />
            </LineChart>
          </ResponsiveContainer>
        ),
      }) : null}

      {renderCommonChart({
        title: 'Algorithm Comparison',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonMetrics}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="algorithm" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Legend />
              <Bar dataKey="calls" fill={palette.calls} name="Calls" />
              <Bar dataKey="steps" fill={palette.uniqueStates} name="Steps" />
              <Bar dataKey="uniqueStates" fill={palette.coverage} name="Unique States" />
              <Bar dataKey="maxDepth" fill={palette.depth} name="Max Depth" />
            </BarChart>
          </ResponsiveContainer>
        ),
      })}

      {/* {comparisonMetrics.length ? renderCommonChart({
        title: 'Analytics Radar',
        onHelpClick,
        children: (
          <>
            <p style={{ margin: '0 0 0.75rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
              Scores are normalized to 0–100%. Higher is better for coverage, memory reuse, and efficiency; lower is better for calls, steps, and redundancy.
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(148, 163, 184, 0.15)" />
                <PolarAngleAxis dataKey="metric" stroke="#cbd5e1" />
                <PolarRadiusAxis stroke="#cbd5e1" />
                <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
                <Radar name="Backtracking" dataKey="backtracking" stroke={palette.calls} fill={palette.calls} fillOpacity={0.2} />
                <Radar name="Memo" dataKey="memo" stroke={palette.memoHits} fill={palette.memoHits} fillOpacity={0.2} />
                <Radar name="Bottom-Up" dataKey="bottomup" stroke={palette.depth} fill={palette.depth} fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </>
        ),
      }) : null} */}

      {algorithm === 'memo' ? renderCommonChart({
        title: 'Cache Utilization',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={storedStatesData.map((entry) => ({
              step: entry.step,
              storedStates: entry.value,
              capacity: analytics.patternDifficulty.patternLength ? analytics.patternDifficulty.patternLength * 2 : 1,
            }))}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="step" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Area type="monotone" dataKey="storedStates" stroke={palette.storedStates} fill={palette.storedStates} name="Stored States" />
              <Area type="monotone" dataKey="capacity" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.12} name="Capacity" />
            </AreaChart>
          </ResponsiveContainer>
        ),
      }) : null}

      {renderCommonChart({
        title: 'Pattern Difficulty Breakdown',
        onHelpClick,
        children: (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={patternDifficultyData}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="label" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148, 163, 184, 0.2)' }} />
              <Bar dataKey="value" name="Contribution" fill={palette.difficulty} />
            </BarChart>
          </ResponsiveContainer>
        ),
      })}
    </div>
  );
}