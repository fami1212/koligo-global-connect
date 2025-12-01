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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_resource_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_resource_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_resource_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_conversations: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          status: string | null
          subject: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "admin_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          delivery_completed_at: string | null
          final_price: number
          id: string
          match_request_id: string
          payment_status: string | null
          pickup_completed_at: string | null
          sender_id: string
          shipment_id: string
          traveler_amount: number | null
          traveler_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          delivery_completed_at?: string | null
          final_price: number
          id?: string
          match_request_id: string
          payment_status?: string | null
          pickup_completed_at?: string | null
          sender_id: string
          shipment_id: string
          traveler_amount?: number | null
          traveler_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          delivery_completed_at?: string | null
          final_price?: number
          id?: string
          match_request_id?: string
          payment_status?: string | null
          pickup_completed_at?: string | null
          sender_id?: string
          shipment_id?: string
          traveler_amount?: number | null
          traveler_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_match_request_id_fkey"
            columns: ["match_request_id"]
            isOneToOne: false
            referencedRelation: "match_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_type: string
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          status: string
        }
        Insert: {
          call_type?: string
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          status?: string
        }
        Update: {
          call_type?: string
          callee_id?: string
          caller_id?: string
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          sender_id: string
          traveler_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          sender_id: string
          traveler_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          traveler_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assignment_id: string
          complainant_id: string
          created_at: string
          description: string
          id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          respondent_id: string
          status: Database["public"]["Enums"]["dispute_status"] | null
          type: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          complainant_id: string
          created_at?: string
          description: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          respondent_id: string
          status?: Database["public"]["Enums"]["dispute_status"] | null
          type: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          complainant_id?: string
          created_at?: string
          description?: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          respondent_id?: string
          status?: Database["public"]["Enums"]["dispute_status"] | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          document_url: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      match_requests: {
        Row: {
          confirmed_at: string | null
          created_at: string
          estimated_price: number
          final_price: number | null
          id: string
          message: string | null
          notes: string | null
          sender_id: string
          shipment_id: string
          status: string | null
          traveler_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          estimated_price: number
          final_price?: number | null
          id?: string
          message?: string | null
          notes?: string | null
          sender_id: string
          shipment_id: string
          status?: string | null
          traveler_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          estimated_price?: number
          final_price?: number | null
          id?: string
          message?: string | null
          notes?: string | null
          sender_id?: string
          shipment_id?: string
          status?: string | null
          traveler_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_requests_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_type: string | null
          image_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_type?: string | null
          image_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_type?: string | null
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          delivery_date: string
          expires_at: string
          id: string
          message: string | null
          pickup_date: string
          proposed_price: number
          sender_id: string
          shipment_id: string
          status: string
          traveler_id: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_date: string
          expires_at?: string
          id?: string
          message?: string | null
          pickup_date: string
          proposed_price: number
          sender_id: string
          shipment_id: string
          status?: string
          traveler_id: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_date?: string
          expires_at?: string
          id?: string
          message?: string | null
          pickup_date?: string
          proposed_price?: number
          sender_id?: string
          shipment_id?: string
          status?: string
          traveler_id?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          assignment_id: string
          created_at: string
          currency: string | null
          id: string
          status: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          assignment_id: string
          created_at?: string
          currency?: string | null
          id?: string
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          assignment_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_reports: {
        Row: {
          assignment_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          id_type: string | null
          id_validity_date: string | null
          is_verified: boolean | null
          last_name: string | null
          phone: string | null
          rating: number | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          verification_approved_at: string | null
          verification_approved_by: string | null
          verification_requested_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          id_type?: string | null
          id_validity_date?: string | null
          is_verified?: boolean | null
          last_name?: string | null
          phone?: string | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          verification_approved_at?: string | null
          verification_approved_by?: string | null
          verification_requested_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          id_type?: string | null
          id_validity_date?: string | null
          is_verified?: boolean | null
          last_name?: string | null
          phone?: string | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          verification_approved_at?: string | null
          verification_approved_by?: string | null
          verification_requested_at?: string | null
        }
        Relationships: []
      }
      proof_of_delivery: {
        Row: {
          assignment_id: string
          delivered_at: string
          delivered_by: string
          delivery_notes: string | null
          delivery_photo_url: string
          id: string
          recipient_name: string
          signature_data: string | null
        }
        Insert: {
          assignment_id: string
          delivered_at?: string
          delivered_by: string
          delivery_notes?: string | null
          delivery_photo_url: string
          id?: string
          recipient_name: string
          signature_data?: string | null
        }
        Update: {
          assignment_id?: string
          delivered_at?: string
          delivered_by?: string
          delivery_notes?: string | null
          delivery_photo_url?: string
          id?: string
          recipient_name?: string
          signature_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_delivery_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          assignment_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          assignment_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          assignment_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          created_at: string
          delivery_address: string
          delivery_city: string
          delivery_contact_name: string
          delivery_contact_phone: string
          delivery_country: string
          description: string | null
          estimated_value: number | null
          id: string
          photos: string[] | null
          pickup_address: string
          pickup_city: string
          pickup_contact_name: string
          pickup_contact_phone: string
          pickup_country: string
          sender_id: string
          special_instructions: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          title: string
          updated_at: string
          volume_m3: number | null
          weight_kg: number
        }
        Insert: {
          created_at?: string
          delivery_address: string
          delivery_city: string
          delivery_contact_name: string
          delivery_contact_phone: string
          delivery_country: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          photos?: string[] | null
          pickup_address: string
          pickup_city: string
          pickup_contact_name: string
          pickup_contact_phone: string
          pickup_country: string
          sender_id: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          title: string
          updated_at?: string
          volume_m3?: number | null
          weight_kg: number
        }
        Update: {
          created_at?: string
          delivery_address?: string
          delivery_city?: string
          delivery_contact_name?: string
          delivery_contact_phone?: string
          delivery_country?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          photos?: string[] | null
          pickup_address?: string
          pickup_city?: string
          pickup_contact_name?: string
          pickup_contact_phone?: string
          pickup_country?: string
          sender_id?: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          title?: string
          updated_at?: string
          volume_m3?: number | null
          weight_kg?: number
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          assignment_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          photo_url: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          photo_url?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          arrival_actual: string | null
          arrival_city: string
          arrival_country: string
          arrival_date: string | null
          available_weight_kg: number
          created_at: string
          currency: string
          delivery_address: string | null
          departure_actual: string | null
          departure_city: string
          departure_country: string
          departure_date: string
          description: string | null
          id: string
          is_active: boolean | null
          last_deposit_date: string | null
          max_volume_m3: number | null
          max_weight_kg: number
          pickup_address: string | null
          pickup_time_limit: string
          price_per_kg: number
          status: string | null
          ticket_proof_url: string | null
          transport_type: string
          traveler_id: string
          updated_at: string
        }
        Insert: {
          arrival_actual?: string | null
          arrival_city: string
          arrival_country: string
          arrival_date?: string | null
          available_weight_kg: number
          created_at?: string
          currency?: string
          delivery_address?: string | null
          departure_actual?: string | null
          departure_city: string
          departure_country: string
          departure_date: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_deposit_date?: string | null
          max_volume_m3?: number | null
          max_weight_kg: number
          pickup_address?: string | null
          pickup_time_limit?: string
          price_per_kg: number
          status?: string | null
          ticket_proof_url?: string | null
          transport_type: string
          traveler_id: string
          updated_at?: string
        }
        Update: {
          arrival_actual?: string | null
          arrival_city?: string
          arrival_country?: string
          arrival_date?: string | null
          available_weight_kg?: number
          created_at?: string
          currency?: string
          delivery_address?: string | null
          departure_actual?: string | null
          departure_city?: string
          departure_country?: string
          departure_date?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_deposit_date?: string | null
          max_volume_m3?: number | null
          max_weight_kg?: number
          pickup_address?: string | null
          pickup_time_limit?: string
          price_per_kg?: number
          status?: string | null
          ticket_proof_url?: string | null
          transport_type?: string
          traveler_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deactivate_expired_trips: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_trip_status: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "sender" | "traveler"
      delivery_status:
        | "pending"
        | "accepted"
        | "in_transit"
        | "delivered"
        | "cancelled"
      dispute_status: "open" | "investigating" | "resolved" | "closed"
      kyc_status: "pending" | "approved" | "rejected"
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
  public: {
    Enums: {
      app_role: ["admin", "sender", "traveler"],
      delivery_status: [
        "pending",
        "accepted",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      dispute_status: ["open", "investigating", "resolved", "closed"],
      kyc_status: ["pending", "approved", "rejected"],
    },
  },
} as const
