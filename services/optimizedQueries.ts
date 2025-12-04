import supabase from "./supabase";

export async function optimizedTextSearch(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  searchTerm: string
) {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";
  const textField = table === "personal_tx" ? "descripcion" : "concepto";

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(idField, userId)
    .textSearch(textField, searchTerm, {
      type: "websearch",
      config: "spanish",
    });

  return { data, error };
}

export async function optimizedFilterByType(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  tipo: "ingreso" | "gasto",
  dateFrom?: string,
  dateTo?: string
) {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  let query = supabase
    .from(table)
    .select("*")
    .eq(idField, userId)
    .eq("tipo", tipo);

  if (dateFrom) {
    query = query.gte("fecha", dateFrom);
  }
  if (dateTo) {
    query = query.lte("fecha", dateTo);
  }

  query = query.order("fecha", { ascending: false });

  const { data, error } = await query;
  return { data, error };
}

export async function optimizedAggregation(
  table: "personal_tx" | "company_tx",
  userId: string | number
) {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  const { data, error } = await supabase
    .from(table)
    .select("tipo, monto")
    .eq(idField, userId);

  if (error) return { data: null, error };

  const result = (data || []).reduce(
    (acc, row) => {
      if (row.tipo === "ingreso") {
        acc.totalIngresos += row.monto;
        acc.countIngresos++;
      } else {
        acc.totalGastos += row.monto;
        acc.countGastos++;
      }
      return acc;
    },
    {
      totalIngresos: 0,
      totalGastos: 0,
      countIngresos: 0,
      countGastos: 0,
    }
  );

  return {
    data: {
      ...result,
      balance: result.totalIngresos - result.totalGastos,
      avgIngreso: result.countIngresos > 0 ? result.totalIngresos / result.countIngresos : 0,
      avgGasto: result.countGastos > 0 ? result.totalGastos / result.countGastos : 0,
    },
    error: null,
  };
}

export async function optimizedCategorySearch(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  categories: string[]
) {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(idField, userId)
    .in("categoria", categories)
    .order("fecha", { ascending: false });

  return { data, error };
}

export async function optimizedPagination(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  page: number = 0,
  pageSize: number = 50
) {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";
  const offset = page * pageSize;

  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .eq(idField, userId)
    .order("fecha", { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data,
    error,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      hasNext: offset + pageSize < (count || 0),
      hasPrev: page > 0,
    },
  };
}

export async function optimizedDateRangeSearch(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  dateFrom: string,
  dateTo: string,
  tipo?: "ingreso" | "gasto"
) {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  let query = supabase
    .from(table)
    .select("*")
    .eq(idField, userId)
    .gte("fecha", dateFrom)
    .lte("fecha", dateTo);

  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  query = query.order("fecha", { ascending: false });

  const { data, error } = await query;
  return { data, error };
}

export async function optimizedMultiFilter(
  table: "personal_tx" | "company_tx",
  userId: string | number,
  filters: {
    tipo?: "ingreso" | "gasto";
    categorias?: string[];
    montoMin?: number;
    montoMax?: number;
    fechaDesde?: string;
    fechaHasta?: string;
  }
) {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  let query = supabase
    .from(table)
    .select("*")
    .eq(idField, userId);

  if (filters.tipo) {
    query = query.eq("tipo", filters.tipo);
  }

  if (filters.categorias && filters.categorias.length > 0) {
    query = query.in("categoria", filters.categorias);
  }

  if (filters.montoMin !== undefined) {
    query = query.gte("monto", filters.montoMin);
  }

  if (filters.montoMax !== undefined) {
    query = query.lte("monto", filters.montoMax);
  }

  if (filters.fechaDesde) {
    query = query.gte("fecha", filters.fechaDesde);
  }

  if (filters.fechaHasta) {
    query = query.lte("fecha", filters.fechaHasta);
  }

  query = query.order("fecha", { ascending: false });

  const { data, error } = await query;
  return { data, error };
}

export async function optimizedCategoryAggregation(
  table: "personal_tx" | "company_tx",
  userId: string | number
) {
  const idField = table === "personal_tx" ? "user_id" : "empresa_id";

  const { data, error } = await supabase
    .from(table)
    .select("categoria, tipo, monto")
    .eq(idField, userId);

  if (error) return { data: null, error };

  const categoryTotals = (data || []).reduce((acc: Record<string, any>, row) => {
    const cat = row.categoria || "Sin categoría";

    if (!acc[cat]) {
      acc[cat] = {
        categoria: cat,
        ingresos: 0,
        gastos: 0,
        total: 0,
        count: 0,
      };
    }

    if (row.tipo === "ingreso") {
      acc[cat].ingresos += row.monto;
    } else {
      acc[cat].gastos += row.monto;
    }

    acc[cat].total += row.monto;
    acc[cat].count++;

    return acc;
  }, {});

  return {
    data: Object.values(categoryTotals).sort((a: any, b: any) => b.total - a.total),
    error: null,
  };
}

const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; 

export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any; cached: boolean }> {
  const now = Date.now();
  const cached = queryCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return { data: cached.data, error: null, cached: true };
  }

  const result = await queryFn();

  if (!result.error && result.data) {
    queryCache.set(cacheKey, { data: result.data, timestamp: now });
  }

  return { ...result, cached: false };
}

export function clearQueryCache() {
  queryCache.clear();
}

export async function batchQueries<T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(queries.map(q => q()));
}
