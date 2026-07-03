import { runAlgorithm } from './traceEngine.js';
import { runBottomUp } from './dpEngine.js';

export function runTrace({ s, p, algorithm = 'memo', stream = false, onEvent = null }) {
  if (algorithm === 'bottomup') {
    return runBottomUp({ s, p, stream, onEvent });
  }

  return runAlgorithm({ s, p, algorithm, stream, onEvent });
}
