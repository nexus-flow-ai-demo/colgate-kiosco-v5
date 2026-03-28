export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
  }
}
