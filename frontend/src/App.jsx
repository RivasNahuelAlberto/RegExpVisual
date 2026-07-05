import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ComparisonView from './ComparisonView';
import DpTable from './DpTable';
import TreeView from './TreeView';
import AnalyticsCharts from './components/charts/AnalyticsCharts';
import { buildApiPath, postJson } from './apiClient';
import pseudocodeByAlgorithm from './pseudocodeData';

const getStateCounts = (events) => {
  const counts = new Map();
  for (const event of events ?? []) {
    const state = event.state;
    if (state && Number.isInteger(state.i) && Number.isInteger(state.j)) {
      const key = `${state.i},${state.j}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
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
    if (!roots.length) return 0;
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

const formatPercent = (value) => `${Math.round(value * 100)}%`;

const buildMetricHelpContent = ({ analytics, input, algorithm, comparison }) => {
  const pattern = typeof input?.p === 'string' ? input.p : '';
  const text = typeof input?.s === 'string' ? input.s : '';
  const starCount = (pattern.match(/\*/g) || []).length;
  const dotCount = (pattern.match(/\./g) || []).length;
  const patternLength = pattern.length;
  const starDensity = patternLength ? starCount / patternLength : 0;
  const dotDensity = patternLength ? dotCount / patternLength : 0;
  
  // Classify pattern by characteristics
  const classifyPattern = () => {
    if (patternLength === 0) return 'empty';
    if (patternLength <= 5 && starCount === 0 && dotCount === 0) return 'trivial';
    if (starDensity > 0.4 || dotDensity > 0.35) return 'highly-flexible';
    if (starDensity > 0.2 || dotDensity > 0.15) return 'flexible';
    if (starDensity > 0.1 || dotDensity > 0.08) return 'moderate';
    return 'restrictive';
  };
  
  const patternType = classifyPattern();
  const patternDescription = {
    trivial: 'a simple literal pattern',
    restrictive: 'a restrictive pattern with few wildcards',
    moderate: 'a moderately flexible pattern',
    flexible: 'a flexible pattern with significant wildcards',
    'highly-flexible': 'a highly flexible pattern with many wildcards and alternatives',
    empty: 'an empty pattern',
  }[patternType] || 'a pattern';
  
  const currentAlgorithmLabel = algorithm === 'memo' ? 'memoization' : algorithm === 'bottomup' ? 'bottom-up DP' : 'backtracking';
  const algorithmDescriptor = algorithm === 'memo' ? 'memoized backtracking' : algorithm === 'bottomup' ? 'bottom-up dynamic programming' : 'backtracking';
  const memoTrace = comparison?.find((trace) => trace.algorithm === 'memo');
  const backtrackingTrace = comparison?.find((trace) => trace.algorithm === 'backtracking');
  const comparisonExample = memoTrace && backtrackingTrace
    ? `For this input, backtracking used ${backtrackingTrace.metrics?.calls ?? 0} calls while ${currentAlgorithmLabel} used ${memoTrace.metrics?.calls ?? 0}.`
    : 'The comparison section will update as soon as both traces are available.';

  return {
    stateExploration: {
      title: 'State exploration',
      intro: 'These metrics explain how much of the search space the algorithm actually visited and whether it revisited states unnecessarily.',
      items: [
        { name: 'Unique states', description: 'Counts distinct (i, j) states reached during execution.', how: 'The backend collects every state key from the trace and deduplicates it after the run.', example: analytics ? `For your ${patternDescription} pattern, the ${algorithmDescriptor} algorithm discovered ${analytics.uniqueStates} unique states from ${analytics.possibleStates} possible positions.` : `With ${patternDescription}, the search explores a subset of the ${text.length + 1} × ${pattern.length + 1} possible state space.` },
        { name: 'Total state visits', description: 'Shows the cumulative number of times any state was visited throughout the execution.', how: 'Each time a state is visited during the search, it is counted. This includes repeated visits to the same state.', example: analytics ? `Your ${patternDescription} pattern generated ${analytics.totalStateVisits} total state visits across ${analytics.uniqueStates} unique states in the ${algorithmDescriptor} trace.` : `Total visits is typically higher than unique states when the search revisits states multiple times.` },
        { name: 'Repeated visits', description: 'Shows how often the same state was reached again after it had already been seen.', how: 'Each state occurrence is counted from the event stream and the repeated counts are derived from the total visits minus the unique states.', example: analytics ? `Your ${patternDescription} pattern generated ${analytics.repeatedVisits} repeated visits in the ${algorithmDescriptor} trace.` : `Repeated visits occur when ${patternType === 'highly-flexible' ? 'wildcards cause the search to revisit many states' : 'the search backtracks to explore alternatives'}.` },
        { name: 'Repeated ratio', description: 'Measures how much of the work was redundant.', how: 'It is computed as repeated visits divided by total visits.', example: analytics ? `The repeated ratio for your ${patternDescription} pattern is ${formatPercent(analytics.repeatedRatio)} — ${parseFloat(analytics.repeatedRatio) > 0.5 ? 'indicating significant redundant work' : 'suggesting efficient exploration'}.` : `For ${patternDescription}, expect ${patternType === 'highly-flexible' ? 'high redundancy' : patternType === 'flexible' ? 'moderate redundancy' : 'low redundancy'}.` },
        { name: 'Coverage', description: 'Shows what fraction of the complete state space was actually explored.', how: 'It uses the formula visited states divided by the maximum possible states, (m + 1) × (n + 1).', example: analytics ? `Your ${patternDescription} pattern achieved ${formatPercent(analytics.coverage)} coverage for the ${algorithmDescriptor} run.` : `Coverage depends on how much of the text the ${patternType === 'restrictive' ? 'restrictive pattern' : 'flexible pattern'} can match.` },
      ],
    },
    recursionTree: {
      title: 'Recursion tree',
      intro: 'These values describe the shape of the recursive exploration and how deeply the search expanded.',
      items: [
        { name: 'Max depth', description: 'Records the deepest recursion level reached during execution.', how: 'It is derived from the maximum nesting level observed while the call tree is built.', example: analytics ? `Your ${patternDescription} pattern reached a maximum recursion depth of ${analytics.treeMetrics?.maxDepth ?? 0} with the ${algorithmDescriptor} algorithm.` : `For ${patternDescription}, depth grows with ${patternType === 'highly-flexible' ? 'the many branching paths created by wildcards' : patternType === 'flexible' ? 'the choices introduced by wildcards' : 'the length of the search space'}.` },
        { name: 'Avg depth', description: 'Reflects the average nesting level across all recursive calls.', how: 'It is computed from the total depth of all nodes divided by the number of nodes in the call tree.', example: analytics ? `The average recursion depth for your ${patternDescription} pattern is ${analytics.treeMetrics?.avgDepth ?? 0}.` : `Average depth indicates ${patternType === 'restrictive' ? 'relatively shallow search' : 'moderate to deep exploration'} for this type of pattern.` },
        { name: 'Avg branching', description: 'Measures how many children each internal recursive call generated on average.', how: 'The backend divides total children by the number of internal nodes.', example: analytics ? `Your ${patternDescription} pattern creates an average branching factor of ${analytics.treeMetrics?.avgBranching ?? 0} — this ${parseFloat(analytics.treeMetrics?.avgBranching || 0) > 2 ? 'shows the pattern creates many branches' : 'indicates relatively linear exploration'}.` : `Branching for ${patternDescription} ${patternType === 'highly-flexible' ? 'is high due to wildcards' : patternType === 'flexible' ? 'is moderate' : 'is low'}.` },
        { name: 'Leaf nodes', description: 'Shows how many recursive calls ended without creating more children.', how: 'Leaf count comes directly from the terminal nodes in the call tree.', example: analytics ? `Your ${algorithmDescriptor} execution produced ${analytics.treeMetrics?.leaves ?? 0} leaf nodes from the ${patternDescription} pattern.` : 'Leaf nodes represent terminal points where the search completes.' },
        { name: 'Critical path', description: 'Indicates the length of the path that determines the final successful outcome.', how: 'The backend marks the critical path from the successful branches and counts the states in that path.', example: analytics ? `The critical path for your ${patternDescription} pattern contains ${analytics.treeMetrics?.criticalPathLength ?? 0} states in the ${algorithmDescriptor} trace.` : 'The critical path is the most direct route to the match result.' },
      ],
    },
    problemProfile: {
      title: 'Problem profile',
      intro: 'These values summarize the structure of the input pattern so the algorithmic complexity is easier to interpret.',
      items: [
        { name: 'Pattern length', description: 'Shows the length of the regex pattern supplied to the algorithm.', how: 'It is taken directly from the input pattern string.', example: `You have ${patternDescription} with length ${patternLength}, which will be matched against a string of length ${text.length}.` },
        { name: 'Star density', description: 'Measures how often the * operator appears in the pattern.', how: 'It is calculated as the count of * characters divided by the pattern length.', example: `Your pattern contains ${starCount} star(s), yielding a star density of ${formatPercent(starDensity)} — this ${patternType === 'highly-flexible' ? 'creates many branching choices' : patternType === 'flexible' ? 'moderately increases search choices' : patternType === 'moderate' ? 'introduces some backtracking' : 'has minimal impact'} for the ${algorithmDescriptor} algorithm.` },
        { name: 'Dot density', description: 'Measures how often the . wildcard appears in the pattern.', how: 'It is calculated as the count of . characters divided by the pattern length.', example: `Your pattern contains ${dotCount} dot(s), with a density of ${formatPercent(dotDensity)} — this ${patternType === 'highly-flexible' ? 'makes many positions flexible' : patternType === 'flexible' ? 'adds moderate flexibility' : patternType === 'moderate' ? 'adds minor flexibility' : 'is mostly fixed'}.` },
        { name: 'Difficulty score', description: 'Provides a rough heuristic for how hard the pattern is likely to be to explore.', how: 'It is derived from the pattern structure, including star density, dot density, and overall length.', example: analytics ? `Your ${patternDescription} pattern scores a difficulty of ${analytics.problemMetrics?.difficultyScore ?? 0} for this ${algorithmDescriptor} case.` : `For ${patternDescription}, expect ${patternType === 'highly-flexible' ? 'very high' : patternType === 'flexible' ? 'high' : patternType === 'moderate' ? 'moderate' : 'low'} algorithmic complexity.` },
      ],
    },
    memoization: {
      title: 'Memoization',
      intro: 'These metrics make the benefit of caching visible by distinguishing successful reuse from wasted recomputation.',
      items: [
        { name: 'Hits', description: 'Counts how many times the algorithm reused a cached state.', how: 'Each memo hit event emitted by the backend increments this counter.', example: analytics ? `This ${algorithmDescriptor} run recorded ${analytics.memoHits} memo hits.` : 'Memo hits grow when repeated states are queried again.' },
        { name: 'Misses', description: 'Counts how many states still had to be solved from scratch.', how: 'It is computed as total calls minus memo hits.', example: analytics ? `This ${algorithmDescriptor} run produced ${analytics.memoMisses} memo misses.` : 'Memo misses reflect work that still had to be recomputed.' },
        { name: 'Resolved states', description: 'Shows how many distinct states were actually solved and stored.', how: 'The backend tracks the set of resolved state keys and reports its size.', example: analytics ? `This ${algorithmDescriptor} run resolved ${analytics.resolvedStates} states.` : 'Resolved states correspond to the entries stored in the cache.' },
        { name: 'Reuse percentage', description: 'Shows how much of the resolved state space was reused after being stored.', how: 'It is computed as memo hits divided by resolved states.', example: analytics ? `The reuse percentage for this ${algorithmDescriptor} run is ${formatPercent(analytics.reusePercentage)}.` : 'A higher reuse percentage means the cache paid off more often.' },
        { name: 'Hit rate', description: 'Measures how effective the cache was during the run.', how: 'It is computed as memo hits divided by memo hits plus memo misses.', example: analytics ? `The cache hit rate for this ${algorithmDescriptor} run is ${formatPercent(analytics.hitRate)}.` : 'A high hit rate means the cache was effective.' },
        { name: 'Cache utilization', description: 'Shows how much of the available cache space was actually used.', how: 'It compares the number of stored states with the total possible state-space positions.', example: analytics ? `The cache utilization for this ${algorithmDescriptor} run is ${formatPercent(analytics.cacheUtilization)}.` : 'Utilization shows how much of the memo table was actually populated.' },
        { name: 'Reuse factor', description: 'Shows how many times each cached state was reused on average.', how: 'It is calculated as total state visits divided by the number of unique states.', example: analytics ? `The reuse factor for this ${algorithmDescriptor} run is ${analytics.reuseFactor}.` : 'A larger reuse factor means the cached states were reused more often.' },
      ],
    },
    comparison: {
      title: 'Comparison',
      intro: 'These values summarize how memoization changes the amount of work required compared with the non-memoized version.',
      items: [
        { name: 'Memo vs Backtracking', description: 'Shows the relative speedup in terms of call count.', how: 'It is computed as backtracking calls divided by memoized calls.', example: analytics?.comparisonMetrics?.speedupMemo != null ? `This run shows a ${analytics.comparisonMetrics.speedupMemo}x improvement over backtracking.` : comparisonExample },
        { name: 'Calls avoided', description: 'Shows how many recursive calls were skipped thanks to memoization.', how: 'It is derived from the difference between the two algorithms’ call counts.', example: analytics?.comparisonMetrics?.callsAvoided != null ? `This comparison avoided ${analytics.comparisonMetrics.callsAvoided} calls.` : comparisonExample },
        { name: 'Call reduction', description: 'Expresses the same improvement as a percentage.', how: 'It is computed as the share of calls removed relative to the backtracking baseline.', example: analytics?.comparisonMetrics?.callsReduction != null ? `The current call reduction is ${formatPercent(analytics.comparisonMetrics.callsReduction)}.` : comparisonExample },
        { name: 'Best calls', description: 'Highlights which algorithm used the fewest calls for the current input.', how: 'It is selected by comparing the call metrics across the available traces.', example: analytics?.comparisonMetrics?.winnerCalls ? `The current best-call algorithm is ${analytics.comparisonMetrics.winnerCalls}.` : 'The best-call winner appears once both traces are available.' },
        { name: 'Best steps', description: 'Highlights which algorithm required the fewest execution steps.', how: 'It is selected by comparing the step metrics across the available traces.', example: analytics?.comparisonMetrics?.winnerSteps ? `The current best-step algorithm is ${analytics.comparisonMetrics.winnerSteps}.` : 'The best-step winner appears once both traces are available.' },
      ],
    },
    visualAnalytics: {
      title: 'Visual analytics',
      intro: 'The charts complement the numeric metrics by showing how the execution evolves over time.',
      items: [
        { name: 'Calls and unique states', description: 'Shows whether the algorithm is doing a lot of work without discovering many new states.', how: 'The frontend renders the backend timeline for cumulative calls and discovered states side by side.', example: analytics ? `For this ${algorithmDescriptor} run, the timeline shows ${analytics.uniqueStates} unique states and ${analytics.memoHits} memo hits.` : 'The chart will show whether calls grow faster than new states are discovered.' },
        { name: 'Memo hits', description: 'Shows when the cache begins to pay off during execution.', how: 'The timeline is built from the cumulative memo-hit events emitted by the backend.', example: analytics ? `This ${algorithmDescriptor} run reports ${analytics.memoHits} cumulative memo hits.` : 'The memo-hit curve rises when reuse begins to happen.' },
        { name: 'Coverage and depth', description: 'Shows how quickly the search space becomes covered and how deeply the recursion grows.', how: 'These values are computed from the trace events and the current recursion depth recorded during execution.', example: analytics ? `This ${algorithmDescriptor} run reached ${formatPercent(analytics.coverage)} coverage with a maximum depth of ${analytics.treeMetrics?.maxDepth ?? 0}.` : 'The chart compares how fast coverage grows against how deep the recursion goes.' },
        { name: 'Branching activity', description: 'Highlights where the search tree expands the most.', how: 'The backend derives branching data from the recursive call tree.', example: analytics ? `The current ${algorithmDescriptor} tree shows an average branching factor of ${analytics.treeMetrics?.avgBranching ?? 0}.` : 'Branching activity spikes when the search splits into many alternatives.' },
      ],
    },
    analyticsCharts: {
      title: 'Analytics charts',
      intro: 'Detailed explanations for each individual chart in the visual analytics section.',
      items: [
        { name: 'Recursive calls evolution', description: 'Line chart showing the cumulative growth of recursive calls over time.', axes: 'X-axis: execution step | Y-axis: cumulative calls', what: 'Displays the total number of function calls accumulated as the algorithm progresses through the search space.', learn: `This chart helps identify ${patternType === 'highly-flexible' ? 'rapid growth spikes that indicate exponential branching' : patternType === 'flexible' ? 'accelerating call patterns' : 'linear or polynomial growth'} in the execution. A steep curve indicates the algorithm is exploring many branches, while a flat or slow-growing curve suggests constrained branching. For your ${algorithmDescriptor}, watch how the curve behaves when new states are discovered versus when the algorithm revisits known states.` },
        { name: 'Unique states discovery', description: 'Line chart showing the number of newly discovered unique states over execution steps.', axes: 'X-axis: execution step | Y-axis: count of unique states discovered', what: 'Tracks how many distinct (i, j) states the algorithm has encountered up to each step. Once this curve flattens, the algorithm has begun revisiting already-explored states.', learn: `Compare this curve to the calls curve: when calls grow much faster than unique states, the algorithm is doing redundant work. For your ${patternDescription} pattern with ${patternType === 'highly-flexible' ? 'many wildcards' : 'few wildcards'}, the discovery curve should ${patternType === 'highly-flexible' ? 'eventually plateau as the search space is exhausted' : 'reach its plateau relatively quickly'}.` },
        { name: 'Memoization efficiency', description: 'Line chart (memo only) showing the cumulative memo hits during execution.', axes: 'X-axis: execution step | Y-axis: cumulative memo hits', what: 'Shows how many times the ${algorithmDescriptor} successfully reused a previously cached state. Early steps may show slow growth (misses are common), accelerating once repeated states are encountered.', learn: `This chart is only visible for the memoization algorithm. A steep curve rising early indicates the cache becomes effective quickly. For your ${patternDescription} pattern, the curve ${analytics?.hitRate && parseFloat(analytics.hitRate) > 0.7 ? 'shows strong early caching benefit' : 'shows gradual cache effectiveness'}.` },
        { name: 'State coverage', description: 'Area chart showing the cumulative coverage percentage of the total state space.', axes: 'X-axis: execution step | Y-axis: coverage percentage (0-100%)', what: 'Represents how much of the total possible (i, j) state space has been visited. Coverage is calculated as visited states divided by the maximum possible (m+1)×(n+1) positions.', learn: `For your inputs with string length ${text.length} and pattern length ${patternLength}, the maximum possible states is ${(text.length + 1) * (patternLength + 1)}. Your current execution reached ${formatPercent(analytics.coverage)} coverage, visiting ${analytics.uniqueStates} of those positions. Early plateaus suggest the algorithm found a solution before fully exploring the space.` },
        { name: 'Recursion depth', description: 'Line chart tracking the current recursion depth through execution, with a horizontal line showing the maximum depth reached.', axes: 'X-axis: execution step | Y-axis: recursion depth', what: 'Shows how deep the call stack goes at each step. The chart displays both the current depth (oscillating line as the algorithm backtracks) and a horizontal reference line marking the maximum depth ever reached.', learn: `For your ${algorithmDescriptor} execution, the maximum recursion depth was ${analytics.treeMetrics?.maxDepth ?? 0}. The oscillations show when the algorithm backtracks and tries alternative branches. A jagged pattern indicates frequent backtracking; a smooth climb indicates more linear exploration.` },
        { name: 'Branching activity', description: 'Bar chart showing how many children (branches) were generated at each recursion level.', axes: 'X-axis: recursion level | Y-axis: number of children generated', what: 'Illustrates where the recursive tree expands most. Each bar represents one level of the recursion tree, showing how many branches were created at that depth.', learn: `For your ${patternDescription} pattern, branching typically concentrates around level ${analytics.treeMetrics?.maxDepth ? Math.round(analytics.treeMetrics.maxDepth / 2) : '?'} where the search has the most choices. High bars indicate "branching explosion" points where the search space expands combinatorially.` },
        { name: 'Calls vs unique states', description: 'Dual-series line chart comparing total calls (blue) against unique states discovered (green).', axes: 'X-axis: execution step | Y-axis: count', what: 'Visualizes redundancy: when the calls line significantly above the unique states line, the algorithm is revisiting states. The gap between lines directly represents repeated state visits.', learn: `For your ${algorithmDescriptor} run, if the gap is small, exploration is efficient. If the gap widens over time, redundancy increases, especially visible when ${algorithm === 'memo' ? 'the memoization becomes effective' : 'backtracking explores the same branches repeatedly'}.` },
        { name: 'Calls vs memo hits', description: 'Dual-series line chart (memo only) comparing total calls against cumulative memo hits.', axes: 'X-axis: execution step | Y-axis: count', what: 'Shows the moment when memoization begins to provide value. Early steps show calls growing much faster than memo hits (mostly misses); later steps show hits accelerating as repeated states are queried.', learn: `The inflection point where the memo-hits curve accelerates indicates when the cache becomes effective. For your ${patternDescription} pattern with memo, this typically occurs after discovering ${Math.round(analytics.uniqueStates * 0.3)} to ${Math.round(analytics.uniqueStates * 0.6)} unique states.` },
        { name: 'Algorithm comparison', description: 'Bar chart comparing metrics across backtracking, memoization, and bottom-up algorithms on the same input.', axes: 'X-axis: algorithm | Y-axis: metric value (selected by dropdown)', what: 'Allows side-by-side comparison of any metric (calls, steps, unique states, max depth) across all available algorithms. Switch metrics using the dropdown selector above the chart.', learn: `This chart directly shows which algorithm is most efficient for your input. For your ${patternDescription} pattern, you can select different metrics to see: calls shows memoization impact, steps shows true computation cost, and depth shows search complexity. Usually memoization performs best when redundancy is high.` },
        { name: 'Analytics radar', description: 'Radar chart (6-axis) comparing all major metrics across algorithms in a single view.', axes: 'Radial axes: Calls, Steps, Redundancy, Coverage (%), Memory (reuse), Efficiency (%)', what: 'Provides a holistic view of algorithm behavior. Each algorithm appears as a polygon; larger polygons indicate higher values. All metrics are normalized to 0-100% for fair visual comparison.', learn: `For your ${patternDescription} pattern, look at the shape of each polygon: a balanced polygon (memoization) suggests good performance across metrics, while an unbalanced polygon (backtracking) shows efficiency concentrated in one metric. The radar quickly reveals which algorithm dominates in specific dimensions.` },
      ],
    },
    recursiveCallsEvolution: {
      title: 'Recursive calls evolution',
      intro: 'Line chart showing the cumulative growth of recursive calls over time.',
      items: [{ name: 'Recursive calls evolution', description: 'Line chart showing the cumulative growth of recursive calls over time.', axes: 'X-axis: execution step | Y-axis: cumulative calls', what: 'Displays the total number of function calls accumulated as the algorithm progresses through the search space.', learn: `This chart helps identify ${patternType === 'highly-flexible' ? 'rapid growth spikes that indicate exponential branching' : patternType === 'flexible' ? 'accelerating call patterns' : 'linear or polynomial growth'} in the execution. A steep curve indicates the algorithm is exploring many branches, while a flat or slow-growing curve suggests constrained branching. For your ${algorithmDescriptor}, watch how the curve behaves when new states are discovered versus when the algorithm revisits known states.` }],
    },
    uniqueStatesDiscovery: {
      title: 'Unique states discovery',
      intro: 'Line chart showing the number of newly discovered unique states over execution steps.',
      items: [{ name: 'Unique states discovery', description: 'Line chart showing the number of newly discovered unique states over execution steps.', axes: 'X-axis: execution step | Y-axis: count of unique states discovered', what: 'Tracks how many distinct (i, j) states the algorithm has encountered up to each step. Once this curve flattens, the algorithm has begun revisiting already-explored states.', learn: `Compare this curve to the calls curve: when calls grow much faster than unique states, the algorithm is doing redundant work. For your ${patternDescription} pattern with ${patternType === 'highly-flexible' ? 'many wildcards' : 'few wildcards'}, the discovery curve should ${patternType === 'highly-flexible' ? 'eventually plateau as the search space is exhausted' : 'reach its plateau relatively quickly'}.` }],
    },
    memoizationEfficiency: {
      title: 'Memoization efficiency',
      intro: 'Line chart (memo only) showing the cumulative memo hits during execution.',
      items: [{ name: 'Memoization efficiency', description: 'Line chart (memo only) showing the cumulative memo hits during execution.', axes: 'X-axis: execution step | Y-axis: cumulative memo hits', what: 'Shows how many times the algorithm successfully reused a previously cached state. Early steps may show slow growth (misses are common), accelerating once repeated states are encountered.', learn: `This chart is only visible for the memoization algorithm. A steep curve rising early indicates the cache becomes effective quickly. For your ${patternDescription} pattern, the curve ${analytics?.hitRate && parseFloat(analytics.hitRate) > 0.7 ? 'shows strong early caching benefit' : 'shows gradual cache effectiveness'}.` }],
    },
    stateCoverage: {
      title: 'State coverage',
      intro: 'Area chart showing the cumulative coverage percentage of the total state space.',
      items: [{ name: 'State coverage', description: 'Area chart showing the cumulative coverage percentage of the total state space.', axes: 'X-axis: execution step | Y-axis: coverage percentage (0-100%)', what: 'Represents how much of the total possible (i, j) state space has been visited. Coverage is calculated as visited states divided by the maximum possible (m+1)×(n+1) positions.', learn: `For your inputs with string length ${text.length} and pattern length ${patternLength}, the maximum possible states is ${(text.length + 1) * (patternLength + 1)}. Your current execution reached ${formatPercent(analytics.coverage)} coverage, visiting ${analytics.uniqueStates} of those positions. Early plateaus suggest the algorithm found a solution before fully exploring the space.` }],
    },
    recursionDepth: {
      title: 'Recursion depth',
      intro: 'Line chart tracking the current recursion depth through execution, with a horizontal line showing the maximum depth reached.',
      items: [{ name: 'Recursion depth', description: 'Line chart tracking the current recursion depth through execution, with a horizontal line showing the maximum depth reached.', axes: 'X-axis: execution step | Y-axis: recursion depth', what: 'Shows how deep the call stack goes at each step. The chart displays both the current depth (oscillating line as the algorithm backtracks) and a horizontal reference line marking the maximum depth ever reached.', learn: `For your ${algorithmDescriptor} execution, the maximum recursion depth was ${analytics.treeMetrics?.maxDepth ?? 0}. The oscillations show when the algorithm backtracks and tries alternative branches. A jagged pattern indicates frequent backtracking; a smooth climb indicates more linear exploration.` }],
    },
    branchingActivity: {
      title: 'Branching activity',
      intro: 'Bar chart showing how many children (branches) were generated at each recursion level.',
      items: [{ name: 'Branching activity', description: 'Bar chart showing how many children (branches) were generated at each recursion level.', axes: 'X-axis: recursion level | Y-axis: number of children generated', what: 'Illustrates where the recursive tree expands most. Each bar represents one level of the recursion tree, showing how many branches were created at that depth.', learn: `For your ${patternDescription} pattern, branching typically concentrates around level ${analytics.treeMetrics?.maxDepth ? Math.round(analytics.treeMetrics.maxDepth / 2) : '?'} where the search has the most choices. High bars indicate "branching explosion" points where the search space expands combinatorially.` }],
    },
    callsVsUniqueStates: {
      title: 'Calls vs unique states',
      intro: 'Dual-series line chart comparing total calls against unique states discovered.',
      items: [{ name: 'Calls vs unique states', description: 'Dual-series line chart comparing total calls (blue) against unique states discovered (green).', axes: 'X-axis: execution step | Y-axis: count', what: 'Visualizes redundancy: when the calls line is significantly above the unique states line, the algorithm is revisiting states. The gap between lines directly represents repeated state visits.', learn: `For your ${algorithmDescriptor} run, if the gap is small, exploration is efficient. If the gap widens over time, redundancy increases, especially visible when ${algorithm === 'memo' ? 'the memoization becomes effective' : 'backtracking explores the same branches repeatedly'}.` }],
    },
    callsVsMemoHits: {
      title: 'Calls vs memo hits',
      intro: 'Dual-series line chart (memo only) comparing total calls against cumulative memo hits.',
      items: [{ name: 'Calls vs memo hits', description: 'Dual-series line chart (memo only) comparing total calls against cumulative memo hits.', axes: 'X-axis: execution step | Y-axis: count', what: 'Shows the moment when memoization begins to provide value. Early steps show calls growing much faster than memo hits (mostly misses); later steps show hits accelerating as repeated states are queried.', learn: `The inflection point where the memo-hits curve accelerates indicates when the cache becomes effective. For your ${patternDescription} pattern with memo, this typically occurs after discovering ${Math.round(analytics.uniqueStates * 0.3)} to ${Math.round(analytics.uniqueStates * 0.6)} unique states.` }],
    },
    algorithmComparison: {
      title: 'Algorithm comparison',
      intro: 'Bar chart comparing metrics across backtracking, memoization, and bottom-up algorithms on the same input.',
      items: [{ name: 'Algorithm comparison', description: 'Bar chart comparing metrics across backtracking, memoization, and bottom-up algorithms on the same input.', axes: 'X-axis: algorithm | Y-axis: metric value (selected by dropdown)', what: 'Allows side-by-side comparison of any metric (calls, steps, unique states, max depth) across all available algorithms. Switch metrics using the dropdown selector above the chart.', learn: `This chart directly shows which algorithm is most efficient for your input. For your ${patternDescription} pattern, you can select different metrics to see: calls shows memoization impact, steps shows true computation cost, and depth shows search complexity. Usually memoization performs best when redundancy is high.` }],
    },
    analyticsRadar: {
      title: 'Analytics radar',
      intro: 'Radar chart (6-axis) comparing all major metrics across algorithms in a single view.',
      items: [{ name: 'Analytics radar', description: 'Radar chart (6-axis) comparing all major metrics across algorithms in a single view.', axes: 'Radial axes: Calls (lower is better), Steps (lower is better), Redundancy (lower is better), Coverage (higher is better), Memory reuse (higher is better), Efficiency (higher is better)', what: 'Provides a holistic view of algorithm behavior. Each algorithm appears as a polygon; larger polygons indicate higher values. All metrics are normalized to 0-100% for fair visual comparison.', learn: `For your ${patternDescription} pattern, look at the shape of each polygon: a balanced polygon (memoization) suggests good performance across metrics, while an unbalanced polygon (backtracking) shows efficiency concentrated in one metric. The radar quickly reveals which algorithm dominates in specific dimensions. Higher values are better for coverage, memory reuse, and efficiency; lower values are better for calls, steps, and redundancy.` }],
    },
    cacheUtilization: {
      title: 'Cache utilization',
      intro: 'Area chart showing the cumulative stored states compared to the theoretical capacity.',
      items: [{ name: 'Cache utilization', description: 'Area chart showing the cumulative stored states compared to the theoretical capacity.', axes: 'X-axis: execution step | Y-axis: stored states / capacity', what: 'Shows whether the memo table is filling up as the run progresses and whether it stays within the expected capacity.', learn: `For your ${patternDescription} pattern, the chart helps see whether the cache grows steadily or whether it reaches a plateau early. A line that remains below capacity suggests the algorithm uses only a small portion of the memo table.` }],
    },
    patternDifficultyBreakdown: {
      title: 'Pattern difficulty breakdown',
      intro: 'Bar chart breaking down the structural factors that make the pattern harder to solve.',
      items: [{ name: 'Pattern difficulty breakdown', description: 'Bar chart breaking down the structural factors that make the pattern harder to solve.', axes: 'X-axis: pattern feature | Y-axis: contribution count', what: 'Shows how much each pattern feature contributes to the estimated difficulty score.', learn: `Use this chart to explain why your ${patternDescription} pattern behaves the way it does. More stars and dots usually increase branching and backtracking pressure.` }],
    },
  };
};

function MetricHelpModal({ section, onClose, analytics, input, algorithm, comparison }) {
  const content = buildMetricHelpContent({ analytics, input, algorithm, comparison })[section];
  if (!content) return null;

  return (
    <div className="metric-help-backdrop" onClick={onClose}>
      <div className="metric-help-modal" onClick={(event) => event.stopPropagation()}>
        <div className="metric-help-header">
          <h3>{content.title}</h3>
          <button type="button" onClick={onClose} className="metric-help-close">×</button>
        </div>
        <p>{content.intro}</p>
        <ul className="metric-help-list">
          {content.items.map((item) => (
            <li key={item.name} className="metric-help-item">
              <strong>{item.name}</strong>
              <p>{item.description}</p>
              {item.axes && <span><strong>Axes:</strong> {item.axes}</span>}
              {item.what && <span><strong>What it shows:</strong> {item.what}</span>}
              {item.how && <span>How it is obtained: {item.how}</span>}
              {item.learn && <div className="metric-help-example"><strong>What you'll learn:</strong> {item.learn}</div>}
              {item.example && <div className="metric-help-example"><strong>Example:</strong> {item.example}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const getAlgorithmLimits = (algorithm) => {
  switch (algorithm) {
    case 'bottomup':
      return {
        title: 'Bottom-up',
        maxStringLength: 120,
        maxPatternLength: 80,
        maxEvents: 300,
        maxStates: 5000,
        maxDepth: 80,
      };
    case 'backtracking':
      return {
        title: 'Backtracking',
        maxStringLength: 120,
        maxPatternLength: 80,
        maxEvents: 300,
        maxStates: 5000,
        maxDepth: 80,
      };
    case 'memo':
    default:
      return {
        title: 'Memoized backtracking',
        maxStringLength: 120,
        maxPatternLength: 80,
        maxEvents: 300,
        maxStates: 5000,
        maxDepth: 80,
      };
  }
};

const getSseRecommendation = ({ s, p, algorithm }) => {
  const limits = getAlgorithmLimits(algorithm);
  const stringLength = String(s ?? '').length;
  const patternLength = String(p ?? '').length;
  const patternText = String(p ?? '');
  const patternComplexity = (patternText.match(/[*+?{}()[\]|.]/g) ?? []).length;
  const complexityScore = stringLength + patternLength * 1.2 + patternComplexity * 3;
  const normalizedScore = complexityScore / (limits.maxStringLength + limits.maxPatternLength * 1.2 + 20);
  const threshold = algorithm === 'bottomup' ? 0.72 : algorithm === 'backtracking' ? 0.6 : 0.65;

  const shouldRecommendSse = normalizedScore >= threshold
    || (stringLength >= Math.max(24, Math.floor(limits.maxStringLength * 0.55)) && patternLength >= Math.max(18, Math.floor(limits.maxPatternLength * 0.4)))
    || stringLength >= Math.max(26, Math.floor(limits.maxStringLength * 0.8))
    || patternLength >= Math.max(24, Math.floor(limits.maxPatternLength * 0.8));

  if (!shouldRecommendSse) {
    return null;
  }

  return {
    title: 'Streaming mode recommended',
    message: `This input looks large for ${limits.title.toLowerCase()}, and streaming mode is the better fit for tracking progress while the backend evaluates it.`,
  };
};

const buildLimitMessage = ({ algorithm, details = {} }) => {
  const limits = getAlgorithmLimits(algorithm);
  const reasonText = details.reason === 'length'
    ? `the input size is larger than the supported range for ${limits.title.toLowerCase()}`
    : details.reason === 'budget'
      ? `the execution grows beyond the safe limits for ${limits.title.toLowerCase()}`
      : details.reason === 'call-tree'
        ? `the recursive exploration becomes too large for ${limits.title.toLowerCase()}`
        : details.reason === 'dp-cells'
          ? `the dynamic programming table grows beyond the supported scope for ${limits.title.toLowerCase()}`
          : `the request exceeds the supported bounds for ${limits.title.toLowerCase()}`;

  const budgetHint = details.reason === 'budget'
    ? 'This usually happens when the pattern uses many repeated operators such as stars, dots, or alternations, which make the search space expand quickly.'
    : '';

  const parts = [
    `The execution was stopped because ${reasonText}.`,
    `For ${limits.title}, the recommended maximum values are: string length up to ${limits.maxStringLength}, pattern length up to ${limits.maxPatternLength}, depth up to ${limits.maxDepth}, and roughly ${limits.maxStates} states or ${limits.maxEvents} events per run.`,
    budgetHint,
    'Try simplifying the input, shortening the pattern, or choosing a less exploratory algorithm for this case.',
  ].filter(Boolean);

  return parts.join(' ');
};

export default function App() {
  const [s, setS] = useState('aa');
  const [p, setP] = useState('a*');
  const [algorithm, setAlgorithm] = useState('memo');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comparison, setComparison] = useState([]);
  const useStream = false;
  const [streamStatus, setStreamStatus] = useState('idle');
  const [progressMessage, setProgressMessage] = useState('');
  const [limitModal, setLimitModal] = useState(null);
  const [pendingSsePrompt, setPendingSsePrompt] = useState(null);
  const [helpModal, setHelpModal] = useState(null);
  const eventSourceRef = useRef(null);

  const timeline = useMemo(() => result?.events ?? [], [result]);
  const maxTimelineStep = useMemo(() => timeline.reduce((max, event) => Math.max(max, event?.step ?? 0), 0), [timeline]);
  const totalSteps = useMemo(() => Math.max(result?.metrics?.steps ?? 0, maxTimelineStep), [result?.metrics?.steps, maxTimelineStep]);
  const visibleEvents = useMemo(() => {
    if (!timeline.length) {
      return [];
    }

    const targetStep = Math.max(0, currentStep);
    const matchingEvents = timeline.filter((event) => (event?.step ?? 0) <= targetStep);
    if (matchingEvents.length) {
      return matchingEvents;
    }

    if (timeline.length) {
      return timeline.slice(-Math.min(10, timeline.length));
    }

    return [];
  }, [timeline, currentStep]);
  const selectedCell = useMemo(() => {
    const state = selectedEvent?.state;
    if (typeof state?.i === 'number' && typeof state?.j === 'number') {
      return `${state.i},${state.j}`;
    }
    return null;
  }, [selectedEvent]);

  const analytics = useMemo(() => {
    if (!result) return null;

    const stateCounts = getStateCounts(result.events);
    const uniqueStates = stateCounts.size;
    const totalStateVisits = Array.from(stateCounts.values()).reduce((sum, value) => sum + value, 0);
    const repeatedVisits = Math.max(0, totalStateVisits - uniqueStates);
    const repeatedRatio = totalStateVisits ? repeatedVisits / totalStateVisits : 0;
    const sLength = result.input?.s?.length ?? s.length;
    const pLength = result.input?.p?.length ?? p.length;
    const possibleStates = (sLength + 1) * (pLength + 1);
    const coverage = possibleStates ? uniqueStates / possibleStates : 0;
    const treeMetrics = getCallTreeMetrics(result.callTree);
    const calls = result.metrics?.calls ?? 0;
    const memoHits = result.metrics?.memoHits ?? 0;
    const memoMisses = result.metrics?.memoMisses ?? 0;
    const hitRate = result.metrics?.hitRate ?? 0;
    const resolvedStates = result.metrics?.resolvedStates ?? 0;
    const reusePercentage = result.metrics?.reusePercentage ?? 0;
    const cacheUtilization = result.metrics?.cacheUtilization ?? (possibleStates ? uniqueStates / possibleStates : 0);
    const reuseFactor = result.metrics?.reuseFactor ?? (uniqueStates ? Number((totalStateVisits / uniqueStates).toFixed(2)) : 0);
    const pattern = result.input?.p ?? p;
    const starCount = (pattern.match(/\*/g) || []).length;
    const dotCount = (pattern.match(/\./g) || []).length;

    const tracesByAlgorithm = new Map((comparison || []).map((trace) => [trace.algorithm, trace]));
    const backtracking = tracesByAlgorithm.get('backtracking');
    const memoTrace = tracesByAlgorithm.get('memo');
    const bottomup = tracesByAlgorithm.get('bottomup');

    const comparisonMetrics = {
      speedupMemo: null,
      callsAvoided: null,
      callsReduction: null,
      winnerCalls: null,
      winnerSteps: null,
    };

    if (backtracking && memoTrace) {
      const backCalls = backtracking.metrics?.calls ?? 0;
      const memoCalls = memoTrace.metrics?.calls ?? 0;
      comparisonMetrics.speedupMemo = memoCalls ? Number((backCalls / memoCalls).toFixed(2)) : null;
      comparisonMetrics.callsAvoided = Math.max(0, backCalls - memoCalls);
      comparisonMetrics.callsReduction = backCalls ? (backCalls - memoCalls) / backCalls : 0;
    }

    const rankedBy = (metric) => {
      const candidates = [backtracking, memoTrace, bottomup].filter(Boolean).sort(
        (a, b) => (a.metrics?.[metric] ?? Number.POSITIVE_INFINITY) - (b.metrics?.[metric] ?? Number.POSITIVE_INFINITY),
      );
      return candidates[0]?.algorithm ?? null;
    };

    comparisonMetrics.winnerCalls = rankedBy('calls');
    comparisonMetrics.winnerSteps = rankedBy('steps');

    return {
      uniqueStates,
      totalStateVisits,
      repeatedVisits,
      repeatedRatio,
      coverage,
      possibleStates,
      treeMetrics,
      memoHits,
      memoMisses,
      hitRate,
      resolvedStates,
      reusePercentage,
      cacheUtilization,
      reuseFactor,
      problemMetrics: {
        starCount,
        dotCount,
        patternLength: pattern.length,
        starDensity: pattern.length ? starCount / pattern.length : 0,
        dotDensity: pattern.length ? dotCount / pattern.length : 0,
        difficultyScore: pattern.length
          ? Number(
              Math.min(1, (starCount * 1.8 + dotCount * 1.2 + pattern.length * 0.4) / (pattern.length * 2 + 1)).toFixed(2),
            )
          : 0,
      },
      comparisonMetrics,
    };
  }, [result, comparison, p, s]);

  const findEventByState = (state) => {
    if (!state || typeof state.i !== 'number' || typeof state.j !== 'number') {
      return null;
    }
    return timeline.find((event) => event.state?.i === state.i && event.state?.j === state.j) ?? null;
  };

  const handleSelectState = (state) => {
    const match = findEventByState(state);
    if (!match) return;
    setSelectedEvent(match);
    setCurrentStep(Math.max(1, match.step ?? 1));
  };

  useEffect(() => {
    if (!isPlaying || !timeline.length) {
      return undefined;
    }

    if (currentStep >= totalSteps) {
      setIsPlaying(false);
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setCurrentStep((value) => {
        const nextValue = value + 1;
        if (nextValue >= totalSteps) {
          setIsPlaying(false);
          return totalSteps;
        }
        return nextValue;
      });
    }, 350);

    return () => window.clearInterval(timerId);
  }, [currentStep, isPlaying, totalSteps]);

  const startExecution = async ({ forceSse = false }) => {
    setLoading(true);
    setError('');
    setLimitModal(null);
    setPendingSsePrompt(null);
    setStreamStatus('idle');
    setProgressMessage('');

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const shouldUseSse = forceSse || useStream;

    if (shouldUseSse) {
      return new Promise((resolve) => {
        const params = new URLSearchParams({ s, p, algorithm });
        const source = new EventSource(`${buildApiPath('/api/run-stream')}?${params.toString()}`);
        eventSourceRef.current = source;
        const incrementalEvents = [];
        let runningResult = {
          algorithm,
          input: { s, p },
          events: [],
          callTree: [],
          stateGraph: [],
          metrics: null,
          finalAnswer: null,
        };
        let settled = false;

        const finishStream = ({ error = null, details = null } = {}) => {
          if (settled) {
            return;
          }
          settled = true;
          setLoading(false);
          setStreamStatus('error');
          if (error) {
            setError(String(error));
          }
          if (details) {
            setLimitModal({
              title: 'Execution stopped for size limits',
              message: buildLimitMessage({ algorithm, details }),
            });
          }
          source.close();
          eventSourceRef.current = null;
          resolve();
        };

        setStreamStatus('connecting');

        source.onopen = () => {
          setStreamStatus('streaming');
          setProgressMessage('Streaming trace events...');
        };

        source.onerror = () => {
          finishStream({
            error: 'The streaming connection was interrupted before the trace could be completed.',
          });
        };

        source.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'EVENT') {
              incrementalEvents.push(payload.event);
              runningResult = {
                ...runningResult,
                events: [...incrementalEvents],
              };
              setResult(runningResult);
              setSelectedEvent(incrementalEvents[0] ?? null);
              setCurrentStep(Math.max(1, incrementalEvents.at(-1)?.step ?? 1));
              setProgressMessage(`Received ${incrementalEvents.length} events`);
            }
            if (payload.type === 'SNAPSHOT') {
              runningResult = {
                ...runningResult,
                ...payload.snapshot,
                metrics: payload.snapshot?.metrics ?? runningResult.metrics,
                finalAnswer: payload.snapshot?.finalAnswer ?? runningResult.finalAnswer,
              };
              setResult(runningResult);
              setSelectedEvent(runningResult.events?.[0] ?? null);
              setCurrentStep(Math.max(1, runningResult.events?.at(-1)?.step ?? 1));
              setProgressMessage(`Received ${runningResult.events?.length ?? 0} events`);
            }
            if (payload.type === 'SUMMARY') {
              runningResult = {
                ...runningResult,
                ...(payload.snapshot ?? {}),
                metrics: payload.snapshot?.metrics ?? runningResult.metrics,
                finalAnswer: payload.snapshot?.finalAnswer ?? runningResult.finalAnswer,
              };
              setResult(runningResult);
            }
            if (payload.type === 'COMPLETE') {
              setStreamStatus('complete');
              setProgressMessage('Trace complete.');
              if (!settled) {
                settled = true;
                setLoading(false);
                source.close();
                eventSourceRef.current = null;
                resolve();
              }
            }
            if (payload.type === 'ERROR') {
              const parsedError = payload.error ? String(payload.error) : 'The backend stopped the execution.';
              const parsedDetails = payload.details ?? null;
              finishStream({ error: parsedError, details: parsedDetails });
            }
          } catch (parseError) {
            console.error('Failed to parse SSE payload', parseError);
          }
        };
      });
    }

    try {
      const data = await postJson('/api/run', { s, p, algorithm });
      setResult(data);
      setSelectedEvent(data.events?.[0] ?? null);
      setCurrentStep(Math.max(1, Math.min(10, data.metrics?.steps ?? data.events?.at(-1)?.step ?? 1)));
      setIsPlaying(false);

      const traces = await Promise.all([
        postJson('/api/run', { s, p, algorithm: 'backtracking' }),
        postJson('/api/run', { s, p, algorithm: 'memo' }),
        postJson('/api/run', { s, p, algorithm: 'bottomup' }),
      ]);

      setComparison(traces);
    } catch (err) {
      setError(err.message);
      if (err?.details) {
        setLimitModal({
          title: 'Execution stopped for size limits',
          message: buildLimitMessage({ algorithm, details: err.details }),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  async function handleSubmit(event) {
    event.preventDefault();

    const sseRecommendation = getSseRecommendation({ s, p, algorithm });
    if (sseRecommendation && !useStream && !eventSourceRef.current) {
      setPendingSsePrompt(sseRecommendation);
      return;
    }

    await startExecution({ forceSse: false });
  }

  async function handleAcceptSseRecommendation() {
    await startExecution({ forceSse: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-branding">
          <span className="brand-name">Alpha</span>
        </div>
        <div className="header-branding">
          <span className="brand-name">Programación Avanzada 1C2026</span>
        </div>
        <img className="header-logo" src="/images/logos.png" alt="Alpha logo" />
      </header>

      <div>
        <h1>Regex Matching Visualizer</h1>
        <p>Send a string, a pattern and an algorithm to inspect the execution trace.</p>
      </div>

      <form onSubmit={handleSubmit} className="panel">
        <label>
          String
          <input value={s} onChange={(e) => setS(e.target.value)} />
        </label>
        <label>
          Pattern
          <input value={p} onChange={(e) => setP(e.target.value)} />
        </label>
        <label>
          Algorithm
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
            <option value="backtracking">Backtracking w/o Memoization</option>
            <option value="memo">Backtracking w/ Memoization</option>
            <option value="bottomup">Bottom-Up</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Running…' : 'Run trace'}
        </button>
      </form>

      {error ? <div className="error">{error}</div> : null}

      {limitModal ? (
        <div className="limit-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setLimitModal(null)}>
          <div className="limit-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{limitModal.title}</h3>
            <p>{limitModal.message}</p>
            <button type="button" onClick={() => setLimitModal(null)}>Close</button>
          </div>
        </div>
      ) : null}

      {pendingSsePrompt ? (
        <div className="limit-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setPendingSsePrompt(null)}>
          <div className="limit-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{pendingSsePrompt.title}</h3>
            <p>{pendingSsePrompt.message}</p>
            <div className="limit-modal-actions">
              <button type="button" onClick={() => setPendingSsePrompt(null)}>Cancel</button>
              <button type="button" onClick={handleAcceptSseRecommendation}>Accept</button>
            </div>
          </div>
        </div>
      ) : null}

      {result ? (
        <>
          <section className="panel pseudocode-panel">
            <h2>Algorithm reference</h2>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{pseudocodeByAlgorithm[result.algorithm] ?? ''}</ReactMarkdown>
            </div>
          </section>

          <section className="panel results">
            <h2>Trace result</h2>
            <div className="summary-grid">
              <div><strong>Final answer:</strong> {String(result.finalAnswer)}</div>
              <div><strong>Algorithm:</strong> {result.algorithm}</div>
              <div><strong>Calls:</strong> {result.metrics?.calls}</div>
              <div><strong>Memo hits:</strong> {result.metrics?.memoHits}</div>
              <div><strong>Resolved states:</strong> {result.metrics?.resolvedStates}</div>
              <div><strong>Reuse percentage:</strong> {formatPercent(result.metrics?.reusePercentage ?? 0)}</div>
              <div><strong>Steps:</strong> {result.metrics?.steps}</div>
              <div><strong>State graph:</strong> {result.stateGraph?.length}</div>
            </div>

            <ComparisonView traces={comparison} />

            <div className="content-grid">
              <div className="timeline-panel">
                <div className="toolbar-row">
                  <h3>Timeline</h3>
                  <div className="toolbar-controls">
                    <button type="button" onClick={() => setCurrentStep((value) => Math.max(1, value - 1))}>Back</button>
                    <button type="button" onClick={() => setCurrentStep((value) => Math.min(timeline.length, value + 1))}>Step</button>
                    <button type="button" onClick={() => setIsPlaying((value) => !value)}>{isPlaying ? 'Pause' : 'Play'}</button>
                    <button type="button" onClick={() => { setIsPlaying(false); setCurrentStep(0); }}>Restart</button>
                  </div>
                </div>
                <p className="step-indicator">Showing {visibleEvents.length} event(s) up to step {Math.max(0, currentStep)} of {Math.max(totalSteps, 1)} steps</p>
                <div className="timeline-scroll">
                  <ul className="timeline-list">
                    {visibleEvents.map((event) => (
                      <li key={event.id} onClick={() => setSelectedEvent(event)} className={selectedEvent?.id === event.id ? 'selected' : ''}>
                        <span className="event-badge">{event.type}</span>
                        <span>step {event.step}</span>
                        <span>state ({event.state?.i}, {event.state?.j})</span>
                        <span>{event.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="side-panel">
                <div className="visualizer-scroll">
                  {result.algorithm === 'bottomup' ? (
                    <DpTable dp={result.dp} dependencies={result.dependencies} order={result.order} selectedCell={selectedCell} onSelectState={handleSelectState} s={s} p={p} />
                  ) : (
                    <TreeView events={timeline} callTree={result.callTree} activeStateKey={selectedCell} onSelectState={handleSelectState} />
                  )}
                </div>
                <div className="inspector-card">
                  <h3>Inspector</h3>
                  {selectedEvent ? (
                    <>
                      <p><strong>Type:</strong> {selectedEvent.type}</p>
                      <p><strong>State:</strong> ({selectedEvent.state?.i}, {selectedEvent.state?.j})</p>
                      <p><strong>Description:</strong> {selectedEvent.description}</p>
                      <p><strong>Variables:</strong> {JSON.stringify(selectedEvent.variables)}</p>
                    </>
                  ) : (
                    <p>Select an event from the timeline.</p>
                  )}
                </div>
              </div>
            </div>

            <section className="panel analytics-panel">
              <h2>Algorithm Analytics</h2>
              {analytics ? (
                <>
                  <div className="analytics-grid">
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h3>State exploration</h3>
                        <button type="button" className="metric-help-trigger" onClick={() => setHelpModal('stateExploration')}>Help</button>
                      </div>
                      <p><strong>Unique states:</strong> {analytics.uniqueStates}</p>
                      <p><strong>Repeated visits:</strong> {analytics.repeatedVisits}</p>
                      <p><strong>Repeated ratio:</strong> {formatPercent(analytics.repeatedRatio)}</p>
                      <p><strong>Coverage:</strong> {analytics.uniqueStates} / {analytics.possibleStates} ({formatPercent(analytics.coverage)})</p>
                    </div>

                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h3>Recursion tree</h3>
                        <button type="button" className="metric-help-trigger" onClick={() => setHelpModal('recursionTree')}>Help</button>
                      </div>
                      <p><strong>Max depth:</strong> {analytics.treeMetrics.maxDepth}</p>
                      <p><strong>Avg depth:</strong> {analytics.treeMetrics.avgDepth}</p>
                      <p><strong>Avg branching:</strong> {analytics.treeMetrics.avgBranching}</p>
                      <p><strong>Leaf nodes:</strong> {analytics.treeMetrics.leaves}</p>
                      <p><strong>Critical path:</strong> {analytics.treeMetrics.criticalPathLength} states</p>
                    </div>

                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h3>Problem profile</h3>
                        <button type="button" className="metric-help-trigger" onClick={() => setHelpModal('problemProfile')}>Help</button>
                      </div>
                      <p><strong>Pattern length:</strong> {analytics.problemMetrics.patternLength}</p>
                      <p><strong>Star density:</strong> {formatPercent(analytics.problemMetrics.starDensity)}</p>
                      <p><strong>Dot density:</strong> {formatPercent(analytics.problemMetrics.dotDensity)}</p>
                      <p><strong>Difficulty score:</strong> {analytics.problemMetrics.difficultyScore}</p>
                    </div>

                    {result.algorithm === 'memo' ? (
                      <div className="metric-card">
                        <div className="metric-card-header">
                          <h3>Memoization</h3>
                          <button type="button" className="metric-help-trigger" onClick={() => setHelpModal('memoization')}>Help</button>
                        </div>
                        <p><strong>Hits:</strong> {analytics.memoHits}</p>
                        <p><strong>Misses:</strong> {analytics.memoMisses}</p>
                        <p><strong>Resolved states:</strong> {analytics.resolvedStates}</p>
                        <p><strong>Reuse percentage:</strong> {formatPercent(analytics.reusePercentage)}</p>
                        <p><strong>Hit rate:</strong> {formatPercent(analytics.hitRate)}</p>
                        <p><strong>Cache utilization:</strong> {formatPercent(analytics.cacheUtilization)}</p>
                        <p><strong>Reuse factor:</strong> {analytics.reuseFactor}</p>
                      </div>
                    ) : null}
                  </div>

                  {analytics.comparisonMetrics.speedupMemo !== null ? (
                    <div className="comparison-grid">
                      <div className="metric-card">
                        <div className="metric-card-header">
                          <h3>Comparison</h3>
                          <button type="button" className="metric-help-trigger" onClick={() => setHelpModal('comparison')}>Help</button>
                        </div>
                        <p><strong>Memo vs Backtracking:</strong> {analytics.comparisonMetrics.speedupMemo}x faster</p>
                        <p><strong>Calls avoided:</strong> {analytics.comparisonMetrics.callsAvoided}</p>
                        <p><strong>Call reduction:</strong> {formatPercent(analytics.comparisonMetrics.callsReduction)}</p>
                        <p><strong>Best calls:</strong> {analytics.comparisonMetrics.winnerCalls}</p>
                        <p><strong>Best steps:</strong> {analytics.comparisonMetrics.winnerSteps}</p>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p>No analytics available yet.</p>
              )}
            </section>

            {result.metrics?.analytics ? (
              <section className="panel analytics-panel">
                <div className="metric-card-header">
                  <h2>Visual Analytics</h2>
                  <button type="button" className="metric-help-trigger" onClick={() => setHelpModal('visualAnalytics')}>Help</button>
                </div>
                <AnalyticsCharts analytics={result.metrics.analytics} algorithm={result.algorithm} comparison={comparison} onHelpClick={(chartKey) => setHelpModal(chartKey || 'visualAnalytics')} />
              </section>
            ) : null}
          </section>
        </>
      ) : null}

      {helpModal ? (
        <MetricHelpModal
          section={helpModal}
          onClose={() => setHelpModal(null)}
          analytics={analytics}
          input={{ s, p }}
          algorithm={result?.algorithm ?? algorithm}
          comparison={comparison}
        />
      ) : null}
    </div>
  );
}
