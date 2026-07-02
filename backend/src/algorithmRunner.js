import { runAlgorithm } from './traceEngine.js';
import { runBottomUp } from './dpEngine.js';

export function runTrace({ s, p, algorithm = 'memo' }) {
  if (algorithm === 'bottomup') {
    return runBottomUp({ s, p });
  }

  return runAlgorithm({ s, p, algorithm });
}
