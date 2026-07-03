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

const renderCommonChart = ({ title, children }) => (
  <div className="analytics-chart-card">
    <h4>{title}</h4>
    <div className="analytics-chart-shell">{children}</div>
  </div>
);

const timelineToData = (series) => series?.map(({ step, value }) => ({ step, value })) ?? [];

export default function AnalyticsCharts({ analytics, algorithm, comparison }) {
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
    memory: trace.metrics?.reuseFactor ?? 0,
  })) ?? [];

  const radarData = [
    { metric: 'Calls', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Steps', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Redundancy', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Coverage', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Memory', backtracking: 0, memo: 0, bottomup: 0 },
    { metric: 'Memo Efficiency', backtracking: 0, memo: 0, bottomup: 0 },
  ];

  if (comparisonMetrics.length) {
    const byAlgorithm = comparisonMetrics.reduce((acc, trace) => {
      acc[trace.algorithm] = trace;
      return acc;
    }, {});
    radarData[0].backtracking = byAlgorithm.backtracking?.calls ?? 0;
    radarData[0].memo = byAlgorithm.memo?.calls ?? 0;
    radarData[0].bottomup = byAlgorithm.bottomup?.calls ?? 0;
    radarData[1].backtracking = byAlgorithm.backtracking?.steps ?? 0;
    radarData[1].memo = byAlgorithm.memo?.steps ?? 0;
    radarData[1].bottomup = byAlgorithm.bottomup?.steps ?? 0;
    radarData[2].backtracking = byAlgorithm.backtracking?.repeatedVisits ?? 0;
    radarData[2].memo = byAlgorithm.memo?.repeatedVisits ?? 0;
    radarData[2].bottomup = byAlgorithm.bottomup?.repeatedVisits ?? 0;
    radarData[3].backtracking = byAlgorithm.backtracking?.coverage ?? 0;
    radarData[3].memo = byAlgorithm.memo?.coverage ?? 0;
    radarData[3].bottomup = byAlgorithm.bottomup?.coverage ?? 0;
    radarData[4].backtracking = byAlgorithm.backtracking?.reuseFactor ?? 0;
    radarData[4].memo = byAlgorithm.memo?.reuseFactor ?? 0;
    radarData[4].bottomup = byAlgorithm.bottomup?.reuseFactor ?? 0;
    radarData[5].backtracking = byAlgorithm.backtracking?.hitRate ?? 0;
    radarData[5].memo = byAlgorithm.memo?.hitRate ?? 0;
    radarData[5].bottomup = byAlgorithm.bottomup?.hitRate ?? 0;
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

      {comparisonMetrics.length ? renderCommonChart({
        title: 'Analytics Radar',
        children: (
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
        ),
      }) : null}

      {algorithm === 'memo' ? renderCommonChart({
        title: 'Cache Utilization',
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