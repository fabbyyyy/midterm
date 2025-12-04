export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          id: number
          name: string | null
        }
        Insert: {
          id: number
          name?: string | null
        }
        Update: {
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          domain: Database["public"]["Enums"]["category_domain"]
          id: number
          name: string
        }
        Insert: {
          domain?: Database["public"]["Enums"]["category_domain"]
          id?: number
          name: string
        }
        Update: {
          domain?: Database["public"]["Enums"]["category_domain"]
          id?: number
          name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string | null
        }
        Insert: {
          id: string
          name?: string | null
        }
        Update: {
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      company_tx: {
        Row: {
          categoria: string | null
          category_id: number | null
          concepto: string | null
          created_at: string
          currency: string
          empresa_id: string
          fecha: string
          id: number
          monto: number
          tipo: Database["public"]["Enums"]["tx_type"]
        }
        Insert: {
          categoria?: string | null
          category_id?: number | null
          concepto?: string | null
          created_at?: string
          currency?: string
          empresa_id: string
          fecha: string
          id?: number
          monto: number
          tipo: Database["public"]["Enums"]["tx_type"]
        }
        Update: {
          categoria?: string | null
          category_id?: number | null
          concepto?: string | null
          created_at?: string
          currency?: string
          empresa_id?: string
          fecha?: string
          id?: number
          monto?: number
          tipo?: Database["public"]["Enums"]["tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "company_tx_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tx_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_tx: {
        Row: {
          categoria: string | null
          category_id: number | null
          created_at: string
          currency: string
          descripcion: string | null
          fecha: string
          id: number
          monto: number
          tipo: Database["public"]["Enums"]["tx_type"]
          user_id: number
        }
        Insert: {
          categoria?: string | null
          category_id?: number | null
          created_at?: string
          currency?: string
          descripcion?: string | null
          fecha: string
          id?: number
          monto: number
          tipo: Database["public"]["Enums"]["tx_type"]
          user_id: number
        }
        Update: {
          categoria?: string | null
          category_id?: number | null
          created_at?: string
          currency?: string
          descripcion?: string | null
          fecha?: string
          id?: number
          monto?: number
          tipo?: Database["public"]["Enums"]["tx_type"]
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_tx_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_tx_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_company_kpis: {
        Row: {
          empresa_id: string | null
          g_costos: number | null
          g_infra: number | null
          g_marketing: number | null
          g_personal: number | null
          g_servicios: number | null
          gastos: number | null
          ingresos: number | null
          ingresos_mom_pct: number | null
          margen_neto_pct: number | null
          month: string | null
          pct_infra: number | null
          pct_marketing: number | null
          pct_personal: number | null
          utilidad_neta: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_tx_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_company_monthly: {
        Row: {
          empresa_id: string | null
          g_costos: number | null
          g_infra: number | null
          g_marketing: number | null
          g_personal: number | null
          g_servicios: number | null
          gastos: number | null
          ingresos: number | null
          month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_tx_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decisions_company_fn: {
        Args: { p_company: string; p_from: string; p_to: string }
        Returns: Json
      }
      kpi_company_fn: {
        Args: { p_company: string; p_from: string; p_to: string }
        Returns: {
          gastos: number
          ingresos: number
          ingresos_mom_pct: number
          margen_neto_pct: number
          month: string
          pct_infra: number
          pct_marketing: number
          pct_personal: number
          utilidad_neta: number
        }[]
      }
      whatif_company_fn: {
        Args: {
          p_company: string
          p_from: string
          p_params: Json
          p_to: string
        }
        Returns: Json
      }
    }
    Enums: {
      category_domain: "empresa" | "personal" | "comun"
      tx_type: "ingreso" | "gasto"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      category_domain: ["empresa", "personal", "comun"],
      tx_type: ["ingreso", "gasto"],
    },
  },
} as const
