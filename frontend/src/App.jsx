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
  const eventSourceRef = useRef(null);

  const timeline = useMemo(() => result?.events ?? [], [result]);
  const visibleEvents = useMemo(() => timeline.slice(0, currentStep), [timeline, currentStep]);
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
    setCurrentStep(Math.min(match.step ?? timeline.length, timeline.length));
  };

  useEffect(() => {
    if (!isPlaying || !timeline.length) {
      return undefined;
    }

    if (currentStep >= timeline.length) {
      setIsPlaying(false);
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setCurrentStep((value) => {
        if (value >= timeline.length) {
          setIsPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 350);

    return () => window.clearInterval(timerId);
  }, [currentStep, isPlaying, timeline.length]);

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
              setCurrentStep(Math.min(incrementalEvents.length, 1));
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
              setCurrentStep(Math.min(runningResult.events?.length ?? 0, 1));
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
      setCurrentStep(Math.min(10, data.events?.length || 0));
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
                <p className="step-indicator">Showing {visibleEvents.length} of {timeline.length} events</p>
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
                      <h3>State exploration</h3>
                      <p><strong>Unique states:</strong> {analytics.uniqueStates}</p>
                      <p><strong>Repeated visits:</strong> {analytics.repeatedVisits}</p>
                      <p><strong>Repeated ratio:</strong> {formatPercent(analytics.repeatedRatio)}</p>
                      <p><strong>Coverage:</strong> {analytics.uniqueStates} / {analytics.possibleStates} ({formatPercent(analytics.coverage)})</p>
                    </div>

                    <div className="metric-card">
                      <h3>Recursion tree</h3>
                      <p><strong>Max depth:</strong> {analytics.treeMetrics.maxDepth}</p>
                      <p><strong>Avg depth:</strong> {analytics.treeMetrics.avgDepth}</p>
                      <p><strong>Avg branching:</strong> {analytics.treeMetrics.avgBranching}</p>
                      <p><strong>Leaf nodes:</strong> {analytics.treeMetrics.leaves}</p>
                      <p><strong>Critical path:</strong> {analytics.treeMetrics.criticalPathLength} states</p>
                    </div>

                    <div className="metric-card">
                      <h3>Problem profile</h3>
                      <p><strong>Pattern length:</strong> {analytics.problemMetrics.patternLength}</p>
                      <p><strong>Star density:</strong> {formatPercent(analytics.problemMetrics.starDensity)}</p>
                      <p><strong>Dot density:</strong> {formatPercent(analytics.problemMetrics.dotDensity)}</p>
                      <p><strong>Difficulty score:</strong> {analytics.problemMetrics.difficultyScore}</p>
                    </div>

                    {result.algorithm === 'memo' ? (
                      <div className="metric-card">
                        <h3>Memoization</h3>
                        <p><strong>Hits:</strong> {analytics.memoHits}</p>
                        <p><strong>Misses:</strong> {analytics.memoMisses}</p>
                        <p><strong>Hit rate:</strong> {formatPercent(analytics.hitRate)}</p>
                        <p><strong>Cache utilization:</strong> {formatPercent(analytics.cacheUtilization)}</p>
                        <p><strong>Reuse factor:</strong> {analytics.reuseFactor}</p>
                      </div>
                    ) : null}
                  </div>

                  {analytics.comparisonMetrics.speedupMemo !== null ? (
                    <div className="comparison-grid">
                      <div className="metric-card">
                        <h3>Comparison</h3>
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
                <h2>Visual Analytics</h2>
                <AnalyticsCharts analytics={result.metrics.analytics} algorithm={result.algorithm} comparison={comparison} />
              </section>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
