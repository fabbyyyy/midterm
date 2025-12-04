export interface ComplexityParams {

  n: number;

  m?: number;

  queries?: number;
}

export interface ComplexityResult {

  operation: string;

  bigO: string;

  estimatedTimeMs: number;

  description: string;

  params: ComplexityParams;
}

const TIME_CONSTANTS = {

  COMPARISON_TIME_NS: 10,

  STRING_SEARCH_TIME_NS: 50,

  INDEX_LOOKUP_TIME_NS: 5,

  FTS_SEARCH_TIME_NS: 20,

  NETWORK_OVERHEAD_MS: 5,
};

export function calculateLikePatternTime(params: ComplexityParams): ComplexityResult {
  const { n, m = 10 } = params;

  const operations = n * m;

  const timeNs = operations * TIME_CONSTANTS.STRING_SEARCH_TIME_NS;

  const estimatedTimeMs = (timeNs / 1_000_000) + TIME_CONSTANTS.NETWORK_OVERHEAD_MS;

  return {
    operation: 'LIKE %pattern%',
    bigO: 'O(n × m)',
    estimatedTimeMs,
    description: `Búsqueda de patrón en ${n} registros con patrón de longitud ${m}. Requiere escaneo completo de la tabla sin uso de índices.`,
    params: { n, m },
  };
}

export function calculateSequentialFilterTime(params: ComplexityParams): ComplexityResult {
  const { n } = params;

  const operations = n;

  const timeNs = operations * TIME_CONSTANTS.COMPARISON_TIME_NS;

  const estimatedTimeMs = (timeNs / 1_000_000) + TIME_CONSTANTS.NETWORK_OVERHEAD_MS;

  return {
    operation: 'Sequential Filter',
    bigO: 'O(n)',
    estimatedTimeMs,
    description: `Filtrado secuencial sobre ${n} registros. Escaneo completo de tabla con comparación simple.`,
    params: { n },
  };
}

export function calculateFullTextSearchTime(params: ComplexityParams): ComplexityResult {
  const { n, m = 10 } = params;

  const resultsFound = Math.max(1, Math.floor(n * 0.01));
  const logN = Math.log2(n);
  const operations = (logN + resultsFound) * m;

  const timeNs = operations * TIME_CONSTANTS.FTS_SEARCH_TIME_NS;

  const estimatedTimeMs = (timeNs / 1_000_000) + TIME_CONSTANTS.NETWORK_OVERHEAD_MS;

  return {
    operation: 'Full Text Search',
    bigO: 'O(log n + k)',
    estimatedTimeMs,
    description: `Búsqueda de texto completo en ${n} registros usando índice FTS. Encuentra aproximadamente ${resultsFound} resultados.`,
    params: { n, m },
  };
}

export function calculateIndexedSearchTime(params: ComplexityParams): ComplexityResult {
  const { n } = params;

  const logN = Math.log2(n);
  const operations = logN;

  const timeNs = operations * TIME_CONSTANTS.INDEX_LOOKUP_TIME_NS;

  const estimatedTimeMs = (timeNs / 1_000_000) + TIME_CONSTANTS.NETWORK_OVERHEAD_MS;

  return {
    operation: 'Indexed Search (B-tree)',
    bigO: 'O(log n)',
    estimatedTimeMs,
    description: `Búsqueda con índice B-tree en ${n} registros. Búsqueda logarítmica muy eficiente.`,
    params: { n },
  };
}

export function calculateMultipleQueriesTime(
  params: ComplexityParams,
  useIndex: boolean = false
): ComplexityResult {
  const { n, queries = 1000 } = params;

  if (useIndex) {

    const logN = Math.log2(n);
    const operations = queries * logN;
    const timeNs = operations * TIME_CONSTANTS.INDEX_LOOKUP_TIME_NS;
    const estimatedTimeMs = (timeNs / 1_000_000) + (TIME_CONSTANTS.NETWORK_OVERHEAD_MS * queries);

    return {
      operation: 'Multiple Queries (Indexed)',
      bigO: 'O(q × log n)',
      estimatedTimeMs,
      description: `${queries} consultas con índice sobre ${n} registros. Búsqueda logarítmica por query.`,
      params: { n, queries },
    };
  } else {

    const operations = queries * n;
    const timeNs = operations * TIME_CONSTANTS.COMPARISON_TIME_NS;
    const estimatedTimeMs = (timeNs / 1_000_000) + (TIME_CONSTANTS.NETWORK_OVERHEAD_MS * queries);

    return {
      operation: 'Multiple Queries (Sequential)',
      bigO: 'O(q × n)',
      estimatedTimeMs,
      description: `${queries} consultas secuenciales sobre ${n} registros. Escaneo completo por query.`,
      params: { n, queries },
    };
  }
}

export function calculateAggregationTime(
  params: ComplexityParams,
  useIndex: boolean = false
): ComplexityResult {
  const { n } = params;

  if (useIndex) {

    const timeNs = TIME_CONSTANTS.INDEX_LOOKUP_TIME_NS * 10;
    const estimatedTimeMs = (timeNs / 1_000_000) + TIME_CONSTANTS.NETWORK_OVERHEAD_MS;

    return {
      operation: 'Aggregation (Indexed)',
      bigO: 'O(1)',
      estimatedTimeMs,
      description: `Agregación usando vista materializada o índice sobre ${n} registros.`,
      params: { n },
    };
  } else {

    const operations = n;
    const timeNs = operations * TIME_CONSTANTS.COMPARISON_TIME_NS;
    const estimatedTimeMs = (timeNs / 1_000_000) + TIME_CONSTANTS.NETWORK_OVERHEAD_MS;

    return {
      operation: 'Aggregation (Sequential)',
      bigO: 'O(n)',
      estimatedTimeMs,
      description: `Agregación con escaneo completo de ${n} registros.`,
      params: { n },
    };
  }
}

export function generateComplexityReport(params: ComplexityParams): ComplexityResult[] {
  return [
    calculateLikePatternTime(params),
    calculateSequentialFilterTime(params),
    calculateFullTextSearchTime(params),
    calculateIndexedSearchTime(params),
    calculateMultipleQueriesTime(params, false),
    calculateMultipleQueriesTime(params, true),
    calculateAggregationTime(params, false),
    calculateAggregationTime(params, true),
  ];
}

export function compareComplexity(baseline: ComplexityResult, optimized: ComplexityResult) {
  const improvement = baseline.estimatedTimeMs - optimized.estimatedTimeMs;
  const improvementPercent = (improvement / baseline.estimatedTimeMs) * 100;
  const speedupFactor = baseline.estimatedTimeMs / optimized.estimatedTimeMs;

  return {
    baseline,
    optimized,
    improvement: {
      timeMs: improvement,
      percent: improvementPercent,
      speedupFactor,
    },
  };
}
