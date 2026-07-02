import { useEffect, useMemo, useState } from 'react';
import ComparisonView from './ComparisonView';
import DpTable from './DpTable';
import TreeView from './TreeView';
import { postJson } from './apiClient';

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

  const timeline = useMemo(() => result?.events ?? [], [result]);
  const visibleEvents = useMemo(() => timeline.slice(0, currentStep), [timeline, currentStep]);
  const selectedCell = useMemo(() => {
    const state = selectedEvent?.state;
    if (typeof state?.i === 'number' && typeof state?.j === 'number') {
      return `${state.i},${state.j}`;
    }
    return null;
  }, [selectedEvent]);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Regex Matching Visualizer</h1>
          <p>Send a string, a pattern and an algorithm to inspect the execution trace.</p>
        </div>
        <div className="header-branding">
          <span className="brand-name">Alpha</span>
        </div>
        <img className="header-logo" src="/images/logos.png" alt="Alpha logo" />
      </header>

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

      {result ? (
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
                {result.algorithm === 'bottomup' ? <DpTable dp={result.dp} dependencies={result.dependencies} order={result.order} selectedCell={selectedCell} onSelectState={handleSelectState} s={s} p={p} /> : <TreeView events={timeline} callTree={result.callTree} activeStateKey={selectedCell} onSelectState={handleSelectState} />}
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
        </section>
      ) : null}
    </div>
  );
}
