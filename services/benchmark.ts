import supabase from "./supabase";
import {
  ComplexityParams,
  ComplexityResult,
  calculateLikePatternTime,
  calculateSequentialFilterTime,
  calculateFullTextSearchTime,
  calculateIndexedSearchTime,
  calculateMultipleQueriesTime,
  calculateAggregationTime,
} from "@/lib/theoretical-complexity";

export interface BenchmarkResult {

  name: string;

  queryType: string;

  actualTimeMs: number;

  theoreticalTimeMs: number;

  variance: number;

  variancePercent: number;

  recordsProcessed: number;

  query: string;

  timestamp: Date;
}

export interface BenchmarkComparison {

  baseline: BenchmarkResult;

  optimized: BenchmarkResult;

  improvement: number;

  improvementPercent: number;

  speedupFactor: number;
}

async function measureQueryTime<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; timeMs: number; error: any }> {
  const startTime = performance.now();
  const result = await queryFn();
  const endTime = performance.now();

  return {
    data: result.data,
    error: result.error,
    timeMs: endTime - startTime,
  };
}

async function getRecordCount(table: string, userId?: string | number): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });

  if (userId && table === "personal_tx") {
    query = query.eq("user_id", userId);
  } else if (userId && table === "company_tx") {
    query = query.eq("empresa_id", userId);
  }

  const { count } = await query;
  return count || 0;
}

export async function benchmarkLikeSearch(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  pattern: string = "gasto"
): Promise<BenchmarkResult> {
  const field = table === "personal_tx" ? "descripcion" : "concepto";
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  const recordCount = await getRecordCount(table, userId);

  const { data, timeMs, error } = await measureQueryTime(async () => {
    const result = await supabase
      .from(table)
      .select("*")
      .eq(idField, userId)
      .ilike(field, `%${pattern}%`);
    return result;
  });

  if (error) {
    console.error("Error in LIKE search:", error);
  }

  const complexityResult = calculateLikePatternTime({
    n: recordCount,
    m: pattern.length,
  });

  const variance = timeMs - complexityResult.estimatedTimeMs;
  const variancePercent = (variance / complexityResult.estimatedTimeMs) * 100;

  return {
    name: "LIKE Pattern Search",
    queryType: "LIKE %pattern%",
    actualTimeMs: timeMs,
    theoreticalTimeMs: complexityResult.estimatedTimeMs,
    variance,
    variancePercent,
    recordsProcessed: Array.isArray(data) ? data.length : 0,
    query: `SELECT * FROM ${table} WHERE ${idField} = '${userId}' AND ${field} ILIKE '%${pattern}%'`,
    timestamp: new Date(),
  };
}

export async function benchmarkSequentialFilter(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  tipo: "ingreso" | "gasto" = "gasto"
): Promise<BenchmarkResult> {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  const recordCount = await getRecordCount(table, userId);

  const { data, timeMs, error } = await measureQueryTime(async () => {
    const result = await supabase
      .from(table)
      .select("*")
      .eq(idField, userId)
      .eq("tipo", tipo);
    return result;
  });

  if (error) {
    console.error("Error in sequential filter:", error);
  }

  const complexityResult = calculateSequentialFilterTime({ n: recordCount });

  const variance = timeMs - complexityResult.estimatedTimeMs;
  const variancePercent = (variance / complexityResult.estimatedTimeMs) * 100;

  return {
    name: "Sequential Filter",
    queryType: "WHERE clause filtering",
    actualTimeMs: timeMs,
    theoreticalTimeMs: complexityResult.estimatedTimeMs,
    variance,
    variancePercent,
    recordsProcessed: Array.isArray(data) ? data.length : 0,
    query: `SELECT * FROM ${table} WHERE ${idField} = '${userId}' AND tipo = '${tipo}'`,
    timestamp: new Date(),
  };
}

export async function benchmarkIndexedSearch(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  dateFrom: string,
  dateTo: string
): Promise<BenchmarkResult> {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  const recordCount = await getRecordCount(table, userId);

  const { data, timeMs, error } = await measureQueryTime(async () => {
    const result = await supabase
      .from(table)
      .select("*")
      .eq(idField, userId)
      .gte("fecha", dateFrom)
      .lte("fecha", dateTo)
      .order("fecha", { ascending: false });
    return result;
  });

  if (error) {
    console.error("Error in indexed search:", error);
  }

  const complexityResult = calculateIndexedSearchTime({ n: recordCount });

  const variance = timeMs - complexityResult.estimatedTimeMs;
  const variancePercent = (variance / complexityResult.estimatedTimeMs) * 100;

  return {
    name: "Indexed Search (Date Range)",
    queryType: "B-tree index lookup",
    actualTimeMs: timeMs,
    theoreticalTimeMs: complexityResult.estimatedTimeMs,
    variance,
    variancePercent,
    recordsProcessed: Array.isArray(data) ? data.length : 0,
    query: `SELECT * FROM ${table} WHERE ${idField} = '${userId}' AND fecha BETWEEN '${dateFrom}' AND '${dateTo}' ORDER BY fecha DESC`,
    timestamp: new Date(),
  };
}

