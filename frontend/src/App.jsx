import { useEffect, useMemo, useState } from 'react';
import ComparisonView from './ComparisonView';
import DpTable from './DpTable';
import TreeView from './TreeView';
import { postJson } from './apiClient';

const pseudocodeByAlgorithm = {
  memo: `# 1. Backtracking with Memoization (Top-Down Dynamic Programming) [memo]

## High-Level Idea

This algorithm recursively attempts to match a text against a pattern containing the special characters:

* \. matches **any single character**.
* \* matches **zero or more occurrences of the preceding character**.

Each recursive call represents a state defined by two indices:

* i: current position in the text.
* j: current position in the pattern.

Since different recursive paths may reach the same state multiple times, previously computed results are stored in a memoization table. This avoids redundant computations and reduces the overall running time.

---

## State Definition

Each state is represented by the pair:

```text
(i, j)
```

where:

* text[i...] is the remaining portion of the text.
* pattern[j...] is the remaining portion of the pattern.

The recursive function answers the question:

> Does text[i...] match pattern[j...]?

---

## Pseudocode

```text
FUNCTION IsMatch(text, pattern)

    m ← length(text)
    n ← length(pattern)

    memo ← empty map

    RETURN Match(0, 0)



FUNCTION Match(i, j)

    // Base case:
    // The entire pattern has been processed.
    IF j = n THEN
        RETURN (i = m)

    // Return the stored result if this state
    // has already been computed.
    IF (i, j) exists in memo THEN
        RETURN memo[(i, j)]

    IF j + 1 < n AND pattern[j + 1] = '*' THEN

        // Option 1:
        // Ignore the current character and '*'.
        skip ← Match(i, j + 2)

        // Option 2:
        // Consume one character from the text.
        consume ← FALSE

        IF i < m AND
           (text[i] = pattern[j] OR pattern[j] = '.') THEN

            consume ← Match(i + 1, j)

        END IF

        result ← skip OR consume

    ELSE

        currentMatch ←
            i < m AND
            (text[i] = pattern[j] OR pattern[j] = '.')

        result ← currentMatch AND Match(i + 1, j + 1)

    END IF

    memo[(i, j)] ← result

    RETURN result
```

---

## Explanation

The algorithm explores the pattern recursively until one of two situations occurs.

### Base Case

If the pattern has been completely processed, the match succeeds only if the text has also been completely consumed.

```text
IF j = n
    RETURN (i = m)
```

---

### Matching a Regular Character or '.'

If the next pattern character is **not** followed by `*`, the current characters must match.

A match occurs when:

* both characters are equal, or
* the pattern character is `.`.

If the current characters match, both indices advance.

```text
text:    a b c
          ↑
pattern: a b c
          ↑

↓

Match(i + 1, j + 1)
```

---

### Matching a Character Followed by '*'

When the next pattern character is `*`, there are exactly two possibilities.

#### Option 1: Skip

Treat `x*` as matching zero characters.

```text
text:    aaab
         ↑

pattern: a*b
         ↑

↓

Match(i, j + 2)
```

---

#### Option 2: Consume

If the current characters match, consume one character from the text while keeping the pattern index unchanged.

```text
text:    aaab
         ↑

pattern: a*b
         ↑

↓

Match(i + 1, j)
```

The pattern index does not move because `*` may still match additional occurrences.

The current state succeeds if **either** option succeeds.

---

## Why Memoization Improves Performance

Different recursive paths may reach exactly the same state `(i, j)`.

Instead of solving that state repeatedly, the algorithm stores the computed result in the memoization table.

Whenever the same state is encountered again, the stored value is returned immediately.

Since there are only `(m + 1) × (n + 1)` possible states, each state is evaluated at most once.

---

## Complexity Analysis

| Complexity | Value        |
| ---------- | ------------ |
| Time       | **O(m × n)** |
| Space      | **O(m × n)** |

where:

* m is the length of the text.
* n is the length of the pattern.
`,
  backtracking: `# 2. Backtracking without Memoization [backtracking]

## High-Level Idea

This algorithm recursively attempts to match a text against a pattern containing the special characters:

* `.` matches any single character.
* `*` matches zero or more occurrences of the preceding character.

Each recursive call represents a state identified by two indices:

* i: current position in the text.
* j: current position in the pattern.

Unlike the memoized version, previously computed states are **not stored**. As a result, the same state may be evaluated multiple times through different recursive paths.

---

## State Definition

Each recursive state is represented by:

```text
(i, j)
```

which corresponds to matching:

```text
text[i...]
```

against

```text
pattern[j...]
```

---

## Pseudocode

```text
FUNCTION IsMatch(text, pattern)

    m ← length(text)
    n ← length(pattern)

    RETURN Match(0, 0)


FUNCTION Match(i, j)

    IF j = n THEN
        RETURN (i = m)

    IF j + 1 < n AND pattern[j + 1] = '*' THEN

        skip ← Match(i, j + 2)

        consume ← FALSE

        IF i < m AND
           (text[i] = pattern[j] OR pattern[j] = '.') THEN

            consume ← Match(i + 1, j)

        END IF

        RETURN skip OR consume

    ELSE

        currentMatch ←
            i < m AND
            (text[i] = pattern[j] OR pattern[j] = '.')

        RETURN currentMatch AND Match(i + 1, j + 1)

    END IF
```

---

## Explanation

The algorithm recursively explores every possible interpretation of the pattern.

### Base Case

If the entire pattern has been processed, the match succeeds only if the text has also been completely processed.

```text
IF j = n
    RETURN (i = m)
```

---

### Matching a Regular Character or '.'

If the current pattern character is not followed by `*`, the current text character must match it.

If the characters match, both indices advance to the next position.

```text
Match(i + 1, j + 1)
```

---

### Matching a Character Followed by '*'

When the next pattern character is `*`, two alternatives are explored.

#### Skip

Treat `x*` as matching zero characters.

```text
Match(i, j + 2)
```

---

#### Consume

If the current characters match, consume one character from the text while keeping the pattern index fixed.

```text
Match(i + 1, j)
```

This allows `*` to match any number of consecutive occurrences.

The current state succeeds if either recursive branch succeeds.

---

## Why This Version Is Inefficient

Because no results are stored, identical states may be reached many times.

For example:

```text
            (0,0)
           /     \
      skip       consume
         \       /
          (2,3)
```

The state `(2,3)` is solved independently every time it is reached.

As the input grows, the number of repeated computations increases rapidly, leading to exponential running time.

---

## Complexity Analysis

| Complexity | Value                          |
| ---------- | ------------------------------ |
| Time       | **O(2^(m+n))** (worst case)    |
| Space      | **O(m + n)** (recursion stack) |

where:

* m is the length of the text.
* n is the length of the pattern.
`,
  bottomup: `# 3. Bottom-Up Dynamic Programming [bottomup]

## High-Level Idea

Instead of exploring states recursively, this algorithm builds the solution iteratively using dynamic programming.

A two-dimensional table stores the result of every possible combination of text and pattern suffixes.

The pattern supports two special characters:

* `.` matches any single character.
* `*` matches zero or more occurrences of the preceding character.

The final answer is obtained after filling the table from the end of the strings toward the beginning.

---

## DP State Definition

A table

```text
dp[m + 1][n + 1]
```

is created.

Each entry

```text
dp[i][j]
```

represents whether

```text
text[i...]
```

matches

```text
pattern[j...]
```

Thus, every cell answers the question:

> Does the remaining text starting at index `i` match the remaining pattern starting at index `j`?

---

## Pseudocode

```text
FUNCTION IsMatch(text, pattern)

    m ← length(text)
    n ← length(pattern)

    CREATE dp[m + 1][n + 1]

    INITIALIZE every entry to FALSE

    dp[m][n] ← TRUE

    FOR i FROM m DOWN TO 0

        FOR j FROM n - 1 DOWN TO 0

            currentMatch ←
                i < m AND
                (text[i] = pattern[j] OR pattern[j] = '.')

            IF j + 1 < n AND pattern[j + 1] = '*' THEN

                dp[i][j] ←
                    dp[i][j + 2]
                    OR
                    (currentMatch AND dp[i + 1][j])

            ELSE

                dp[i][j] ←
                    currentMatch AND dp[i + 1][j + 1]

            END IF

        END FOR

    END FOR

    RETURN dp[0][0]
```

---

## Explanation

The table is filled from the bottom-right corner toward the top-left.

This traversal order guarantees that every value needed to compute `dp[i][j]` has already been computed.

---

### Base Case

The only known value before the iteration starts is

```text
dp[m][n] = TRUE
```

because an empty text matches an empty pattern.

All remaining entries are derived from this base case.

---

### Matching a Regular Character or '.'

If the next pattern character is not followed by `*`, the current characters must match.

If they do, the answer depends on the remaining suffixes.

```text
dp[i][j] =
    currentMatch
    AND
    dp[i + 1][j + 1]
```

---

### Matching a Character Followed by '*'

When the next pattern character is `*`, two possibilities are considered.

#### Skip

Ignore `x*`.

```text
dp[i][j + 2]
```

---

#### Consume

If the current characters match, consume one character from the text while keeping the pattern position unchanged.

```text
currentMatch
AND
dp[i + 1][j]
```

The final value is true if either option succeeds.

---

## Why the Table Is Filled Backwards

Each state depends only on values located:

* to the right (`j + 2`),
* below (`i + 1`), or
* diagonally below-right (`i + 1, j + 1`).

By iterating from the end of both strings toward the beginning, all dependencies are guaranteed to have been computed before they are needed.

---

## Complexity Analysis

| Complexity | Value        |
| ---------- | ------------ |
| Time       | **O(m × n)** |
| Space      | **O(m × n)** |

where:

* m is the length of the text.
* n is the length of the pattern.
`
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

      {result ? (
        <>
          <section className="panel pseudocode-panel">
            <h2>Algorithm reference</h2>
            <pre>{pseudocodeByAlgorithm[result.algorithm] ?? ''}</pre>
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
