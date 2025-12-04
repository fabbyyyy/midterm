import supabase from "./supabase";
import { Tables } from "./supabasaTypes";

type AppUser = Tables<"app_users">;
type Company = Tables<"companies">;

export interface AuthResult {
  success: boolean;
  user?: {
    type: "personal" | "empresa";
    id: string;
    name: string;
  };
  error?: string;
}

export async function authenticatePersonalUser(
  userId: string,
  name: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("id", parseInt(userId))
      .single();

    if (error) {
      return {
        success: false,
        error: "Usuario no encontrado",
      };
    }

    // Verificar que el nombre coincida (case insensitive)
    if (data.name?.toLowerCase().trim() !== name.toLowerCase().trim()) {
      return {
        success: false,
        error: "Nombre incorrecto",
      };
    }

    return {
      success: true,
      user: {
        type: "personal",
        id: data.id.toString(),
        name: data.name || "Usuario",
      },
    };
  } catch (error) {
    console.error("Error authenticating personal user:", error);
    return {
      success: false,
      error: "Error de conexión",
    };
  }
}

export async function authenticateCompanyUser(
  companyId: string,
  name: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error) {
      return {
        success: false,
        error: "Empresa no encontrada",
      };
    }

    // Verificar que el nombre coincida (case insensitive)
    if (data.name?.toLowerCase().trim() !== name.toLowerCase().trim()) {
      return {
        success: false,
        error: "Nombre de empresa incorrecto",
      };
    }

    return {
      success: true,
      user: {
        type: "empresa",
        id: data.id,
        name: data.name || "Empresa",
      },
    };
  } catch (error) {
    console.error("Error authenticating company user:", error);
    return {
      success: false,
      error: "Error de conexión",
    };
  }
}

export async function getAllPersonalUsers(): Promise<AppUser[]> {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("id");

    if (error) {
      console.error("Error fetching personal users:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching personal users:", error);
    return [];
  }
}

export async function getAllCompanies(): Promise<Company[]> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("id");

    if (error) {
      console.error("Error fetching companies:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching companies:", error);
    return [];
  }
}
