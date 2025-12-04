import supabase from "./supabase";
import { Tables } from "./supabasaTypes";

type CompanyTransaction = Tables<"company_tx">;

async function getCompanyExpenses(companyId: string) {
  const { data, error } = await supabase
    .from("company_tx")
    .select("*")
    .eq("empresa_id", companyId)
    .order("fecha", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function getCompanyExpensesByCategory(companyId: string) {
  const { data, error } = await supabase
    .from("company_tx")
    .select(
      `
            monto,
            tipo,
            categoria
        `
    )
    .eq("empresa_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  // Agrupar por categoría
  const groupedExpenses = data?.reduce((acc, expense) => {
    const category = expense.categoria || "Sin categoría";
    if (!acc[category]) {
      acc[category] = { ingresos: 0, gastos: 0 };
    }

    if (expense.tipo === "ingreso") {
      acc[category].ingresos += expense.monto;
    } else {
      acc[category].gastos += expense.monto;
    }

    return acc;
  }, {} as Record<string, { ingresos: number; gastos: number }>);

  return groupedExpenses;
}

async function getMonthlyExpenseSummary(companyId: string) {
  const { data, error } = await supabase
    .from("company_tx")
    .select("*")
    .eq("empresa_id", companyId)
    .gte(
      "fecha",
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    );

  if (error) {
    throw new Error(error.message);
  }

  const summary = data?.reduce(
    (acc, tx) => {
      if (tx.tipo === "ingreso") {
        acc.totalIngresos += tx.monto;
      } else {
        acc.totalGastos += tx.monto;
      }
      return acc;
    },
    { totalIngresos: 0, totalGastos: 0 }
  );

  return {
    ...summary,
    balance: summary ? summary.totalIngresos - summary.totalGastos : 0,
  };
}

async function getCompanyExpense(companyId?: string) {
  let query = supabase.from("company_tx").select();

  if (companyId) {
    query = query.eq("empresa_id", companyId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export {
  getCompanyExpenses,
  getCompanyExpensesByCategory,
  getMonthlyExpenseSummary,
  getCompanyExpense,
  type CompanyTransaction,
};
