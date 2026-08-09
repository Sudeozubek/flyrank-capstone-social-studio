export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ai_usage_records: {
        Row: {
          created_at: string;
          estimated_usd: number;
          feature: string;
          id: string;
          input_tokens: number;
          model: string;
          output_tokens: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          estimated_usd: number;
          feature: string;
          id?: string;
          input_tokens?: number;
          model: string;
          output_tokens?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          estimated_usd?: number;
          feature?: string;
          id?: string;
          input_tokens?: number;
          model?: string;
          output_tokens?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          source: Database["public"]["Enums"]["post_source"];
          title: string;
          updated_at: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          source?: Database["public"]["Enums"]["post_source"];
          title: string;
          updated_at?: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          source?: Database["public"]["Enums"]["post_source"];
          title?: string;
          updated_at?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          brand_name: string | null;
          brand_tone: string | null;
          brand_language: string | null;
          created_at: string;
          id: string;
          name: string;
          post_id: string;
          scheduled_for: string | null;
          status: Database["public"]["Enums"]["campaign_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          brand_name?: string | null;
          brand_tone?: string | null;
          brand_language?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          post_id: string;
          scheduled_for?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          brand_name?: string | null;
          brand_tone?: string | null;
          brand_language?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          post_id?: string;
          scheduled_for?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "blog_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_credentials: {
        Row: {
          access_token_ciphertext: string;
          created_at: string;
          expires_at: string;
          id: string;
          platform: Database["public"]["Enums"]["platform"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token_ciphertext: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          platform: Database["public"]["Enums"]["platform"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token_ciphertext?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          platform?: Database["public"]["Enums"]["platform"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      publish_attempts: {
        Row: {
          attempt_no: number;
          created_at: string;
          detail: string | null;
          entry_id: string;
          http_status: number | null;
          id: string;
          outcome: string;
          retry_after_sec: number | null;
          user_id: string;
        };
        Insert: {
          attempt_no: number;
          created_at?: string;
          detail?: string | null;
          entry_id: string;
          http_status?: number | null;
          id?: string;
          outcome: string;
          retry_after_sec?: number | null;
          user_id: string;
        };
        Update: {
          attempt_no?: number;
          created_at?: string;
          detail?: string | null;
          entry_id?: string;
          http_status?: number | null;
          id?: string;
          outcome?: string;
          retry_after_sec?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publish_attempts_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "social_post_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      social_post_entries: {
        Row: {
          attempts: number;
          campaign_id: string;
          caption: string;
          created_at: string;
          error: string | null;
          id: string;
          idempotency_key: string;
          image_height: number | null;
          image_path: string | null;
          image_width: number | null;
          lease_until: string | null;
          next_attempt_at: string | null;
          platform: Database["public"]["Enums"]["platform"];
          published_at: string | null;
          remote_id: string | null;
          scheduled_for: string | null;
          status: Database["public"]["Enums"]["entry_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          campaign_id: string;
          caption?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          idempotency_key: string;
          image_height?: number | null;
          image_path?: string | null;
          image_width?: number | null;
          lease_until?: string | null;
          next_attempt_at?: string | null;
          platform: Database["public"]["Enums"]["platform"];
          published_at?: string | null;
          remote_id?: string | null;
          scheduled_for?: string | null;
          status?: Database["public"]["Enums"]["entry_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          campaign_id?: string;
          caption?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          idempotency_key?: string;
          image_height?: number | null;
          image_path?: string | null;
          image_width?: number | null;
          lease_until?: string | null;
          next_attempt_at?: string | null;
          platform?: Database["public"]["Enums"]["platform"];
          published_at?: string | null;
          remote_id?: string | null;
          scheduled_for?: string | null;
          status?: Database["public"]["Enums"]["entry_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_post_entries_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          entry_id: string | null;
          http_status: number;
          id: string;
          message: string | null;
          payload_digest: string;
          platform: Database["public"]["Enums"]["platform"] | null;
          received_at: string;
          signature_valid: boolean;
          user_id: string | null;
        };
        Insert: {
          entry_id?: string | null;
          http_status: number;
          id?: string;
          message?: string | null;
          payload_digest: string;
          platform?: Database["public"]["Enums"]["platform"] | null;
          received_at?: string;
          signature_valid: boolean;
          user_id?: string | null;
        };
        Update: {
          entry_id?: string | null;
          http_status?: number;
          id?: string;
          message?: string | null;
          payload_digest?: string;
          platform?: Database["public"]["Enums"]["platform"] | null;
          received_at?: string;
          signature_valid?: boolean;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_events_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "social_post_entries";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_due_entries: {
        Args: { p_lease_seconds?: number; p_limit?: number };
        Returns: {
          attempts: number;
          campaign_id: string;
          caption: string;
          created_at: string;
          error: string | null;
          id: string;
          idempotency_key: string;
          image_height: number | null;
          image_path: string | null;
          image_width: number | null;
          lease_until: string | null;
          next_attempt_at: string | null;
          platform: Database["public"]["Enums"]["platform"];
          published_at: string | null;
          remote_id: string | null;
          scheduled_for: string | null;
          status: Database["public"]["Enums"]["entry_status"];
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "social_post_entries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      campaign_status: "draft" | "scheduled" | "publishing" | "completed" | "failed";
      entry_status: "queued" | "publishing" | "published" | "failed";
      platform: "instagram" | "x" | "linkedin";
      post_source: "paste" | "markdown" | "pdf" | "docx" | "seed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      campaign_status: ["draft", "scheduled", "publishing", "completed", "failed"],
      entry_status: ["queued", "publishing", "published", "failed"],
      platform: ["instagram", "x", "linkedin"],
      post_source: ["paste", "markdown", "pdf", "docx", "seed"],
    },
  },
} as const;
