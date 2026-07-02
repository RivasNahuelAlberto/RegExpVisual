export const EVENT_TYPES = [
  'CALL',
  'RETURN',
  'COMPARE',
  'FIRST_MATCH',
  'STAR_FOUND',
  'SKIP',
  'CONSUME',
  'MEMO_LOOKUP',
  'MEMO_HIT',
  'MEMO_STORE',
  'DP_START',
  'DP_CELL',
  'DP_FINISH',
  'FINISH',
];

export function createEvent(type, state, description, extra = {}) {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    step: 0,
    type,
    timestamp: new Date().toISOString(),
    state,
    description,
    variables: {},
    codeReference: null,
    ...extra,
  };
}
