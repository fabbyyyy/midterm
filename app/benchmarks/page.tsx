"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  runFullBenchmarkSuite,
  BenchmarkResult,
  generateBenchmarkReport,
  compareBenchmarks,
} from "@/services/benchmark";
import {
  generateComplexityReport,
  ComplexityResult,
  compareComplexity,
} from "@/lib/theoretical-complexity";
import { Play, RefreshCw, TrendingDown, TrendingUp, Zap, Clock, BarChart3, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
} from "recharts";

export default function BenchmarkPage() {
  const [userType, setUserType] = useState<"personal" | "company">("personal");
  const [userId, setUserId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [theoreticalResults, setTheoreticalResults] = useState<ComplexityResult[]>([]);
  const [recordCount, setRecordCount] = useState<number>(1000);

  useEffect(() => {
    const storedUserType = sessionStorage.getItem("userType") as "personal" | "company";
    const storedUserId = sessionStorage.getItem("userId");

    if (!storedUserType || !storedUserId) {
      window.location.href = "/login";
      return;
    }

    setUserType(storedUserType);
    setUserId(storedUserId);

    // Generar resultados teóricos iniciales
    const theoretical = generateComplexityReport({
      n: 1000,
      m: 10,
      queries: 100,
    });
    setTheoreticalResults(theoretical);
  }, []);

  const runBenchmarks = async () => {
    if (!userId) return;

    setIsRunning(true);
    try {
      const table = userType === "personal" ? "personal_tx" : "company_tx";
      const results = await runFullBenchmarkSuite(table, userId);
      setBenchmarkResults(results);

      // Actualizar cálculos teóricos basados en datos reales
      if (results.length > 0) {
        const avgRecords = Math.round(
          results.reduce((sum, r) => sum + r.recordsProcessed, 0) / results.length
        );
        setRecordCount(avgRecords);

        const theoretical = generateComplexityReport({
          n: avgRecords,
          m: 10,
          queries: 100,
        });
        setTheoreticalResults(theoretical);
      }
    } catch (error) {
      console.error("Error running benchmarks:", error);
      alert("Error al ejecutar benchmarks");
    } finally {
      setIsRunning(false);
    }
  };

  const report = benchmarkResults.length > 0
    ? generateBenchmarkReport(benchmarkResults)
    : null;

  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`;
    if (ms < 1000) return `${ms.toFixed(2)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <DashboardSidebar userType={userType} userId={userId} />

        <SidebarInset className="flex-1 w-full">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 bg-white sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-gray-300 mx-2" />
            <h1 className="text-xl font-semibold text-gray-900">
              Análisis de Rendimiento - Benchmarks
            </h1>
          </header>

          {/* Main Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Control Panel */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Suite de Benchmarking
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Compara el rendimiento teórico vs real de consultas en Supabase
                  </p>
                </div>
                <Button
                  onClick={runBenchmarks}
                  disabled={isRunning}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Ejecutando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Ejecutar Benchmarks
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Summary Cards */}
            {report && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tiempo Total</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatTime(report.totalTime)}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-red-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tiempo Promedio</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatTime(report.averageTime)}
                      </p>
                    </div>
                    <Zap className="w-8 h-8 text-yellow-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Más Rápido</p>
                      <p className="text-lg font-semibold text-green-600 mt-1">
                        {report.bestPerforming.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTime(report.bestPerforming.actualTimeMs)}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-green-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Más Lento</p>
                      <p className="text-lg font-semibold text-red-600 mt-1">
                        {report.worstPerforming.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTime(report.worstPerforming.actualTimeMs)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-red-600" />
                  </div>
                </Card>
              </div>
            )}

            {/* Theoretical Complexity Results */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Análisis de Complejidad Teórica
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Tiempo estimado basado en análisis Big-O para {recordCount.toLocaleString()} registros
              </p>
              <div className="space-y-3">
                {theoreticalResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {result.operation}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {result.bigO}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {result.description}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatTime(result.estimatedTimeMs)}
                      </p>
                      <p className="text-xs text-gray-500">estimado</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actual Benchmark Results */}
            {benchmarkResults.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Resultados Reales de Benchmarks
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Tiempos medidos en ejecución real contra Supabase
                </p>
                <div className="space-y-3">
                  {benchmarkResults.map((result, index) => {
                    const isSlower = result.actualTimeMs > result.theoreticalTimeMs;
                    const varianceColor = isSlower ? "text-red-600" : "text-green-600";
                    const varianceIcon = isSlower ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;

                    return (
                      <div
                        key={index}
                        className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">
                                {result.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {result.queryType}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                              <div>
                                <p className="text-xs text-gray-500">Tiempo Real</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatTime(result.actualTimeMs)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Tiempo Teórico</p>
                                <p className="text-sm font-semibold text-gray-700">
                                  {formatTime(result.theoreticalTimeMs)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Varianza</p>
                                <div className={`text-sm font-semibold ${varianceColor} flex items-center gap-1`}>
                                  {varianceIcon}
                                  {formatPercent(result.variancePercent)}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Registros</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {result.recordsProcessed.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-x-auto">
                              {result.query}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Comparison Analysis */}
            {benchmarkResults.length >= 2 && (
              <>
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-red-600" />
                    Comparación Visual: Teórico vs Real
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Gráfico de barras comparando tiempos estimados y medidos
                  </p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={benchmarkResults.map((r) => ({
                          name: r.name.replace(' Search', '').replace(' Filter', ''),
                          Teórico: Number(r.theoreticalTimeMs.toFixed(2)),
                          Real: Number(r.actualTimeMs.toFixed(2)),
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          label={{ value: 'Tiempo (ms)', angle: -90, position: 'insideLeft' }}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        <Bar dataKey="Teórico" fill="#94a3b8" name="Tiempo Teórico" />
                        <Bar dataKey="Real" fill="#dc2626" name="Tiempo Real" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Análisis de Varianza
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Gráfico de líneas mostrando la diferencia porcentual entre teórico y real
                  </p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={benchmarkResults.map((r, index) => ({
                          name: r.name.replace(' Search', '').replace(' Filter', ''),
                          varianza: Number(r.variancePercent.toFixed(1)),
                          index,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <defs>
                          <linearGradient id="colorVariance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          label={{ value: 'Varianza (%)', angle: -90, position: 'insideLeft' }}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                          formatter={(value: any) => [`${value}%`, 'Varianza']}
                        />
                        <Area
                          type="monotone"
                          dataKey="varianza"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorVariance)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Análisis Comparativo Detallado
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Comparación entre métodos de consulta optimizados y no optimizados
                  </p>
                  <div className="space-y-4">
                    {/* Comparar LIKE vs Indexed Search */}
                    {benchmarkResults[0] && benchmarkResults[2] && (
                      <div className="p-4 bg-linear-to-r from-red-50 to-green-50 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          LIKE Search vs Indexed Search
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Sin Optimizar</p>
                            <p className="text-lg font-bold text-red-600">
                              {formatTime(benchmarkResults[0].actualTimeMs)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Optimizado</p>
                            <p className="text-lg font-bold text-green-600">
                              {formatTime(benchmarkResults[2].actualTimeMs)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Mejora</p>
                            <p className="text-lg font-bold text-blue-600">
                              {(benchmarkResults[0].actualTimeMs / benchmarkResults[2].actualTimeMs).toFixed(1)}x más rápido
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Pie Chart de Distribución de Tiempo */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Distribución de Tiempo por Operación
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Porcentaje del tiempo total de ejecución por tipo de consulta
                  </p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={benchmarkResults.map((r) => ({
                            name: r.name,
                            value: Number(r.actualTimeMs.toFixed(2)),
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {benchmarkResults.map((entry, index) => {
                            const colors = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0284c7', '#7c3aed'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                          formatter={(value: any) => [`${value} ms`, 'Tiempo']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </>
            )}

            {/* Previous comparison section - remove duplicate */}
            {benchmarkResults.length >= 2 && false && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Análisis Comparativo
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Comparación entre métodos de consulta optimizados y no optimizados
                </p>
                <div className="space-y-4">
                  {/* Comparar LIKE vs Indexed Search */}
                  {benchmarkResults[0] && benchmarkResults[2] && (
                    <div className="p-4 bg-linear-to-r from-red-50 to-green-50 rounded-lg border">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        LIKE Search vs Indexed Search
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Sin Optimizar</p>
                          <p className="text-lg font-bold text-red-600">
                            {formatTime(benchmarkResults[0].actualTimeMs)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Optimizado</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatTime(benchmarkResults[2].actualTimeMs)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Mejora</p>
                          <p className="text-lg font-bold text-blue-600">
                            {(benchmarkResults[0].actualTimeMs / benchmarkResults[2].actualTimeMs).toFixed(1)}x más rápido
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Info Section */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                ℹ️ Sobre estos Benchmarks
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>Complejidad Teórica:</strong> Calculada usando análisis Big-O considerando:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>LIKE '%pattern%' → O(n × m) - Escaneo completo sin índices</li>
                  <li>Sequential Filter → O(n) - Escaneo de tabla completa</li>
                  <li>Indexed Search → O(log n) - Búsqueda binaria con índice B-tree</li>
                  <li>Full Text Search → O(log n + k) - Índice invertido + resultados</li>
                  <li>Aggregation → O(n) sin índice, O(1) con vista materializada</li>
                </ul>
                <p className="mt-3">
                  <strong>Tiempos Reales:</strong> Medidos contra Supabase PostgreSQL incluyendo:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Latencia de red (~5-50ms dependiendo de la ubicación)</li>
                  <li>Tiempo de procesamiento del servidor</li>
                  <li>Overhead de serialización JSON</li>
                  <li>Cache de PostgreSQL (puede mejorar consultas repetidas)</li>
                </ul>
              </div>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
