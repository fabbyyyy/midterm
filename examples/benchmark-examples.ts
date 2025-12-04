import {
  runFullBenchmarkSuite,
  benchmarkLikeSearch,
  benchmarkSequentialFilter,
  benchmarkIndexedSearch,
  benchmarkAggregation,
  benchmarkMultipleQueries,
  generateBenchmarkReport,
  compareBenchmarks,
} from '@/services/benchmark';

import {
  generateComplexityReport,
  calculateLikePatternTime,
  calculateIndexedSearchTime,
  compareComplexity,
  ComplexityParams,
} from '@/lib/theoretical-complexity';

import {
  optimizedTextSearch,
  optimizedFilterByType,
  optimizedAggregation,
  optimizedDateRangeSearch,
  cachedQuery,
  clearQueryCache,
} from '@/services/optimizedQueries';

export async function ejemplo1_SuiteCompleta() {
  const userId = "1"; 
  const userType = "personal"; 
  const table = userType === "personal" ? "personal_tx" : "company_tx";

  console.log("🚀 Ejecutando suite completa de benchmarks...");

  const results = await runFullBenchmarkSuite(table, userId);

  console.log("✅ Benchmarks completados!");
  console.log("Resultados:");
  results.forEach(result => {
    console.log(`
      ${result.name}:
      - Tiempo Real: ${result.actualTimeMs.toFixed(2)}ms
      - Tiempo Teórico: ${result.theoreticalTimeMs.toFixed(2)}ms
      - Varianza: ${result.variancePercent.toFixed(1)}%
      - Registros: ${result.recordsProcessed}
    `);
  });

  const report = generateBenchmarkReport(results);
  console.log(`
    📊 Resumen:
    - Tiempo Total: ${report.totalTime.toFixed(2)}ms
    - Tiempo Promedio: ${report.averageTime.toFixed(2)}ms
    - Mejor: ${report.bestPerforming.name} (${report.bestPerforming.actualTimeMs.toFixed(2)}ms)
    - Peor: ${report.worstPerforming.name} (${report.worstPerforming.actualTimeMs.toFixed(2)}ms)
  `);

  return results;
}

export function ejemplo2_ComplejidadTeorica() {
  const params: ComplexityParams = {
    n: 10000,      
    m: 10,         
    queries: 100,  
  };

  console.log("🧮 Calculando complejidades teóricas...");

  const report = generateComplexityReport(params);

  console.log("📈 Análisis de Complejidad:");
  report.forEach(result => {
    console.log(`
      ${result.operation} (${result.bigO}):
      - Tiempo Estimado: ${result.estimatedTimeMs.toFixed(2)}ms
      - ${result.description}
    `);
  });

  return report;
}

export async function ejemplo3_CompararOptimizaciones() {
  const userId = 1;
  const table = "personal_tx";
  const pattern = "pago";

  console.log("⚖️ Comparando consulta no optimizada vs optimizada...");

  const likeResult = await benchmarkLikeSearch(table, userId, pattern);

  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const indexedResult = await benchmarkIndexedSearch(
    table,
    userId,
    lastMonth.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  );

  const comparison = compareBenchmarks(likeResult, indexedResult);

  console.log(`
    📊 Comparación:

    Sin Optimizar (LIKE):
    - Tiempo: ${comparison.baseline.actualTimeMs.toFixed(2)}ms
    - Query: ${comparison.baseline.query}

    Optimizado (Indexed):
    - Tiempo: ${comparison.optimized.actualTimeMs.toFixed(2)}ms
    - Query: ${comparison.optimized.query}

    Mejora:
    - ${comparison.improvement.toFixed(2)}ms más rápido
    - ${comparison.improvementPercent.toFixed(1)}% de mejora
    - ${comparison.speedupFactor.toFixed(1)}x más rápido
  `);

  return comparison;
}

export async function ejemplo4_ConsultasOptimizadas() {
  const userId = 1;
  const table = "personal_tx";

  console.log("🚀 Usando consultas optimizadas...");

  console.log("1️⃣ Full Text Search:");
  const searchResults = await optimizedTextSearch(table, userId, "pago servicios");
  console.log(`   Encontrados: ${searchResults.data?.length || 0} resultados`);

  console.log("2️⃣ Filtrado con Índice:");
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const filterResults = await optimizedFilterByType(
    table,
    userId,
    "gasto",
    lastMonth.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  );
  console.log(`   Encontrados: ${filterResults.data?.length || 0} gastos`);

  console.log("3️⃣ Agregación Optimizada:");
  const aggResults = await optimizedAggregation(table, userId);
  if (aggResults.data) {
    console.log(`   Ingresos: $${aggResults.data.totalIngresos.toFixed(2)}`);
    console.log(`   Gastos: $${aggResults.data.totalGastos.toFixed(2)}`);
    console.log(`   Balance: $${aggResults.data.balance.toFixed(2)}`);
  }

  console.log("4️⃣ Consulta con Caché:");
  const cacheKey = `totals_${userId}`;
  const cachedResults = await cachedQuery(
    cacheKey,
    () => optimizedAggregation(table, userId)
  );
  console.log(`   Resultado desde: ${cachedResults.cached ? 'CACHÉ' : 'BD'}`);

  return {
    search: searchResults,
    filter: filterResults,
    aggregation: aggResults,
    cached: cachedResults,
  };
}

