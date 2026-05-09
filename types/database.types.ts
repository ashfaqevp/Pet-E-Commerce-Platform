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
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country: string
          created_at: string | null
          full_name: string
          id: string
          is_default: boolean
          phone: string
          postal_code: string
          state: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country: string
          created_at?: string | null
          full_name: string
          id?: string
          is_default?: boolean
          phone: string
          postal_code: string
          state: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_default?: boolean
          phone?: string
          postal_code?: string
          state?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          desktop: string
          id: string
          mobile: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          desktop: string
          id?: string
          mobile: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          desktop?: string
          id?: string
          mobile?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_thumbnail: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_thumbnail?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_thumbnail?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          customer_type: string | null
          delivered_at: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_status: string
          shipping_address: Json
          shipping_fee: number
          status: string
          subtotal: number
          tax: number
          total: number
          tran_ref: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          customer_type?: string | null
          delivered_at?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string
          shipping_address: Json
          shipping_fee?: number
          status?: string
          subtotal: number
          tax?: number
          total: number
          tran_ref?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          customer_type?: string | null
          delivered_at?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string
          shipping_address?: Json
          shipping_fee?: number
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          tran_ref?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pet_types: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_flavour_options: {
        Row: {
          created_at: string | null
          flavour: string
          is_active: boolean | null
        }
        Insert: {
          created_at?: string | null
          flavour: string
          is_active?: boolean | null
        }
        Update: {
          created_at?: string | null
          flavour?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      product_flavours: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id: string
          is_active?: boolean | null
          label: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          age: string | null
          base_product_id: string | null
          brand: string | null
          brand_id: string | null
          colour: string | null
          created_at: string | null
          default_rating: number
          description: string | null
          flavour: string | null
          id: string
          image_urls: string[] | null
          is_active: boolean | null
          is_featured: boolean
          label: string | null
          legacy_base_id: string | null
          legacy_id: string | null
          name: string
          pet_type: string[]
          product_type: string
          retail_price: number
          row_index: number | null
          size: string | null
          stock_quantity: number | null
          thumbnail_url: string | null
          unit: string | null
          updated_at: string | null
          wholesale_price: number | null
        }
        Insert: {
          age?: string | null
          base_product_id?: string | null
          brand?: string | null
          brand_id?: string | null
          colour?: string | null
          created_at?: string | null
          default_rating?: number
          description?: string | null
          flavour?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean
          label?: string | null
          legacy_base_id?: string | null
          legacy_id?: string | null
          name: string
          pet_type: string[]
          product_type: string
          retail_price: number
          row_index?: number | null
          size?: string | null
          stock_quantity?: number | null
          thumbnail_url?: string | null
          unit?: string | null
          updated_at?: string | null
          wholesale_price?: number | null
        }
        Update: {
          age?: string | null
          base_product_id?: string | null
          brand?: string | null
          brand_id?: string | null
          colour?: string | null
          created_at?: string | null
          default_rating?: number
          description?: string | null
          flavour?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean
          label?: string | null
          legacy_base_id?: string | null
          legacy_id?: string | null
          name?: string
          pet_type?: string[]
          product_type?: string
          retail_price?: number
          row_index?: number | null
          size?: string | null
          stock_quantity?: number | null
          thumbnail_url?: string | null
          unit?: string | null
          updated_at?: string | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_base_product_id_fkey"
            columns: ["base_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      products_backup: {
        Row: {
          age: string | null
          base_product_id: string | null
          brand: string | null
          created_at: string | null
          default_rating: number | null
          description: string | null
          flavour: string | null
          id: string | null
          image_urls: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          label: string | null
          legacy_base_id: string | null
          legacy_id: string | null
          name: string | null
          pet_type: string | null
          product_type: string | null
          retail_price: number | null
          row_index: number | null
          size: string | null
          stock_quantity: number | null
          thumbnail_url: string | null
          unit: string | null
          updated_at: string | null
          wholesale_price: number | null
        }
        Insert: {
          age?: string | null
          base_product_id?: string | null
          brand?: string | null
          created_at?: string | null
          default_rating?: number | null
          description?: string | null
          flavour?: string | null
          id?: string | null
          image_urls?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          label?: string | null
          legacy_base_id?: string | null
          legacy_id?: string | null
          name?: string | null
          pet_type?: string | null
          product_type?: string | null
          retail_price?: number | null
          row_index?: number | null
          size?: string | null
          stock_quantity?: number | null
          thumbnail_url?: string | null
          unit?: string | null
          updated_at?: string | null
          wholesale_price?: number | null
        }
        Update: {
          age?: string | null
          base_product_id?: string | null
          brand?: string | null
          created_at?: string | null
          default_rating?: number | null
          description?: string | null
          flavour?: string | null
          id?: string | null
          image_urls?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          label?: string | null
          legacy_base_id?: string | null
          legacy_id?: string | null
          name?: string | null
          pet_type?: string | null
          product_type?: string | null
          retail_price?: number | null
          row_index?: number | null
          size?: string | null
          stock_quantity?: number | null
          thumbnail_url?: string | null
          unit?: string | null
          updated_at?: string | null
          wholesale_price?: number | null
        }
        Relationships: []
      }
      products_import: {
        Row: {
          age: string | null
          brand: string | null
          created_at: string | null
          default_rating: string | null
          description: string | null
          flavour: string | null
          image_urls: string | null
          is_active: string | null
          is_featured: string | null
          label: string | null
          legacy_base_id: string | null
          legacy_id: string | null
          name: string | null
          pet_type: string | null
          product_type: string | null
          retail_price: string | null
          row_index: string | null
          size: string | null
          stock_quantity: string | null
          thumbnail_url: string | null
          unit: string | null
          updated_at: string | null
          wholesale_price: string | null
        }
        Insert: {
          age?: string | null
          brand?: string | null
          created_at?: string | null
          default_rating?: string | null
          description?: string | null
          flavour?: string | null
          image_urls?: string | null
          is_active?: string | null
          is_featured?: string | null
          label?: string | null
          legacy_base_id?: string | null
          legacy_id?: string | null
          name?: string | null
          pet_type?: string | null
          product_type?: string | null
          retail_price?: string | null
          row_index?: string | null
          size?: string | null
          stock_quantity?: string | null
          thumbnail_url?: string | null
          unit?: string | null
          updated_at?: string | null
          wholesale_price?: string | null
        }
        Update: {
          age?: string | null
          brand?: string | null
          created_at?: string | null
          default_rating?: string | null
          description?: string | null
          flavour?: string | null
          image_urls?: string | null
          is_active?: string | null
          is_featured?: string | null
          label?: string | null
          legacy_base_id?: string | null
          legacy_id?: string | null
          name?: string | null
          pet_type?: string | null
          product_type?: string | null
          retail_price?: string | null
          row_index?: string | null
          size?: string | null
          stock_quantity?: string | null
          thumbnail_url?: string | null
          unit?: string | null
          updated_at?: string | null
          wholesale_price?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_config: {
        Row: {
          created_at: string | null
          free_shipping_min_amount: number
          id: string
          shipping_fee: number
          tax_rate: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          free_shipping_min_amount?: number
          id?: string
          shipping_fee?: number
          tax_rate?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          free_shipping_min_amount?: number
          id?: string
          shipping_fee?: number
          tax_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_profiles_view: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          role: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