export async function benchmarkAggregation(
  table: "personal_tx" | "company_tx",
  userId: string | number
): Promise<BenchmarkResult> {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  const recordCount = await getRecordCount(table, userId);

  const { data, timeMs, error } = await measureQueryTime(async () => {
    const result = await supabase
      .from(table)
      .select("tipo, monto")
      .eq(idField, userId);
    return result;
  });

  if (error) {
    console.error("Error in aggregation:", error);
  }

  const totals = Array.isArray(data) ? data.reduce(
    (acc: { ingresos: number; gastos: number }, row: any) => {
      if (row.tipo === "ingreso") acc.ingresos += row.monto;
      else acc.gastos += row.monto;
      return acc;
    },
    { ingresos: 0, gastos: 0 }
  ) : { ingresos: 0, gastos: 0 };

  const complexityResult = calculateAggregationTime({ n: recordCount }, false);

  const variance = timeMs - complexityResult.estimatedTimeMs;
  const variancePercent = (variance / complexityResult.estimatedTimeMs) * 100;

  return {
    name: "Aggregation (SUM by type)",
    queryType: "Sequential aggregation",
    actualTimeMs: timeMs,
    theoreticalTimeMs: complexityResult.estimatedTimeMs,
    variance,
    variancePercent,
    recordsProcessed: Array.isArray(data) ? data.length : 0,
    query: `SELECT tipo, SUM(monto) FROM ${table} WHERE ${idField} = '${userId}' GROUP BY tipo`,
    timestamp: new Date(),
  };
}

export async function benchmarkMultipleQueries(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  const recordCount = await getRecordCount(table, userId);

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await supabase
      .from(table)
      .select("*")
      .eq(idField, userId)
      .limit(10);
  }

  const endTime = performance.now();
  const timeMs = endTime - startTime;

  const complexityResult = calculateMultipleQueriesTime(
    { n: recordCount, queries: iterations },
    true 
  );

  const variance = timeMs - complexityResult.estimatedTimeMs;
  const variancePercent = (variance / complexityResult.estimatedTimeMs) * 100;

  return {
    name: `Multiple Queries (${iterations} iterations)`,
    queryType: "Repeated indexed queries",
    actualTimeMs: timeMs,
    theoreticalTimeMs: complexityResult.estimatedTimeMs,
    variance,
    variancePercent,
    recordsProcessed: iterations * 10,
    query: `SELECT * FROM ${table} WHERE ${idField} = '${userId}' LIMIT 10 (x${iterations})`,
    timestamp: new Date(),
  };
}

export async function runFullBenchmarkSuite(
  table: "personal_tx" | "company_tx",
  userId: string | number
): Promise<BenchmarkResult[]> {
  console.log(`Running full benchmark suite for ${table}...`);

  const results: BenchmarkResult[] = [];

  results.push(await benchmarkLikeSearch(table, userId, "pago"));

  results.push(await benchmarkSequentialFilter(table, userId, "gasto"));

  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  results.push(
    await benchmarkIndexedSearch(
      table,
      userId,
      lastMonth.toISOString().split("T")[0],
      today.toISOString().split("T")[0]
    )
  );

  results.push(await benchmarkAggregation(table, userId));

  results.push(await benchmarkMultipleQueries(table, userId, 50));

  console.log("Benchmark suite completed!");
  return results;
}

export function compareBenchmarks(
  baseline: BenchmarkResult,
  optimized: BenchmarkResult
): BenchmarkComparison {
  const improvement = baseline.actualTimeMs - optimized.actualTimeMs;
  const improvementPercent = (improvement / baseline.actualTimeMs) * 100;
  const speedupFactor = baseline.actualTimeMs / optimized.actualTimeMs;

  return {
    baseline,
    optimized,
    improvement,
    improvementPercent,
    speedupFactor,
  };
}

export function generateBenchmarkReport(results: BenchmarkResult[]): {
  totalTime: number;
  averageTime: number;
  averageVariance: number;
  bestPerforming: BenchmarkResult;
  worstPerforming: BenchmarkResult;
} {
  const totalTime = results.reduce((sum, r) => sum + r.actualTimeMs, 0);
  const averageTime = totalTime / results.length;
  const averageVariance =
    results.reduce((sum, r) => sum + Math.abs(r.variancePercent), 0) / results.length;

  const sortedByTime = [...results].sort((a, b) => a.actualTimeMs - b.actualTimeMs);

  return {
    totalTime,
    averageTime,
    averageVariance,
    bestPerforming: sortedByTime[0],
    worstPerforming: sortedByTime[sortedByTime.length - 1],
  };
}
