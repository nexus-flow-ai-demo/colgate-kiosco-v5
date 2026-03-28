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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          is_raffle_active: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          is_raffle_active?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          is_raffle_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      v5_leads: {
        Row: {
          created_at: string
          id: string
          interest: string | null
          name: string
          payment_ref: string | null
          phone: string | null
          source: string | null
          status: string | null
          ticket_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interest?: string | null
          name: string
          payment_ref?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          ticket_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interest?: string | null
          name?: string
          payment_ref?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          ticket_code?: string | null
        }
        Relationships: []
      }
      v5_client_interactions: {
        Row: {
          created_at: string
          id: string
          kiosk_code: string
          interaction_type: 'voice' | 'touch'
          identified_need: string
          product_recommended: string
          session_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          kiosk_code: string
          interaction_type: 'voice' | 'touch'
          identified_need: string
          product_recommended: string
          session_status: string
        }
        Update: {
          created_at?: string
          id?: string
          kiosk_code?: string
          interaction_type?: 'voice' | 'touch'
          identified_need?: string
          product_recommended?: string
          session_status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, keyof Database['public']>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : keyof PublicSchema['Tables'],
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]
  : PublicSchema['Tables'][TableName]

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : keyof PublicSchema['Tables'],
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]['Insert']
  : PublicSchema['Tables'][TableName]['Insert']

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : keyof PublicSchema['Tables'],
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName]['Update']
  : PublicSchema['Tables'][TableName]['Update']

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : keyof PublicSchema['Enums'],
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicSchema['Enums'][EnumName]
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
  public: {
    Enums: {},
  },
} as const