export async function ejemplo5_BenchmarkPersonalizado() {
  const userId = 1;
  const table = "personal_tx";

  console.log("🔍 Ejecutando benchmarks individuales...");

  const likeTime = await benchmarkLikeSearch(table, userId, "pago");
  console.log(`LIKE Search: ${likeTime.actualTimeMs.toFixed(2)}ms`);

  const filterTime = await benchmarkSequentialFilter(table, userId, "gasto");
  console.log(`Sequential Filter: ${filterTime.actualTimeMs.toFixed(2)}ms`);

  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const indexTime = await benchmarkIndexedSearch(
    table,
    userId,
    lastWeek.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  );
  console.log(`Indexed Search: ${indexTime.actualTimeMs.toFixed(2)}ms`);

  const aggTime = await benchmarkAggregation(table, userId);
  console.log(`Aggregation: ${aggTime.actualTimeMs.toFixed(2)}ms`);

  const multiTime = await benchmarkMultipleQueries(table, userId, 50);
  console.log(`50 Queries: ${multiTime.actualTimeMs.toFixed(2)}ms`);

  return {
    like: likeTime,
    filter: filterTime,
    indexed: indexTime,
    aggregation: aggTime,
    multiple: multiTime,
  };
}

export function ejemplo6_AnalisisEscalabilidad() {
  console.log("📊 Análisis de Escalabilidad:");

  const tableSizes = [100, 1000, 10000, 100000];

  tableSizes.forEach(size => {
    console.log(`\n🔢 Tabla con ${size.toLocaleString()} registros:`);

    const likeTime = calculateLikePatternTime({ n: size, m: 10 });
    const indexedTime = calculateIndexedSearchTime({ n: size });

    console.log(`  LIKE Search: ${likeTime.estimatedTimeMs.toFixed(2)}ms (${likeTime.bigO})`);
    console.log(`  Indexed Search: ${indexedTime.estimatedTimeMs.toFixed(2)}ms (${indexedTime.bigO})`);

    const comparison = compareComplexity(likeTime, indexedTime);
    console.log(`  Mejora: ${comparison.improvement.speedupFactor.toFixed(1)}x más rápido`);
  });
}

export async function ejemplo7_DetectarCuellos() {
  const userId = 1;
  const table = "personal_tx";

  console.log("🔍 Detectando cuellos de botella...");

  const results = await runFullBenchmarkSuite(table, userId);

  const slow = results.filter(r => r.actualTimeMs > 50);

  if (slow.length > 0) {
    console.log("\n⚠️ Operaciones Lentas Detectadas:");
    slow.forEach(r => {
      console.log(`
        ${r.name}:
        - Tiempo: ${r.actualTimeMs.toFixed(2)}ms
        - Tipo: ${r.queryType}
        - Sugerencia: ${getSuggestion(r.queryType)}
      `);
    });
  } else {
    console.log("✅ Todas las operaciones están optimizadas!");
  }

  const highVariance = results.filter(r => Math.abs(r.variancePercent) > 100);

  if (highVariance.length > 0) {
    console.log("\n⚠️ Operaciones con Alta Varianza:");
    highVariance.forEach(r => {
      console.log(`
        ${r.name}:
        - Varianza: ${r.variancePercent.toFixed(1)}%
        - Causa posible: ${getVarianceCause(r.variancePercent)}
      `);
    });
  }

  return { slow, highVariance };
}

function getSuggestion(queryType: string): string {
  const suggestions: Record<string, string> = {
    "LIKE %pattern%": "Implementar Full Text Search (FTS)",
    "WHERE clause filtering": "Crear índice en campos filtrados",
    "Sequential aggregation": "Usar vista materializada",
  };
  return suggestions[queryType] || "Revisar índices";
}

function getVarianceCause(variance: number): string {
  if (variance > 100) return "Falta de índices o latencia de red alta";
  if (variance < -50) return "Caché de PostgreSQL activo";
  return "Overhead de red normal";
}

export function ejemplo8_ComponenteReact() {
  return `
import { useState } from 'react';
import { runFullBenchmarkSuite } from '@/services/benchmark';

function BenchmarkButton() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runBenchmarks = async () => {
    setLoading(true);
    try {
      const userId = sessionStorage.getItem("userId");
      const results = await runFullBenchmarkSuite("personal_tx", userId);
      setResults(results);
      console.log("Benchmarks completados:", results);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={runBenchmarks} disabled={loading}>
      {loading ? "Ejecutando..." : "Ejecutar Benchmarks"}
    </button>
  );
}
  `;
}
