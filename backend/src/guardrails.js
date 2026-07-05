export class ExecutionBudgetExceededError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ExecutionBudgetExceededError';
    this.details = details;
  }
}

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function getExecutionBudget({ s, p, algorithm }) {
  const maxStates = toPositiveNumber(process.env.REGEX_MAX_STATES, 20000);
  const maxEvents = toPositiveNumber(process.env.REGEX_MAX_EVENTS, 10000);
  const maxDepth = toPositiveNumber(process.env.REGEX_MAX_DEPTH, 400);
  const maxPatternLength = toPositiveNumber(process.env.REGEX_MAX_PATTERN_LENGTH, 300);
  const maxStringLength = toPositiveNumber(process.env.REGEX_MAX_STRING_LENGTH, 300);
  const maxDpCells = toPositiveNumber(process.env.REGEX_MAX_DP_CELLS, 400000);

  return {
    algorithm,
    maxStates,
    maxEvents,
    maxDepth,
    maxPatternLength,
    maxStringLength,
    maxDpCells,
    sLength: s?.length ?? 0,
    pLength: p?.length ?? 0,
  };
}

export function ensureExecutionBudget({ s, p, algorithm, calls = 0, step = 0, depth = 0, dpCells = 0 }) {
  const budget = getExecutionBudget({ s, p, algorithm });

  if ((s?.length ?? 0) > budget.maxStringLength || (p?.length ?? 0) > budget.maxPatternLength) {
    throw new ExecutionBudgetExceededError('Input exceeds configured length budget', {
      ...budget,
      reason: 'length',
    });
  }

  if (algorithm === 'bottomup' && dpCells > budget.maxDpCells) {
    throw new ExecutionBudgetExceededError('Dynamic programming table exceeds configured budget', {
      ...budget,
      reason: 'dp-cells',
      dpCells,
    });
  }

  if (calls > budget.maxStates || step > budget.maxEvents || depth > budget.maxDepth) {
    throw new ExecutionBudgetExceededError('Execution budget exceeded for this input', {
      ...budget,
      reason: 'budget',
      calls,
      step,
      depth,
      dpCells,
    });
  }
}
