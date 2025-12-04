"use client";

import React, { useEffect, useState } from "react";
import { Check, ChevronDown, Plus, Trash2, Search, AlertTriangle, X } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tables } from "@/services/supabasaTypes";
import supabase from "@/services/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AhoCorasick } from '@/lib/aho-corasick';
import { DuplicateDetector } from '@/lib/duplicate-detector';

type PersonalTransaction = Tables<"personal_tx">;
type CompanyTransaction = Tables<"company_tx">;
type Transaction = PersonalTransaction | CompanyTransaction;

interface AnalysisResult {
  type: 'patterns' | 'duplicates';
  count: number;
  time: number;
  details?: any[];
}

export default function DatabasePage() {
  const [userType, setUserType] = useState<"personal" | "company">("personal");
  const [userId, setUserId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ingreso" | "gasto">("all");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [categories, setCategories] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [patternMatches, setPatternMatches] = useState<Map<number, string[]>>(new Map());
  const [analysisTime, setAnalysisTime] = useState<number>(0);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    tipo: "gasto" as "ingreso" | "gasto",
    monto: "",
    fecha: new Date().toISOString().split('T')[0],
    categoria: "",
    descripcion: "",
    concepto: "",
  });

  useEffect(() => {
    const storedUserType = sessionStorage.getItem("userType") as "personal" | "company";
    const storedUserId = sessionStorage.getItem("userId");
    
    if (!storedUserType || !storedUserId) {
      window.location.href = "/login";
      return;
    }

    setUserType(storedUserType);
    setUserId(storedUserId);

    fetchTransactions(storedUserType, storedUserId);
  }, []);

  useEffect(() => {
    const uniqueCategories = [...new Set(
      transactions
        .map(tx => tx.categoria)
        .filter((cat): cat is string => typeof cat === 'string' && cat !== null)
    )];
    setCategories(uniqueCategories);
  }, [transactions]);

  const fetchTransactions = async (type: "personal" | "company", id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const table = type === "personal" ? "personal_tx" : "company_tx";
      const idField = type === "personal" ? "user_id" : "empresa_id";

      const { data, error } = await supabase
        .from(table)
        .select("*, categories(name)")
        .eq(idField, type === "personal" ? parseInt(id) : id)
        .order("fecha", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Error al cargar las transacciones");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    try {
      const table = userType === "personal" ? "personal_tx" : "company_tx";
      
      let transactionData: any = {
        tipo: newTransaction.tipo,
        monto: parseFloat(newTransaction.monto),
        fecha: newTransaction.fecha,
        categoria: newTransaction.categoria || null,
        currency: "MXN",
      };

      if (userType === "personal") {
        transactionData.user_id = parseInt(userId);
        transactionData.descripcion = newTransaction.descripcion || null;
      } else {
        transactionData.empresa_id = userId;
        transactionData.concepto = newTransaction.concepto || null;
      }

      const { data, error } = await supabase
        .from(table)
        .insert([transactionData])
        .select();

      if (error) throw error;

      // Refresh transactions
      await fetchTransactions(userType, userId);
      
      // Reset form
      setNewTransaction({
        tipo: "gasto",
        monto: "",
        fecha: new Date().toISOString().split('T')[0],
        categoria: "",
        descripcion: "",
        concepto: "",
      });
      setIsAddingTransaction(false);
    } catch (err) {
      console.error("Error adding transaction:", err);
      alert("Error al agregar la transacción");
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta transacción?")) {
      return;
    }

    try {
      const table = userType === "personal" ? "personal_tx" : "company_tx";
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh transactions
      await fetchTransactions(userType, userId);
    } catch (err) {
      console.error("Error deleting transaction:", err);
      alert("Error al eliminar la transacción");
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter !== "all" && tx.tipo !== filter) return false;
    if (categoryFilter.length === 0) return true;
    return tx.categoria && categoryFilter.includes(tx.categoria);
  }).sort((a, b) => {
    const dateA = new Date(a.fecha).getTime();
    const dateB = new Date(b.fecha).getTime();
    
    if (sortOrder === "desc") {
      return dateB - dateA; // Más recientes primero
    } else {
      return dateA - dateB;
    }
  });

  const detectDuplicates = async () => {
    const startTime = performance.now();
    
    try {
      const detector = new DuplicateDetector({
        textSimilarityThreshold: 0.85,
        amountTolerancePercent: 0.02,
        dateDifferenceMaxDays: 3
      });

      const txWithText = transactions.map(tx => ({
        id: tx.id,
        descripcion: (tx as any).descripcion || (tx as any).concepto,
        monto: tx.monto,
        fecha: tx.fecha,
        categoria: tx.categoria || undefined,
        tipo: tx.tipo
      }));

      const found = detector.detectDuplicates(txWithText);
      setDuplicates(found);
      
      const endTime = performance.now();
      setAnalysisTime(endTime - startTime);
      
      setAnalysisResult({
        type: 'duplicates',
        count: found.length,
        time: endTime - startTime,
        details: found
      });
      setShowAnalysisPopup(true);
    } catch (err) {
      console.error('Error detecting duplicates:', err);
      alert('Error al detectar duplicados');
    }
  };

  const searchPatterns = async () => {
    const startTime = performance.now();
    
    try {
      const patterns = [
        'netflix', 'spotify', 'uber', 'amazon', 'mercadolibre',
        'rappi', 'starbucks', 'oxxo', 'walmart', 'liverpool',
        'telefonica', 'telmex', 'cfe', 'agua', 'gas'
      ];

      const ac = new AhoCorasick();
      ac.addPatterns(patterns);
      ac.build();

      const matches = new Map<number, string[]>();
      const matchedTransactions: any[] = [];
      
      transactions.forEach(tx => {
        const text = ((tx as any).descripcion || (tx as any).concepto || '').toLowerCase();
        const found = ac.getMatchedPatterns(text);
        if (found.length > 0) {
          matches.set(tx.id, found);
          matchedTransactions.push({
            transaction: tx,
            patterns: found
          });
        }
      });

      setPatternMatches(matches);

      const endTime = performance.now();
      setAnalysisTime(endTime - startTime);
      
      setAnalysisResult({
        type: 'patterns',
        count: matches.size,
        time: endTime - startTime,
        details: matchedTransactions
      });
      setShowAnalysisPopup(true);
    } catch (err) {
      console.error('Error searching patterns:', err);
      alert('Error al buscar patrones');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(prev => {
      const isSelected = prev.includes(category);
      if (isSelected) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const getFilterDisplayText = () => {
    if (categoryFilter.length === 0) return "Todas las categorías";
    if (categoryFilter.length === 1) return categoryFilter[0];
    return `${categoryFilter.length} categorías seleccionadas`;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <DashboardSidebar userType={userType} userId={userId} />
        
        <SidebarInset className="flex-1 w-full">
          {/* Header - Fixed at top */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 bg-white">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-gray-300 mx-2" />
            <h1 className="text-xl font-semibold text-gray-900">
              Transacciones {userType === "personal" ? "Personales" : "Empresariales"}
            </h1>
          </header>

          {/* Main Container - Takes remaining height */}
          <div className="h-[calc(100vh-4rem)] bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              {/* Add Transaction Card */}
              <Card className="bg-white mb-4">
                <div className="p-4">
                  {!isAddingTransaction ? (
                    <Button 
                      onClick={() => setIsAddingTransaction(true)}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Nueva Transacción
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Nueva Transacción</h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setIsAddingTransaction(false)}
                        >
                          Cancelar
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select
                            value={newTransaction.tipo}
                            onValueChange={(value: "ingreso" | "gasto") => 
                              setNewTransaction({...newTransaction, tipo: value})
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ingreso">Ingreso</SelectItem>
                              <SelectItem value="gasto">Gasto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="monto">Monto</Label>
                          <Input
                            id="monto"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newTransaction.monto}
                            onChange={(e) => setNewTransaction({...newTransaction, monto: e.target.value})}
                          />
                        </div>

                        <div>
                          <Label htmlFor="fecha">Fecha</Label>
                          <Input
                            id="fecha"
                            type="date"
                            value={newTransaction.fecha}
                            onChange={(e) => setNewTransaction({...newTransaction, fecha: e.target.value})}
                          />
                        </div>

                        <div>
                          <Label htmlFor="categoria">Categoría</Label>
                          <Select
                            value={newTransaction.categoria}
                            onValueChange={(value: string) => 
                              setNewTransaction({...newTransaction, categoria: value})
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="descripcion">
                            {userType === "personal" ? "Descripción" : "Concepto"}
                          </Label>
                          <Input
                            id="descripcion"
                            placeholder={userType === "personal" ? "Descripción de la transacción" : "Concepto de la transacción"}
                            value={userType === "personal" ? newTransaction.descripcion : newTransaction.concepto}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              if (userType === "personal") {
                                setNewTransaction({...newTransaction, descripcion: e.target.value});
                              } else {
                                setNewTransaction({...newTransaction, concepto: e.target.value});
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={handleAddTransaction}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                          disabled={!newTransaction.monto || parseFloat(newTransaction.monto) <= 0}
                        >
                          Guardar Transacción
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="mb-4">
                <div className="p-4 bg-white">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex flex-wrap gap-4 items-center flex-1">
                      <Select 
                        value={filter} 
                        onValueChange={(value: "all" | "ingreso" | "gasto") => setFilter(value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="ingreso">Ingresos</SelectItem>
                          <SelectItem value="gasto">Gastos</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={categoryFilter.length === 0 ? 'all' : categoryFilter[0]}
                        onValueChange={(value: string) => {
                          if (value === 'all') {
                            setCategoryFilter([]);
                          } else {
                            handleCategoryChange(value);
                          }
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue>
                            {getFilterDisplayText()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" hideCheckmark>
                            Todas las categorías
                          </SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat} hideCheckmark>
                              <div className="flex items-center gap-2">
                                {categoryFilter.includes(cat) && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                                <span>{cat}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={sortOrder} 
                        onValueChange={(value: "desc" | "asc") => setSortOrder(value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Más recientes</SelectItem>
                          <SelectItem value="asc">Más antiguos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={searchPatterns} 
                        variant="secondary"
                        size="sm"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Buscar Patrones
                      </Button>
                      <Button 
                        onClick={detectDuplicates} 
                        variant="secondary"
                        size="sm"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Detectar Duplicados
                      </Button>
                    </div>

                    <div className="w-full flex gap-2 flex-wrap mt-2">
                      {filter !== "all" && (
                        <Badge variant="outline" className="capitalize bg-gray-100">
                          {filter}s
                        </Badge>
                      )}
                      {categoryFilter.map(cat => (
                        <Badge 
                          key={cat}
                          variant="outline" 
                          className="bg-gray-100 cursor-pointer"
                          onClick={() => handleCategoryChange(cat)}
                        >
                          {cat} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Transactions List */}
              <Card className="flex-1 relative">
                <div className="absolute inset-0 overflow-y-auto">
                  <div className="p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Cargando transacciones...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center min-h-[400px] text-red-600">
                      {error}
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[400px] text-gray-600">
                      {transactions.length === 0 
                        ? "No hay transacciones disponibles."
                        : "No hay resultados para los filtros seleccionados."}
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {filteredTransactions.map((tx: any) => (
                        <div
                          key={tx.id}
                          className={`bg-white rounded-lg shadow-sm border p-4 transition-all hover:shadow-md ${
                            tx.tipo === "ingreso" ? "border-green-100" : "border-red-100"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                                  tx.tipo === "ingreso" 
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {tx.tipo === "ingreso" ? "Ingreso" : "Gasto"}
                                </span>
                                {tx.categoria && (
                                  <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                    {tx.categoria}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-900 font-medium">
                                {userType === "company" ? tx.concepto : tx.descripcion || "Sin descripción"}
                              </p>
                              <p className="text-sm text-gray-500">{formatDate(tx.fecha)}</p>
                              
                              {patternMatches.has(tx.id) && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {patternMatches.get(tx.id)?.map((pattern, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      🔍 {pattern}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {duplicates.some(dup => 
                                dup.transaction1.id === tx.id || dup.transaction2.id === tx.id
                              ) && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  ⚠️ Posible duplicado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-lg font-bold ${
                                tx.tipo === "ingreso" ? "text-green-600" : "text-red-600"
                              }`}>
                                {tx.tipo === "ingreso" ? "+" : "-"}{formatCurrency(tx.monto)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                                      )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>

      {showAnalysisPopup && analysisResult && (
        <div className="fixed inset-0 bg-white bg-opacity-60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border-2">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {analysisResult.type === 'patterns' ? (
                      <>
                        <Search className="h-5 w-5 text-blue-600" />
                        Patrones Encontrados
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Duplicados Detectados
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Se encontraron {analysisResult.count} {analysisResult.type === 'patterns' ? 'transacciones con patrones' : 'posibles duplicados'} en {analysisResult.time.toFixed(2)}ms
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnalysisPopup(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto max-h-[60vh]">
              {analysisResult.type === 'patterns' ? (
                <div className="space-y-4">
                  {analysisResult.details?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {(item.transaction as any).descripcion || (item.transaction as any).concepto}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(item.transaction.monto)} • {formatDate(item.transaction.fecha)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.patterns.map((pattern: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            🔍 {pattern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {analysisResult.details?.slice(0, 10).map((dup: any, idx: number) => (
                    <div key={idx} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={dup.confidence === 'high' ? 'destructive' : 'secondary'}>
                          Confianza: {dup.confidence === 'high' ? 'Alta' : dup.confidence === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          Similitud: {(dup.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div className="bg-white p-3 rounded">
                          <p className="font-semibold">{dup.transaction1.descripcion}</p>
                          <p className="text-gray-600">{formatCurrency(dup.transaction1.monto)}</p>
                          <p className="text-xs text-gray-500">{formatDate(dup.transaction1.fecha)}</p>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <p className="font-semibold">{dup.transaction2.descripcion}</p>
                          <p className="text-gray-600">{formatCurrency(dup.transaction2.monto)}</p>
                          <p className="text-xs text-gray-500">{formatDate(dup.transaction2.fecha)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {dup.reasons.map((reason: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {analysisResult.details && analysisResult.details.length > 10 && (
                    <p className="text-center text-sm text-gray-500">
                      Mostrando 10 de {analysisResult.details.length} duplicados encontrados
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </SidebarProvider>
  );
}