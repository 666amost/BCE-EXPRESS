export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      shipments: {
        Row: {
          awb_number: string
          sender_name: string
          sender_address: string
          sender_phone: string
          receiver_name: string
          receiver_address: string
          receiver_phone: string
          weight: number
          dimensions: string
          service_type: string
          current_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          awb_number: string
          sender_name: string
          sender_address: string
          sender_phone: string
          receiver_name: string
          receiver_address: string
          receiver_phone: string
          weight: number
          dimensions: string
          service_type: string
          current_status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          awb_number?: string
          sender_name?: string
          sender_address?: string
          sender_phone?: string
          receiver_name?: string
          receiver_address?: string
          receiver_phone?: string
          weight?: number
          dimensions?: string
          service_type?: string
          current_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      shipment_history: {
        Row: {
          id: string
          awb_number: string
          status: string
          location: string
          notes: string | null
          photo_url: string | null
          created_at: string
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          id?: string
          awb_number: string
          status: string
          location: string
          notes?: string | null
          photo_url?: string | null
          created_at?: string
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          id?: string
          awb_number?: string
          status?: string
          location?: string
          notes?: string | null
          photo_url?: string | null
          created_at?: string
          latitude?: number | null
          longitude?: number | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          created_at?: string
        }
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
  }
}
